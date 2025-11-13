"""
Ingestion Endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import uuid

from app.workers.ingestion import start_ingestion_task
from app.models.document import SourceType

router = APIRouter()


class IngestRequest(BaseModel):
    job_id: str
    source_type: SourceType
    workspace_id: str
    metadata: Optional[dict] = None


@router.post("/ingest/start")
async def start_ingestion(request: IngestRequest):
    """
    Start ingestion job for uploaded file.
    """
    ingest_id = str(uuid.uuid4())
    
    try:
        # Queue ingestion task
        task = start_ingestion_task.delay(
            ingest_id=ingest_id,
            job_id=request.job_id,
            source_type=request.source_type.value,
            workspace_id=request.workspace_id,
            metadata=request.metadata or {},
        )
        
        return {
            "ingest_id": ingest_id,
            "task_id": task.id,
            "status": "queued",
            "message": "Ingestion started",
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start ingestion: {str(e)}"
        )


@router.get("/ingest/status/{ingest_id}")
async def get_ingestion_status(ingest_id: str):
    """
    Get status of ingestion job.
    """
    # TODO: Query Celery task status or database
    # For now, return placeholder
    return {
        "ingest_id": ingest_id,
        "status": "processing",  # pending, processing, completed, failed
        "progress": 0.5,
        "chunks_processed": 10,
        "total_chunks": 20,
    }

