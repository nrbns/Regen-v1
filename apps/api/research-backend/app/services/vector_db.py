"""
Vector DB Service (Qdrant)
"""

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from typing import List, Dict, Any, Optional
import uuid

from app.core.config import settings


class VectorDBService:
    def __init__(self):
        self.client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY,
        )
        self.collection = settings.QDRANT_COLLECTION
        self._ensure_collection()
    
    def _ensure_collection(self):
        """Create collection if it doesn't exist"""
        try:
            self.client.get_collection(self.collection)
        except Exception:
            # Collection doesn't exist, create it
            self.client.create_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(
                    size=1536,  # OpenAI embedding size
                    distance=Distance.COSINE,
                ),
            )
    
    async def upsert_chunks(
        self,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]],
    ):
        """Upsert chunks with embeddings to vector DB"""
        points = []
        for chunk, embedding in zip(chunks, embeddings):
            points.append(
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=embedding,
                    payload={
                        "doc_id": chunk["doc_id"],
                        "chunk_id": chunk["chunk_id"],
                        "text": chunk["text"][:1000],  # Truncate for payload
                        "workspace_id": chunk.get("workspace_id"),
                        "page": chunk.get("page"),
                        "source_url": chunk.get("source_url"),
                    },
                )
            )
        
        self.client.upsert(
            collection_name=self.collection,
            points=points,
        )
    
    async def search(
        self,
        query_embedding: List[float],
        top_k: int,
        workspace_id: Optional[str] = None,
        filter_dict: Optional[Dict] = None,
    ) -> List[Dict[str, Any]]:
        """Search for similar chunks"""
        # Build filter
        filter_conditions = {}
        if workspace_id:
            filter_conditions["workspace_id"] = workspace_id
        if filter_dict:
            filter_conditions.update(filter_dict)
        
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        
        search_filter = None
        if filter_conditions:
            search_filter = Filter(
                must=[
                    FieldCondition(key=key, match=MatchValue(value=value))
                    for key, value in filter_conditions.items()
                ]
            )
        
        results = self.client.search(
            collection_name=self.collection,
            query_vector=query_embedding,
            limit=top_k,
            query_filter=search_filter,
        )
        
        return [
            {
                "chunk_id": hit.payload.get("chunk_id"),
                "doc_id": hit.payload.get("doc_id"),
                "text": hit.payload.get("text"),
                "score": hit.score,
                "page": hit.payload.get("page"),
                "source_url": hit.payload.get("source_url"),
            }
            for hit in results
        ]

