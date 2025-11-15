"""
Hugging Face Integration Routes
Provides endpoints for embeddings and chat using Hugging Face models
"""

import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from apps.api.huggingface_client import get_huggingface_client

logger = logging.getLogger(__name__)

router = APIRouter()


class EmbeddingRequest(BaseModel):
    text: str
    model: Optional[str] = "sentence-transformers/all-MiniLM-L6-v2"


class BatchEmbeddingRequest(BaseModel):
    texts: list[str]
    model: Optional[str] = "sentence-transformers/all-MiniLM-L6-v2"


class ChatRequest(BaseModel):
    messages: list[dict[str, str]]
    model: Optional[str] = "meta-llama/Meta-Llama-3-8B-Instruct"
    temperature: float = 0.7
    max_tokens: int = 4096
    stream: bool = True


@router.post("/embedding")
async def generate_embedding(request: EmbeddingRequest):
    """Generate embedding for text"""
    try:
        hf = get_huggingface_client()
        if not await hf.check_available():
            raise HTTPException(
                status_code=503,
                detail="Hugging Face API not available. Please check your API key."
            )
        
        embedding = await hf.generate_embedding(request.text, request.model)
        return {
            "embedding": embedding,
            "dimensions": len(embedding),
            "model": request.model,
        }
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/embedding/batch")
async def batch_embedding(request: BatchEmbeddingRequest):
    """Generate embeddings for multiple texts"""
    try:
        hf = get_huggingface_client()
        if not await hf.check_available():
            raise HTTPException(
                status_code=503,
                detail="Hugging Face API not available. Please check your API key."
            )
        
        embeddings = await hf.batch_embed(request.texts, request.model)
        return {
            "embeddings": embeddings,
            "count": len(embeddings),
            "dimensions": len(embeddings[0]) if embeddings else 0,
            "model": request.model,
        }
    except Exception as e:
        logger.error(f"Batch embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def chat(request: ChatRequest):
    """Chat completion with streaming support"""
    async def generate():
        try:
            hf = get_huggingface_client()
            if not await hf.check_available():
                yield f"data: {json.dumps({'type': 'error', 'text': 'Hugging Face API not available. Please check your API key.', 'done': True})}\n\n"
                return
            
            async for chunk in hf.stream_chat(
                messages=request.messages,
                model=request.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            ):
                if chunk.get("error"):
                    yield f"data: {json.dumps({'type': 'error', 'text': chunk['error'], 'done': True})}\n\n"
                    break
                
                text = chunk.get("text", "")
                if text:
                    yield f"data: {json.dumps({'type': 'token', 'text': text})}\n\n"
                
                if chunk.get("done"):
                    yield f"data: {json.dumps({'type': 'done', 'done': True})}\n\n"
                    break
        except Exception as e:
            logger.error(f"Chat generation failed: {e}")
            yield f"data: {json.dumps({'type': 'error', 'text': str(e), 'done': True})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/status")
async def status():
    """Check Hugging Face API status"""
    try:
        hf = get_huggingface_client()
        available = await hf.check_available()
        return {
            "available": available,
            "has_api_key": bool(hf.api_key),
        }
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return {
            "available": False,
            "has_api_key": False,
            "error": str(e),
        }

