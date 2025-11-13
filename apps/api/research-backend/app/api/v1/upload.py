"""
Upload Endpoints
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Optional
import uuid

from app.services.storage import StorageService
from app.core.config import settings

router = APIRouter()


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    workspace_id: Optional[str] = None,
):
    """
    Upload a file and get presigned URL or job ID for ingestion.
    """
    # Validate file size
    if file.size and file.size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size: {settings.MAX_FILE_SIZE_MB}MB"
        )
    
    # Validate file type
    file_ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if file_ext not in settings.SUPPORTED_FILE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported: {settings.SUPPORTED_FILE_TYPES}"
        )
    
    # Generate job ID
    job_id = str(uuid.uuid4())
    
    # Upload to S3
    storage = StorageService()
    try:
        s3_path = await storage.upload_file(
            file=file,
            job_id=job_id,
            workspace_id=workspace_id,
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "job_id": job_id,
                "filename": file.filename,
                "s3_path": s3_path,
                "size": file.size,
                "message": "File uploaded successfully. Call /ingest/start to begin processing.",
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}"
        )

