"""
SummarizationService — hierarchical map/reduce summarisation over canonical chunks.

A long contract cannot be sent to a model in one piece, so summarisation is a
tree:

    chunks → chunk summaries → group summaries → section summaries → executive

The depth adapts to the document. A four-page NDA does not need an intermediate
reduce level, and forcing one only blurs detail and wastes inference; documents
below `SUMMARY_HIERARCHY_THRESHOLD` chunks therefore skip straight to the final
summary. Long documents get the full tree.

Source traceability is carried structurally, not asked of the model: every
section summary keeps the chunk ids and page range it was built from, so any
statement can be traced to its pages. Page numbers are never generated.
"""

from __future__ import annotations

import time
from typing import Callable, Dict, List, Optional

from app.core.config import settings
from app.core.logging import logger
from app.domain.document import CanonicalDocument, Chunk
from app.services.ai.extraction import legal_extractor
from app.domain.summary import (
    SectionSummary,
    SourceReference,
    SummaryItem,
    SummaryResult,
)
from app.services.ai.summarization.base import (
    CHUNK_INSTRUCTION,
    FINAL_INSTRUCTION,
    GROUP_INSTRUCTION,
    SummarizationProvider,
)
from app.services.ai.summarization.registry import get_provider

ProgressHook = Optional[Callable[[int, str], None]]


class SummarizationService:
    """
    Orchestrates summarisation. Depends only on `SummarizationProvider`, so the
    engine behind it is a configuration choice.
    """

    def __init__(self, provider: Optional[SummarizationProvider] = None):
        self._provider = provider

    @property
    def provider(self) -> SummarizationProvider:
        if self._provider is None:
            self._provider = get_provider()
        return self._provider

    # ────────────────────────────────────────────────────────────────────
    def summarize_document(
        self,
        document: CanonicalDocument,
        on_progress: ProgressHook = None,
        clause_types: Optional[Dict[str, str]] = None,
    ) -> SummaryResult:
        """
        Build the complete structured summary for one canonical document.

        Never raises for a model failure: if the provider is unavailable the
        result comes back `degraded=True` with extractive text, because a
        contract that was successfully parsed and indexed should still be usable.
        """
        started = time.time()
        provider = self.provider

        result = SummaryResult(
            document_id=document.document_id,
            provider=provider.name,
            model_name=provider.model_name,
            model_version=provider.model_version,
            pipeline_version=settings.PIPELINE_VERSION,
            prompt_version=settings.PROMPT_VERSION,
        )

        chunks = document.chunks
        if not chunks:
            result.degraded = True
            result.degraded_reason = "No chunks were produced for this document."
            result.processing_time = time.time() - started
            return result

        # ── Structured facts first: deterministic, no model needed ───────
        if on_progress:
            on_progress(55, "Extracting key entities...")
        facts = legal_extractor.extract_all(chunks)
        result.parties = facts["parties"]
        result.key_dates = facts["key_dates"]
        result.financial_terms = facts["financial_terms"]
        result.key_obligations = facts["key_obligations"]
        result.attention_points = facts["attention_points"]
        result.document_type = legal_extractor.detect_document_type(
            document.full_text, document.file_name
        )

        model_ready = provider.is_available()
        if not model_ready:
            logger.warning(
                f"[Summarization] provider '{provider.name}' unavailable — "
                "falling back to extractive summaries."
            )
            result.degraded = True
            result.degraded_reason = (
                f"The {provider.name} summarisation model could not be loaded; "
                "summaries below are extracted directly from the document text."
            )

        # ── Map: one summary per chunk ───────────────────────────────────
        if on_progress:
            on_progress(60, "Summarizing sections...")
        chunk_summaries = self._summarize_chunks(chunks, provider, model_ready)

        # ── Reduce: chunk summaries → section summaries ──────────────────
        if on_progress:
            on_progress(72, "Combining section summaries...")
        result.section_summaries = self._build_section_summaries(
            document, chunk_summaries, provider, model_ready
        )

        # ── Reduce again for long documents, then the executive summary ──
        if on_progress:
            on_progress(80, "Writing executive summary...")
        result.executive_summary = self._build_executive_summary(
            result.section_summaries, provider, model_ready
        )
        result.document_overview = self._build_overview(document, result)

        # ── Important clauses, using clause types when available ─────────
        result.important_clauses = self._build_important_clauses(
            result.section_summaries, chunks, clause_types
        )

        result.source_references = [
            SourceReference(
                chunk_ids=section.chunk_ids,
                page_start=section.page_start,
                page_end=section.page_end,
                section_title=section.section_title,
                section_number=section.section_number,
            )
            for section in result.section_summaries
        ]

        result.processing_time = round(time.time() - started, 2)
        logger.info(
            f"[Summarization] {document.file_name}: "
            f"{len(chunks)} chunk(s) -> {len(result.section_summaries)} section "
            f"summary/ies in {result.processing_time}s "
            f"(provider={provider.name}, degraded={result.degraded})"
        )
        return result

    # ────────────────────────────────────────────────────────────────────
    # Map stage
    # ────────────────────────────────────────────────────────────────────
    def _summarize_chunks(
        self,
        chunks: List[Chunk],
        provider: SummarizationProvider,
        model_ready: bool,
    ) -> Dict[str, str]:
        """Summarise each chunk, keyed by chunk_id."""
        if not model_ready:
            return {chunk.chunk_id: extractive_summary(chunk.text) for chunk in chunks}

        texts = [chunk.text for chunk in chunks]
        summaries = provider.summarize_batch(
            texts,
            max_output_tokens=settings.SUMMARIZATION_MAX_OUTPUT_TOKENS,
            instruction=CHUNK_INSTRUCTION,
        )
        return {
            chunk.chunk_id: (summary.strip() or extractive_summary(chunk.text))
            for chunk, summary in zip(chunks, summaries)
        }

    # ────────────────────────────────────────────────────────────────────
    # Reduce stages
    # ────────────────────────────────────────────────────────────────────
    def _build_section_summaries(
        self,
        document: CanonicalDocument,
        chunk_summaries: Dict[str, str],
        provider: SummarizationProvider,
        model_ready: bool,
    ) -> List[SectionSummary]:
        """
        Group chunk summaries by section and reduce each group.

        A section with one chunk needs no further reduction — its chunk summary
        *is* the section summary, and re-summarising a summary only loses detail.
        """
        by_section: Dict[str, List[Chunk]] = {}
        for chunk in document.chunks:
            by_section.setdefault(chunk.section_id, []).append(chunk)

        # Preserve document order.
        ordered_ids = sorted(
            by_section, key=lambda sid: min(c.order for c in by_section[sid])
        )

        sections: List[SectionSummary] = []
        for section_id in ordered_ids:
            group = sorted(by_section[section_id], key=lambda c: c.order)
            first = group[0]
            parts = [chunk_summaries.get(c.chunk_id, "") for c in group]
            parts = [p for p in parts if p]
            if not parts:
                continue

            if len(parts) == 1:
                text = parts[0]
            elif model_ready:
                combined = "\n\n".join(parts)
                text = provider.summarize(
                    combined,
                    max_output_tokens=settings.SUMMARIZATION_MAX_OUTPUT_TOKENS,
                    instruction=GROUP_INSTRUCTION,
                ) or " ".join(parts)
            else:
                text = " ".join(parts)

            sections.append(SectionSummary(
                section_id=section_id,
                section_number=first.section_number,
                section_title=first.section_title or "Section",
                summary=text.strip(),
                key_points=derive_key_points(text, group),
                page_start=min(c.page_start for c in group),
                page_end=max(c.page_end for c in group),
                chunk_ids=[c.chunk_id for c in group],
            ))

        return sections

    def _build_executive_summary(
        self,
        sections: List[SectionSummary],
        provider: SummarizationProvider,
        model_ready: bool,
    ) -> str:
        """
        Reduce section summaries to one executive summary.

        Long documents get an intermediate grouping pass so the final input stays
        inside the model's window without truncating away the later sections.
        """
        if not sections:
            return ""

        texts = [
            f"{s.section_number} {s.section_title}: {s.summary}".strip()
            for s in sections if s.summary
        ]
        if not texts:
            return ""

        if not model_ready:
            # Lead with the first two sections, which in a contract carry the
            # purpose and the parties.
            return " ".join(texts[:3])[:1200]

        if len(texts) > settings.SUMMARY_HIERARCHY_THRESHOLD:
            group_size = max(2, settings.SUMMARY_GROUP_SIZE)
            grouped: List[str] = []
            for start in range(0, len(texts), group_size):
                block = "\n\n".join(texts[start:start + group_size])
                summary = provider.summarize(
                    block,
                    max_output_tokens=settings.SUMMARIZATION_MAX_OUTPUT_TOKENS,
                    instruction=GROUP_INSTRUCTION,
                )
                grouped.append(summary or block[:600])
            texts = grouped
            logger.info(
                f"[Summarization] intermediate reduce: "
                f"{len(sections)} sections -> {len(texts)} group(s)"
            )

        final = provider.summarize(
            "\n\n".join(texts),
            max_output_tokens=settings.SUMMARIZATION_MAX_OUTPUT_TOKENS * 2,
            instruction=FINAL_INSTRUCTION,
        )
        return final or " ".join(texts[:3])[:1200]

    @staticmethod
    def _build_overview(document: CanonicalDocument, result: SummaryResult) -> str:
        """
        A factual one-liner about the document itself.

        Assembled from counted facts, so there is nothing here a model could get
        wrong.
        """
        parts = [f"{result.document_type or 'Legal document'}"]
        if document.page_count:
            parts.append(f"{document.page_count} page{'s' if document.page_count != 1 else ''}")
        if result.parties:
            names = ", ".join(p.value for p in result.parties[:2] if p.value)
            if names:
                parts.append(f"between {names}")
        if document.sections:
            parts.append(f"{len(document.sections)} sections")
        return " · ".join(parts)

    @staticmethod
    def _build_important_clauses(
        sections: List[SectionSummary],
        chunks: List[Chunk],
        clause_types: Optional[Dict[str, str]] = None,
    ) -> List[SummaryItem]:
        """
        Surface the sections that matter commercially, with their pages.

        `clause_types` maps chunk_id → category when clause detection has run;
        otherwise the section title is used. No risk judgement is made here.
        """
        priority = {
            "Termination", "Liability", "Indemnification",
            "Payment", "Confidentiality", "IP Rights", "Governing Law",
        }
        type_by_section: Dict[str, str] = {}
        if clause_types:
            for chunk in chunks:
                category = clause_types.get(chunk.chunk_id)
                if category and category != "General":
                    type_by_section.setdefault(chunk.section_id, category)

        items: List[SummaryItem] = []
        for section in sections:
            category = type_by_section.get(section.section_id, "")
            if not category:
                from app.services.ai.processor import classify_clause_type

                category = classify_clause_type(section.summary, section.section_title)
            if category in priority:
                items.append(SummaryItem(
                    type=category,
                    label=section.section_label if hasattr(section, "section_label") else category,
                    summary=section.summary,
                    source_pages=list(range(section.page_start, section.page_end + 1)),
                    section_title=section.section_title,
                ))
        return items[:12]


# ─────────────────────────────────────────────────────────────────────────────
# Extractive fallback — used when no model is available
# ─────────────────────────────────────────────────────────────────────────────
def extractive_summary(text: str, max_sentences: int = 3) -> str:
    """
    Pick the most informative sentences without any model.

    Scores sentences by the density of legally significant signals — obligation
    verbs, amounts, dates, conditionals. Crude, but it never invents anything,
    which is the property that matters for a fallback.
    """
    import re

    if not text or not text.strip():
        return ""

    sentences = [s.strip() for s in re.split(r"(?<=[.;])\s+", text) if len(s.strip()) > 30]
    if not sentences:
        return text.strip()[:300]

    signals = (
        "shall", "must", "may not", "shall not", "agrees", "terminate", "notice",
        "liability", "indemnif", "confidential", "pay", "fee", "interest",
        "unless", "provided that", "subject to", "except", "governing law",
    )

    scored = []
    for index, sentence in enumerate(sentences):
        lowered = sentence.lower()
        score = sum(2 for signal in signals if signal in lowered)
        score += len(re.findall(r"[$₹£€]\s?[\d,]+|\b\d+\s*%|\b\d+\s+days?\b", lowered))
        # Slight preference for earlier sentences, which usually state the rule.
        score += max(0, 3 - index)
        scored.append((score, index, sentence))

    scored.sort(key=lambda row: (-row[0], row[1]))
    chosen = sorted(scored[:max_sentences], key=lambda row: row[1])
    return " ".join(sentence for _, _, sentence in chosen)


def derive_key_points(summary_text: str, chunks: List[Chunk]) -> List[str]:
    """
    Two or three concrete bullets for a section.

    Taken from the source chunks rather than the summary, so the figures quoted
    are the contract's own.
    """
    import re

    points: List[str] = []
    seen = set()
    for chunk in chunks:
        for sentence in re.split(r"(?<=[.;])\s+", chunk.text):
            sentence = sentence.strip()
            if not (40 <= len(sentence) <= 200):
                continue
            has_value = re.search(
                r"[$₹£€]\s?[\d,]+|\b\d+\s*%|\b\d+\s+(?:calendar |business )?days?\b"
                r"|\b\d+\s+(?:months?|years?)\b",
                sentence, re.IGNORECASE,
            )
            has_duty = re.search(r"\b(?:shall|must|may not|shall not)\b", sentence, re.IGNORECASE)
            if not (has_value or has_duty):
                continue
            key = sentence[:60].lower()
            if key in seen:
                continue
            seen.add(key)
            points.append(re.sub(r"\s+", " ", sentence))
            if len(points) >= 3:
                return points
    return points


summarization_service = SummarizationService()
