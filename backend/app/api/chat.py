"""
Chat API Route — POST /api/chat

RAG-based document chat endpoint with Redis caching.
Retrieves relevant chunks from Pinecone, checks cache first,
sends uncached queries to Gemini, and returns a grounded answer.
"""

import time
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.dashboard import get_current_user, get_db
from app.models.chat import ChatRequest, ChatResponse, SourceChunk
from app.services.ai.query_service import QueryService
from app.services.ai.chat_service import ChatService
from app.services.cache_service import CacheService

router = APIRouter()

query_service = QueryService()
chat_service = ChatService()
cache_service = CacheService()

# Simple in-memory rate limiter
_rate_limit_store: dict = {}
RATE_LIMIT_COOLDOWN_SECONDS = 4


@router.post("/chat", response_model=ChatResponse)
async def chat_with_document(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Chat with an audited document using RAG + Redis cache.
    """
    user_id = str(current_user["_id"])

    # ── Rate limiting ──
    now = time.time()
    last_request = _rate_limit_store.get(user_id, 0)
    if now - last_request < RATE_LIMIT_COOLDOWN_SECONDS:
        remaining = round(RATE_LIMIT_COOLDOWN_SECONDS - (now - last_request), 1)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {remaining}s before sending another message."
        )
    _rate_limit_store[user_id] = now

    # ── Validate audit ownership ──
    audits_collection = db["audits"]
    audit = await audits_collection.find_one({
        "_id": request.audit_id,
        "user_id": user_id
    })
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit not found or you don't have access to it."
        )

    # ── Check cache first ──
    cached = cache_service.get_cached_answer(user_id, request.audit_id, request.question)
    if cached:
        sources = [SourceChunk(**s) for s in cached.get("sources", [])]
        return ChatResponse(answer=cached["answer"], sources=sources)

    # ── Retrieve relevant chunks from Pinecone ──
    try:
        chunks = query_service.retrieve_relevant_chunks(
            question=request.question,
            user_id=user_id,
            audit_id=request.audit_id,
            top_k=5
        )
    except Exception as e:
        print(f"[Chat] Vector retrieval error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document context. Please try again."
        )

    # ── Generate answer via Gemini ──
    try:
        answer = await chat_service.generate_answer(
            question=request.question,
            chunks=chunks
        )
    except Exception as e:
        print(f"[Chat] Gemini generation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate a response. Please try again."
        )

    # ── Build source citations ──
    sources = []
    source_dicts = []
    for chunk in chunks:
        src = SourceChunk(
            text=chunk["text"][:200] + "..." if len(chunk["text"]) > 200 else chunk["text"],
            page_number=chunk["page_number"],
            file_name=chunk["file_name"],
        )
        sources.append(src)
        source_dicts.append(src.model_dump())

    # ── Cache the result ──
    cache_service.cache_answer(user_id, request.audit_id, request.question, answer, source_dicts)

    return ChatResponse(
        answer=answer,
        sources=sources
    )
