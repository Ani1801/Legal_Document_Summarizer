"""
LocalTransformerSummarizer — the default summarisation engine.

Runs a Hugging Face seq2seq model in-process, so summarisation needs no API key,
has no quota, and costs nothing per document. This is what makes the platform
able to summarise long contracts repeatedly.

Model choice: `allenai/led-base-16384` (Longformer Encoder-Decoder). LED is
built for long documents — its sparse attention accepts up to 16k input tokens,
where BART and T5 stop at 1024 — which suits contracts. The base checkpoint is
~650 MB and ~162M parameters, comfortable on a 16 GB machine with no discrete
GPU. A legal-domain fine-tune (for example `nsi319/legal-led-base-16384`) is a
drop-in replacement via `SUMMARIZATION_MODEL`.

Deployment note: the model is held on the instance, so each worker process that
touches summarisation loads its own copy — roughly 1 GB resident for LED-base in
fp32. With N Uvicorn workers that is N copies. For more than two workers, run
summarisation in a dedicated single-worker service rather than in every web
worker.
"""

from __future__ import annotations

import threading
import time
from typing import List, Optional

from app.core.config import settings
from app.core.logging import logger
from app.services.ai.summarization.base import (
    CHUNK_INSTRUCTION,
    FINAL_INSTRUCTION,
    GROUP_INSTRUCTION,
    SummarizationProvider,
)


def resolve_device(preference: str = "auto") -> str:
    """
    Pick the best available torch device.

    "auto" prefers CUDA, then Apple Silicon's MPS, then CPU. An explicit value is
    honoured as given so a deployment can force CPU.
    """
    preference = (preference or "auto").lower()
    if preference != "auto":
        return preference
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
        if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return "mps"
    except Exception:
        pass
    return "cpu"


class LocalTransformerSummarizer(SummarizationProvider):
    """
    Seq2seq summarisation with a locally held model.

    The model is loaded once, lazily, on first use and then reused for every
    chunk — never loaded and unloaded per chunk, which would dominate runtime.
    Loading is guarded by a lock so two concurrent requests cannot both pay the
    load cost.
    """

    name = "local"

    def __init__(
        self,
        model_name: Optional[str] = None,
        device: Optional[str] = None,
        max_input_tokens: Optional[int] = None,
        max_output_tokens: Optional[int] = None,
    ):
        self._model_name = model_name or settings.SUMMARIZATION_MODEL
        self._device_preference = device or settings.SUMMARIZATION_DEVICE
        self.max_input_tokens = max_input_tokens or settings.SUMMARIZATION_MAX_INPUT_TOKENS
        self.max_output_tokens = max_output_tokens or settings.SUMMARIZATION_MAX_OUTPUT_TOKENS
        self.min_output_tokens = settings.SUMMARIZATION_MIN_OUTPUT_TOKENS

        self._model = None
        self._tokenizer = None
        self._device: Optional[str] = None
        self._load_lock = threading.Lock()
        self._load_failed: Optional[str] = None

    # ── Identity ────────────────────────────────────────────────────────
    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def model_version(self) -> str:
        """Transformers version plus the resolved device — enough to reproduce."""
        try:
            import transformers

            return f"transformers-{transformers.__version__}/{self._device or self._device_preference}"
        except Exception:
            return "unknown"

    # ── Loading ─────────────────────────────────────────────────────────
    def _ensure_loaded(self) -> bool:
        """Load the model once. Returns False when it cannot be loaded."""
        if self._model is not None:
            return True
        if self._load_failed is not None:
            return False

        with self._load_lock:
            # Another thread may have finished while we waited.
            if self._model is not None:
                return True
            if self._load_failed is not None:
                return False

            try:
                import torch
                from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

                self._device = resolve_device(self._device_preference)
                started = time.time()
                logger.info(
                    f"[LocalSummarizer] loading '{self._model_name}' "
                    f"on {self._device} (first use only)..."
                )

                self._tokenizer = AutoTokenizer.from_pretrained(self._model_name)
                model = AutoModelForSeq2SeqLM.from_pretrained(self._model_name)
                model.eval()
                # MPS has incomplete fp16 coverage for LED, so stay in fp32 there.
                model.to(self._device)
                self._model = model
                self._torch = torch

                logger.info(
                    f"[LocalSummarizer] ready in {time.time() - started:.1f}s "
                    f"({sum(p.numel() for p in model.parameters()) / 1e6:.0f}M params)"
                )
                return True
            except Exception as e:
                self._load_failed = str(e)
                logger.error(
                    f"[LocalSummarizer] could not load '{self._model_name}': {e}"
                )
                return False

    def is_available(self) -> bool:
        """
        Whether the model can be loaded. This actually attempts the load, so the
        caller learns the truth rather than an optimistic guess.
        """
        return self._ensure_loaded()

    def warm_up(self) -> bool:
        """Pre-load the model, e.g. at application startup."""
        return self._ensure_loaded()

    # ── Summarisation ───────────────────────────────────────────────────
    def summarize(
        self,
        text: str,
        max_output_tokens: Optional[int] = None,
        instruction: Optional[str] = None,
    ) -> str:
        results = self.summarize_batch([text], max_output_tokens, instruction)
        return results[0] if results else ""

    def summarize_batch(
        self,
        texts: List[str],
        max_output_tokens: Optional[int] = None,
        instruction: Optional[str] = None,
    ) -> List[str]:
        """
        Summarise several texts, batching to keep the accelerator busy.

        A failure returns empty strings rather than raising: the pipeline above
        degrades to extractive output instead of losing the whole document.
        """
        usable = [(i, t) for i, t in enumerate(texts) if t and t.strip()]
        results = [""] * len(texts)
        if not usable:
            return results

        if not self._ensure_loaded():
            return results

        limit = max_output_tokens or self.max_output_tokens
        batch_size = max(1, settings.SUMMARIZATION_BATCH_SIZE)

        for start in range(0, len(usable), batch_size):
            batch = usable[start:start + batch_size]
            try:
                summaries = self._generate([t for _, t in batch], limit, instruction)
                for (index, _), summary in zip(batch, summaries):
                    results[index] = summary
            except Exception as e:
                logger.warning(f"[LocalSummarizer] batch failed: {e}")

        return results

    def _generate(
        self,
        texts: List[str],
        max_output_tokens: int,
        instruction: Optional[str],
    ) -> List[str]:
        """Tokenise, run the model, decode."""
        torch = self._torch
        # A fine-tuned summariser expects the raw document text. Prepending an
        # instruction makes it copy that instruction into the summary, so this is
        # off unless SUMMARIZATION_USE_INSTRUCTION is set for an
        # instruction-following checkpoint.
        if settings.SUMMARIZATION_USE_INSTRUCTION:
            prompt = instruction or CHUNK_INSTRUCTION
            prepared = [f"{prompt}\n\n{text}" for text in texts]
        else:
            prepared = list(texts)

        encoded = self._tokenizer(
            prepared,
            max_length=self.max_input_tokens,
            truncation=True,
            padding=True,
            return_tensors="pt",
        ).to(self._device)

        generate_kwargs = dict(
            max_new_tokens=max_output_tokens,
            min_new_tokens=min(self.min_output_tokens, max_output_tokens - 1),
            num_beams=4,
            length_penalty=1.0,
            # Legal text repeats phrases legitimately, so only block long repeats.
            no_repeat_ngram_size=4,
            early_stopping=True,
        )

        # LED needs to be told which tokens get global attention; the first token
        # is the convention for summarisation.
        if "led" in self._model_name.lower():
            global_attention_mask = torch.zeros_like(encoded["input_ids"])
            global_attention_mask[:, 0] = 1
            generate_kwargs["global_attention_mask"] = global_attention_mask

        with torch.no_grad():
            output = self._model.generate(**encoded, **generate_kwargs)

        decoded = [
            self._tokenizer.decode(sequence, skip_special_tokens=True).strip()
            for sequence in output
        ]
        return [
            self._strip_echoed_input(summary, source)
            for summary, source in zip(decoded, texts)
        ]

    @staticmethod
    def _strip_echoed_input(summary: str, source: str) -> str:
        """
        Drop a leading verbatim copy of the input.

        Some checkpoints (notably base, non-fine-tuned ones) begin by repeating
        the prompt or the source text. Returning that as a "summary" would be
        worse than returning nothing, because the caller cannot tell it apart
        from a real result.
        """
        cleaned = (summary or "").strip()
        if not cleaned:
            return ""
        for instruction in (CHUNK_INSTRUCTION, GROUP_INSTRUCTION, FINAL_INSTRUCTION):
            if cleaned.startswith(instruction[:60]):
                cleaned = cleaned[len(instruction):].strip()
        # A "summary" at least as long as its input has summarised nothing.
        if len(cleaned) >= len(source.strip()):
            return ""
        return cleaned
