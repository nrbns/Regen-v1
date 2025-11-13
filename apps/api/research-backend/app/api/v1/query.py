"""
Query Endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import uuid

from app.services.retrieval import RetrievalService
from app.core.config import settings

router = APIRouter()


class QueryRequest(BaseModel):
    query: str
    workspace_id: str
    top_k: Optional[int] = None
    mode: Optional[str] = "quick"  # quick, deep


class QueryResponse(BaseModel):
    query_id: str
    stream_url: str
    status: str


@router.post("/query", response_model=QueryResponse)
async def submit_query(request: QueryRequest):
    """
    Submit a research query. Returns query_id and SSE stream URL.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    top_k = min(request.top_k or settings.DEFAULT_TOP_K, settings.MAX_TOP_K)
    query_id = str(uuid.uuid4())
    
    # Start query processing (async)
    retrieval_service = RetrievalService()
    retrieval_service.process_query_async(
        query_id=query_id,
        query=request.query,
        workspace_id=request.workspace_id,
        top_k=top_k,
        mode=request.mode,
    )
    
    return QueryResponse(
        query_id=query_id,
        stream_url=f"/api/v1/stream?query_id={query_id}",
        status="processing",
    )


@router.post("/query/cancel")
async def cancel_query(query_id: str):
    """
    Cancel a running query.
    """
    # TODO: Implement cancellation logic
    return {
        "query_id": query_id,
        "status": "cancelled",
    }

