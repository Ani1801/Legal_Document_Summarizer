"""
DocumentPipeline — the one orchestrator for processing an uploaded contract.

    validate → store → extract → clean → structure → chunk
                                            │
                        ┌───────────────────┼───────────────────┐
                        ▼                   ▼                   ▼
                  SUMMARIZATION        RAG INDEX        CLAUSE / RISK ANALYSIS
                        │                   │                   │
                        └────────── MongoDB persistence ────────┘

The canonical chunks are produced exactly once and handed to all three
consumers. Nothing here re-reads the PDF or re-chunks the text.

This runs in the background, not inside the upload request: summarising a long
contract takes far longer than an HTTP request should. The upload returns as soon
as the file is stored, and the pipeline reports progress through the document
record, which the frontend polls.
"""

from __future__ import annotations

import os
import tempfile
import time
from datetime import datetime
from typing import Dict, Optional

from app.core.config import settings
from app.core.logging import logger
from app.domain.document import STAGE_PROGRESS, CanonicalDocument, ProcessingStatus
from app.domain.summary import SummaryResult
from app.services.ai.extraction import legal_extractor
from app.services.ai.processor import DocumentProcessor, classify_clause_type
from app.services.ai.summarization.service import SummarizationService
from app.services.ai.vector_store import vector_store_service
from app.services.storage_service import storage_service


class DocumentPipeline:
    """
    Runs the full analysis for one document and keeps its status current.

    Every stage updates the stored record before it starts, so a client polling
    the status endpoint sees real progress and a crash leaves a `failed` record
    rather than one stuck on "processing" forever.
    """

    def __init__(
        self,
        processor: Optional[DocumentProcessor] = None,
        summarizer: Optional[SummarizationService] = None,
    ):
        self.processor = processor or DocumentProcessor()
        self._summarizer = summarizer

    @property
    def summarizer(self) -> SummarizationService:
        if self._summarizer is None:
            from app.services.ai.summarization.service import summarization_service

            self._summarizer = summarization_service
        return self._summarizer

    # ────────────────────────────────────────────────────────────────────
    async def run(self, db, audit_id: str, user_id: str) -> None:
        """
        Process a document that has already been validated and stored.

        Reads the record created by the upload route, runs every stage, and
        writes the results back. Exceptions are caught and recorded as a failed
        status — a background task that raises would otherwise vanish silently.
        """
        started = time.time()
        record = await db["audits"].find_one({"_id": audit_id, "user_id": user_id})
        if not record:
            logger.error(f"[Pipeline] {audit_id}: no record to process.")
            return

        storage_key = record.get("storage_key") or f"{audit_id}.pdf"
        file_name = record.get("file_name", "document.pdf")

        try:
            if not storage_service.exists(storage_key):
                await self._fail(db, audit_id, "The stored PDF could not be found.")
                return

            # ── Extract / clean / structure / chunk ──────────────────────
            await self._set_status(db, audit_id, ProcessingStatus.EXTRACTING)
            source_path = storage_service.get_absolute_path(storage_key)
            document = self.processor.process(
                file_path=source_path,
                document_id=audit_id,
                user_id=user_id,
                file_name=file_name,
                content_hash=record.get("content_hash", ""),
                file_size=record.get("file_size", 0),
            )

            # A scanned PDF is reported precisely, never as an empty success.
            if document.status == ProcessingStatus.OCR_REQUIRED:
                await self._set_status(
                    db, audit_id, ProcessingStatus.OCR_REQUIRED,
                    extra={
                        "page_count": document.page_count,
                        "error": (
                            "No readable text layer was found in this PDF. It appears "
                            "to be a scanned image; OCR is not yet supported."
                        ),
                    },
                )
                return

            if not document.chunks:
                await self._fail(db, audit_id, "The document contained too little text to analyse.")
                return

            await self._set_status(
                db, audit_id, ProcessingStatus.CHUNKING,
                extra={
                    "page_count": document.page_count,
                    "section_count": len(document.sections),
                    "chunk_count": len(document.chunks),
                    "token_count": document.total_tokens,
                    "structure_detected": document.structure_detected,
                },
            )

            # ── Clause typing: cheap, deterministic, shared downstream ───
            clause_types: Dict[str, str] = {
                chunk.chunk_id: classify_clause_type(chunk.text, chunk.section_title)
                for chunk in document.chunks
            }
            for chunk in document.chunks:
                chunk.clause_type = clause_types[chunk.chunk_id]

            # ── RAG index, from the same canonical chunks ────────────────
            await self._set_status(db, audit_id, ProcessingStatus.INDEXING)
            index_result = vector_store_service.index_document(document)

            # ── Summarisation (local model by default) ───────────────────
            await self._set_status(db, audit_id, ProcessingStatus.SUMMARIZING)
            summary = await self._summarize(db, audit_id, document, clause_types)

            # ── Optional LLM clause/risk analysis ────────────────────────
            await self._set_status(db, audit_id, ProcessingStatus.ANALYZING)
            analysis = await self._analyze(document)

            # ── Persist everything on the one canonical record ───────────
            await self._set_status(db, audit_id, ProcessingStatus.FINALIZING)
            await self._persist(
                db, audit_id, document, summary, analysis, index_result,
                elapsed=time.time() - started,
            )

            logger.info(
                f"[Pipeline] {audit_id} completed in {time.time() - started:.1f}s "
                f"({document.page_count}p / {len(document.chunks)} chunks / "
                f"provider={summary.provider}, degraded={summary.degraded})"
            )

        except Exception as e:
            logger.error(f"[Pipeline] {audit_id} failed: {e}", exc_info=True)
            await self._fail(db, audit_id, f"Processing failed: {e}")

    # ────────────────────────────────────────────────────────────────────
    async def _summarize(
        self, db, audit_id: str, document: CanonicalDocument,
        clause_types: Dict[str, str],
    ) -> SummaryResult:
        """
        Run hierarchical summarisation off the event loop.

        The local model is synchronous and CPU/GPU bound, so it goes to a worker
        thread; running it inline would block every other request in the process.
        """
        import asyncio

        progress_updates: list = []

        def on_progress(percent: int, label: str) -> None:
            progress_updates.append((percent, label))

        summary = await asyncio.to_thread(
            self.summarizer.summarize_document, document, on_progress, clause_types
        )

        # Surface the last stage label the summariser reported.
        if progress_updates:
            percent, label = progress_updates[-1]
            await db["audits"].update_one(
                {"_id": audit_id},
                {"$set": {"progress": percent, "progress_label": label}},
            )
        return summary

    async def _analyze(self, document: CanonicalDocument) -> dict:
        """
        Optional LLM clause/risk analysis.

        Entirely best-effort: the summary and the RAG index do not depend on it,
        so a missing or rate-limited API key degrades this stage alone.
        """
        try:
            from langchain_core.documents import Document as LCDocument

            from app.services.ai.audit_service import AuditService

            service = AuditService()
            if not service.api_key:
                logger.info("[Pipeline] no GOOGLE_API_KEY — skipping LLM risk analysis.")
                return {}

            legacy_chunks = [
                LCDocument(
                    page_content=chunk.text,
                    metadata={
                        "page_number": chunk.page_start,
                        "section_label": chunk.section_label,
                        "section_title": chunk.section_title,
                    },
                )
                for chunk in document.chunks
            ]
            return await service.generate_analysis(legacy_chunks)
        except Exception as e:
            logger.warning(f"[Pipeline] LLM analysis unavailable: {e}")
            return {}

    # ────────────────────────────────────────────────────────────────────
    async def _persist(
        self, db, audit_id: str, document: CanonicalDocument,
        summary: SummaryResult, analysis: dict, index_result: dict, elapsed: float,
    ) -> None:
        """
        Write results onto the single `audits` record.

        One canonical place for a document's analysis: the summary, the clause
        findings, the entities and the chunk metadata all live on the same
        document rather than in parallel collections holding overlapping copies.
        """
        jurisdiction = legal_extractor.extract_jurisdiction(document.chunks)

        update = {
            "status": ProcessingStatus.COMPLETED.value,
            "progress": 100,
            "progress_label": "Completed",
            "updated_at": datetime.utcnow(),
            "processing_time": round(elapsed, 2),
            "error": None,

            # Canonical document facts
            "page_count": document.page_count,
            "section_count": len(document.sections),
            "chunk_count": len(document.chunks),
            "token_count": document.total_tokens,
            "structure_detected": document.structure_detected,
            "vector_backend": index_result.get("backend", "local"),

            # Structured summary
            "summary_result": summary.model_dump(mode="json"),
            "document_type": summary.document_type,
            "executive_summary": summary.executive_summary,
            "summary": summary.executive_summary,  # alias for dashboard/library
            "document_overview": summary.document_overview,
            "section_summaries": [s.model_dump(mode="json") for s in summary.section_summaries],
            "key_takeaways": [item.summary for item in summary.important_clauses[:6]],

            # Entities, in the shape the existing frontend grid expects
            "entities": {
                "parties": [
                    {
                        "name": p.value or p.summary,
                        "role": p.label,
                        "address": "",
                        "signatory": "",
                    }
                    for p in summary.parties
                ],
                "dates": [
                    {
                        "label": d.label, "value": d.value,
                        "page_number": d.source_pages[0] if d.source_pages else 1,
                        "section": d.section_title, "note": d.summary,
                    }
                    for d in summary.key_dates
                ],
                "financials": [
                    {
                        "label": f.label, "amount": f.value,
                        "page_number": f.source_pages[0] if f.source_pages else 1,
                        "section": f.section_title, "detail": f.summary,
                    }
                    for f in summary.financial_terms
                ],
                "jurisdiction": jurisdiction,
            },

            # Chunk index, so chat and comparison can cite without re-parsing
            "chunks": [
                {
                    "chunk_id": c.chunk_id, "order": c.order,
                    "page_start": c.page_start, "page_end": c.page_end,
                    "section_id": c.section_id, "section_number": c.section_number,
                    "section_title": c.section_title, "clause_type": c.clause_type,
                    "token_count": c.token_count,
                }
                for c in document.chunks
            ],

            # Provenance
            "model_name": summary.model_name,
            "model_version": summary.model_version,
            "summary_provider": summary.provider,
            "pipeline_version": settings.PIPELINE_VERSION,
            "prompt_version": settings.PROMPT_VERSION,
            "degraded": summary.degraded,
            "degraded_reason": summary.degraded_reason,
        }

        # The LLM risk analysis is additive — absent keys leave the summary intact.
        if analysis:
            update["risks"] = analysis.get("risks", [])
            update["clauses"] = analysis.get("clauses", [])
            update["missing_clauses"] = analysis.get("missing_clauses", [])
            update["suggestions"] = analysis.get("suggestions", [])
            update["risk_score"] = analysis.get("risk_score", 0)
            update["risk_counts"] = analysis.get("risk_counts", {})
            if analysis.get("contract_type"):
                update["document_type"] = analysis["contract_type"]
        else:
            # Clause cards still render, built from the deterministic pass.
            update["clauses"] = [
                {
                    "id": f"c{index + 1}",
                    "category": item.type,
                    "title": item.section_title or item.type,
                    "page_number": item.source_pages[0] if item.source_pages else 1,
                    "section": item.label,
                    "risk_level": "Low",
                    "snippet": item.summary[:400],
                    "explanation": "",
                    "recommendation": "",
                }
                for index, item in enumerate(summary.important_clauses)
            ]
            update["risks"] = []
            update["suggestions"] = [item.summary for item in summary.attention_points]
            update["missing_clauses"] = []
            update["risk_score"] = 0
            update["risk_counts"] = {}

        await db["audits"].update_one({"_id": audit_id}, {"$set": update})

    # ────────────────────────────────────────────────────────────────────
    @staticmethod
    async def _set_status(
        db, audit_id: str, status: ProcessingStatus, extra: Optional[dict] = None,
    ) -> None:
        percent, label = STAGE_PROGRESS.get(status, (0, status.value))
        update = {
            "status": status.value,
            "progress": percent,
            "progress_label": label,
            "updated_at": datetime.utcnow(),
        }
        if extra:
            update.update(extra)
        await db["audits"].update_one({"_id": audit_id}, {"$set": update})

    @classmethod
    async def _fail(cls, db, audit_id: str, message: str) -> None:
        await cls._set_status(
            db, audit_id, ProcessingStatus.FAILED, extra={"error": message},
        )


document_pipeline = DocumentPipeline()
