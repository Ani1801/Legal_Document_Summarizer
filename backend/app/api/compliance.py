"""
Compliance API Route — POST /api/compliance/check

Runs a proactive compliance check against global regulations (GDPR, CCPA, AI Act).
Returns violations, action items, and an overall compliance score.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from app.api.dashboard import get_current_user, get_db
from app.models.compliance import ComplianceCheckRequest, ComplianceCheckResponse, Violation
from app.services.ai.query_service import QueryService
from app.services.ai.compliance_service import ComplianceService

router = APIRouter()

query_service = QueryService()
compliance_service = ComplianceService()


@router.post("/compliance/check", response_model=ComplianceCheckResponse)
async def check_compliance(
    request: ComplianceCheckRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Run compliance check on an audited document.

    1. Validates audit ownership
    2. Retrieves representative chunks from Pinecone
    3. Sends to Gemini with regulation-specific prompts
    4. Returns violations, action items, and compliance score
    """
    user_id = str(current_user["_id"])
    audits_collection = db["audits"]

    # Validate audit
    audit = await audits_collection.find_one({"_id": request.audit_id, "user_id": user_id})
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit not found or you don't have access to it."
        )

    # Retrieve chunks
    try:
        broad_query = "data privacy consent personal information processing retention deletion rights obligations"
        chunks = query_service.retrieve_relevant_chunks(
            question=broad_query,
            user_id=user_id,
            audit_id=request.audit_id,
            top_k=15
        )
    except Exception as e:
        print(f"[Compliance] Vector retrieval error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document context for compliance check."
        )

    # Run compliance check
    try:
        result = await compliance_service.check_compliance(
            chunks=chunks,
            regulations=request.regulations
        )
    except Exception as e:
        print(f"[Compliance] Gemini error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate compliance analysis. Please try again."
        )

    # Build response
    violations = [Violation(**v) for v in result.get("violations", [])]

    return ComplianceCheckResponse(
        compliance_score=result.get("compliance_score", 0),
        total_violations=len(violations),
        violations=violations,
        action_items=result.get("action_items", []),
        summary=result.get("summary", "No summary available."),
        audit_id=request.audit_id,
        file_name=audit.get("file_name", "Unknown")
    )
