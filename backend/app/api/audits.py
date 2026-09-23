"""
Audits API — Document upload, AI audit generation, and PDF file serving.

Refactored to use StorageService for all file I/O — no raw os.path calls.
"""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Query
from fastapi.responses import FileResponse
import tempfile
import uuid
import os
import jwt
from datetime import datetime

from app.api.deps import get_current_user, get_db
from app.services.ai.processor import PDFProcessor
from app.services.ai.vector_store import VectorStoreService
from app.services.ai.audit_service import AuditService
from app.services.database import save_audit
from app.services.storage_service import storage_service
from app.core.config import settings
from app.core.logging import logger

router = APIRouter()

processor = PDFProcessor()
vector_store = VectorStoreService()
audit_service = AuditService()


@router.post("/audits/upload")
async def upload_and_audit(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    1. Validate file type (PDF only)
    2. Save via StorageService (persistent) + temp copy for processing
    3. Load and split PDF into chunks
    4. Upsert chunks into Pinecone (namespaced by user_id + audit_id)
    5. Generate structured AI report via Gemini
    6. Save audit record to MongoDB
    7. Return audit result
    """
    user_id = str(current_user["_id"])
    audit_id = str(uuid.uuid4())

    # Validate file extension
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are currently supported."
        )

    # Read file bytes once
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    # Persist via StorageService
    storage_key = storage_service.save(content, audit_id, extension="pdf")

    # Write a temp copy for PyMuPDF processing
    temp_path = os.path.join(tempfile.gettempdir(), f"{audit_id}.pdf")
    try:
        with open(temp_path, "wb") as f:
            f.write(content)

        # Extract and split PDF into chunks
        chunks = processor.load_and_split_pdf(temp_path)
        if not chunks:
            storage_service.delete(storage_key)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract text from the PDF."
            )

        # Embed chunks into Pinecone (user-isolated by namespace)
        vector_store.upsert_chunks(chunks, user_id, audit_id)

        # Generate AI report (use first 20 chunks to stay within context limits)
        context_chunks = chunks[:20] if len(chunks) > 20 else chunks
        report = await audit_service.generate_analysis(context_chunks)

        # Format risks
        VALID_SEVERITIES = {"High", "Medium", "Low"}
        formatted_risks = []
        for r in report.get("Risks", []):
            severity = r.get("severity", "Medium").strip().capitalize()
            if severity not in VALID_SEVERITIES:
                severity = "Medium"
            formatted_risks.append({
                "title": r.get("title", "Unknown Risk"),
                "severity": severity,
                "description": r.get("description", "No description provided.")
            })

        # Calculate weighted risk score (High=−20, Medium=−10, Low=−5)
        score_deduction = sum(
            20 if r["severity"] == "High" else 10 if r["severity"] == "Medium" else 5
            for r in formatted_risks
        )
        risk_score = max(0, 100 - score_deduction)

        summary = report.get("Summary", "No summary generated.")

        audit_data = {
            "_id": audit_id,
            "user_id": user_id,
            "file_name": file.filename,
            "storage_key": storage_key,
            "status": "Completed",
            "risk_score": risk_score,
            "summary": summary,
            "risks": formatted_risks,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        await save_audit(audit_data)
        logger.info(f"[Audits] Audit {audit_id} completed for user {user_id}")

        return {
            "id": audit_id,
            "file_name": file.filename,
            "summary": summary,
            "risks": formatted_risks,
            "risk_score": risk_score,
            "suggestions": report.get("Missing Clauses", [])
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Audits] upload_and_audit error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audit failed: {str(e)}"
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.get("/audits/file/{audit_id}")
async def get_audit_file(
    audit_id: str,
    token: str = Query(None),
    db=Depends(get_db)
):
    """
    Stream the original PDF for a given audit_id.
    Accepts a JWT via query param (for iframe use).
    """
    if not token:
        raise HTTPException(status_code=401, detail="Token required for document access")

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise ValueError("Missing subject in token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")

    storage_key = f"{audit_id}.pdf"
    if not storage_service.exists(storage_key):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF file not found. It may have been removed from the server."
        )

    return FileResponse(
        path=storage_service.get_absolute_path(storage_key),
        media_type="application/pdf",
        filename=f"{audit_id}.pdf",
        headers={"Content-Disposition": "inline"}
    )
