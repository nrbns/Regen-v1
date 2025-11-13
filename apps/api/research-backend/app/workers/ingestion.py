"""
Ingestion Worker Tasks
"""

from app.workers.celery_app import celery_app
from app.services.storage import StorageService
from app.utils.parsers import parse_document
from app.utils.chunking import chunk_text
from app.services.embedding import EmbeddingService
from app.services.vector_db import VectorDBService
from typing import Dict, Any
import asyncio

storage = StorageService()
embedding_service = EmbeddingService()
vector_db = VectorDBService()


@celery_app.task(bind=True, name="ingestion.start_ingestion")
def start_ingestion_task(
    self,
    ingest_id: str,
    job_id: str,
    source_type: str,
    workspace_id: str,
    metadata: Dict[str, Any],
):
    """Process ingestion: parse, chunk, embed, index"""
    try:
        # Update status
        self.update_state(state="PROCESSING", meta={"stage": "downloading"})
        
        # Download file from S3
        s3_path = metadata.get("s3_path") or f"{workspace_id}/{job_id}"
        file_content = asyncio.run(storage.download_file(s3_path))
        
        # Parse document
        self.update_state(state="PROCESSING", meta={"stage": "parsing"})
        parsed_content = parse_document(file_content, source_type)
        
        # Chunk text
        self.update_state(state="PROCESSING", meta={"stage": "chunking"})
        chunks = chunk_text(parsed_content["text"])
        
        # Get embeddings
        self.update_state(state="PROCESSING", meta={"stage": "embedding"})
        chunk_texts = [chunk["text"] for chunk in chunks]
        embeddings = asyncio.run(embedding_service.get_embeddings(chunk_texts))
        
        # Prepare chunks for vector DB
        vector_chunks = [
            {
                "doc_id": ingest_id,
                "chunk_id": chunk["id"],
                "text": chunk["text"],
                "workspace_id": workspace_id,
                "page": chunk.get("page"),
                "source_url": metadata.get("url"),
            }
            for chunk in chunks
        ]
        
        # Upsert to vector DB
        self.update_state(state="PROCESSING", meta={"stage": "indexing"})
        asyncio.run(vector_db.upsert_chunks(vector_chunks, embeddings))
        
        return {
            "ingest_id": ingest_id,
            "status": "completed",
            "chunk_count": len(chunks),
        }
        
    except Exception as e:
        self.update_state(
            state="FAILURE",
            meta={"error": str(e)},
        )
        raise

