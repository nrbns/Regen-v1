"""
RAG Retrieval & Query Orchestration Service
"""

import asyncio
from typing import List, Dict, Any, Optional
from app.services.vector_db import VectorDBService
from app.services.embedding import EmbeddingService
from app.services.llm import LLMService
from app.api.v1.stream import get_stream_queue
import json

vector_db = VectorDBService()
embedding_service = EmbeddingService()
llm_service = LLMService()


class RetrievalService:
    def process_query_async(
        self,
        query_id: str,
        query: str,
        workspace_id: str,
        top_k: int,
        mode: str = "quick",
    ):
        """Process query asynchronously and stream results (runs in background)"""
        import asyncio
        asyncio.create_task(self._process_query(query_id, query, workspace_id, top_k, mode))
    
    async def _process_query(
        self,
        query_id: str,
        query: str,
        workspace_id: str,
        top_k: int,
        mode: str = "quick",
    ):
        """Internal async method to process query"""
        queue = get_stream_queue(query_id)
        
        try:
            # Send retrieval progress
            await queue.put({
                "event": "retrieval_progress",
                "data": json.dumps({
                    "query_id": query_id,
                    "stage": "retrieval",
                    "top_k": top_k,
                }),
            })
            
            # Get query embedding
            query_embeddings = await embedding_service.get_embeddings([query])
            query_embedding = query_embeddings[0]
            
            # Retrieve chunks
            chunks = await vector_db.search(
                query_embedding=query_embedding,
                top_k=top_k,
                workspace_id=workspace_id,
            )
            
            # Send sources ready
            await queue.put({
                "event": "source_ready",
                "data": json.dumps({
                    "query_id": query_id,
                    "sources": chunks,
                }),
            })
            
            # Generate answer with streaming
            await queue.put({
                "event": "generation_start",
                "data": json.dumps({
                    "query_id": query_id,
                    "stage": "generation",
                }),
            })
            
            # Stream LLM tokens
            async for token in llm_service.stream_answer(
                query=query,
                chunks=chunks,
                mode=mode,
            ):
                await queue.put({
                    "event": "generation_chunk",
                    "data": json.dumps({
                        "query_id": query_id,
                        "token": token,
                    }),
                })
            
            # Send completion
            await queue.put({
                "event": "complete",
                "data": json.dumps({
                    "query_id": query_id,
                    "status": "completed",
                }),
            })
            
            # End stream
            await queue.put(None)
            
        except Exception as e:
            await queue.put({
                "event": "error",
                "data": json.dumps({
                    "query_id": query_id,
                    "error": str(e),
                }),
            })
            await queue.put(None)

