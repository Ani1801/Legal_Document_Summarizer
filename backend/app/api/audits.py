from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Query
from fastapi.responses import FileResponse
from typing import List, Dict, Any, Optional
import os
import shutil
from dotenv import load_dotenv
load_dotenv()

import tempfile
import uuid
from datetime import datetime
import jwt as pyjwt

# Persistent storage for uploaded PDFs so we can serve them back
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

from app.api.dashboard import get_current_user, get_db
from app.core.config import settings
from app.services.ai.processor import PDFProcessor
from app.services.ai.vector_store import VectorStoreService
from app.services.ai.audit_service import AuditService
from app.services.database import save_audit

router = APIRouter()

processor = PDFProcessor()
vector_store = VectorStoreService()
audit_service = AuditService()

@router.post("/audits/upload")
async def upload_and_audit(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    1. Save file temporarily
    2. Load and split PDF into chunks
    3. Upsert chunks into Pinecone (scoped by user_id and audit_id)
    4. Generate structured report using Gemini (using a representative sample of chunks)
    5. Save audit to MongoDB
    6. Return the audit result
    """
    user_id = str(current_user["_id"])
    audit_id = str(uuid.uuid4())
    
    # Check file extension
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are currently supported for full audit."
        )
        
    # 1. Save file temporarily AND persistently (for PDF preview)
    temp_path = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4()}_{file.filename}")
    persistent_path = os.path.join(UPLOADS_DIR, f"{audit_id}.pdf")
    try:
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)
        # Copy to persistent storage so it can be served later
        shutil.copy2(temp_path, persistent_path)
            
        # 2. Load and split PDF into chunks
        chunks = processor.load_and_split_pdf(temp_path)
        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract text from the PDF."
            )
            
        # 3. Upsert chunks into Pinecone (skipped — index dimension mismatch)
        # vector_store.upsert_chunks(chunks, user_id, audit_id)
        print(f"[Audit] Skipping Pinecone upsert (index not configured). {len(chunks)} chunks extracted.")
        
        # 4. Generate structured report using Gemini
        # For a 100% free stack with Gemini 1.5 Flash, we can send quite a lot of text.
        # Let's take first 20 chunks as a representative context if it's too big.
        context_chunks = chunks[:20] if len(chunks) > 20 else chunks
        
        report = await audit_service.generate_analysis(context_chunks)
        
        # 5. Format and Save Audit to MongoDB
        # Map Gemini JSON to our Audit model fields
        summary = report.get("Summary", "No summary generated.")
        risks_data = report.get("Risks", [])
        
        # Format risks for our model
        formatted_risks = []
        for r in risks_data:
            formatted_risks.append({
                "title": r.get("title", "Unknown Risk"),
                "severity": "High", 
                "description": r.get("description", "No description provided.")
            })
            
        # Calculate a simple mock risk score (100 - 15 per risk, min 0)
        risk_score = max(0, 100 - (len(formatted_risks) * 15))
        
        audit_data = {
            "_id": audit_id,
            "user_id": user_id,
            "file_name": file.filename,
            "status": "Completed",
            "risk_score": risk_score,
            "summary": summary,
            "risks": formatted_risks,
            "created_at": datetime.utcnow()
        }
        
        # Save to MongoDB
        await save_audit(audit_data)
        
        return {
            "id": audit_id,
            "file_name": file.filename,
            "summary": summary,
            "risks": formatted_risks,
            "risk_score": risk_score,
            "suggestions": report.get("Missing Clauses", [])
        }
        
    except Exception as e:
        print(f"Error in upload_and_audit: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audit failed: {str(e)}"
        )
    finally:
        # Only clean up the temp file; persistent copy stays for preview
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.get("/audits/file/{audit_id}")
async def get_audit_file(
    audit_id: str,
    token: Optional[str] = Query(None)
):
    """
    Streams the original PDF file for a given audit_id so the frontend
    <iframe> can display it inline. Accepts token as a query parameter
    since iframes cannot send Authorization headers.
    """
    # Validate token from query parameter
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("sub") is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    file_path = os.path.join(UPLOADS_DIR, f"{audit_id}.pdf")
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF file not found. It may have been removed from the server."
        )
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=f"{audit_id}.pdf",
        headers={"Content-Disposition": "inline"}
    )
