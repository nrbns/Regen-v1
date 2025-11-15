"""
OpenAI Integration Routes
Provides endpoints for ChatGPT and embeddings using OpenAI API
"""

import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from apps.api.openai_client import get_openai_client

logger = logging.getLogger(__name__)

router = APIRouter()


class EmbeddingRequest(BaseModel):
    text: str
    model: Optional[str] = "text-embedding-3-small"


class BatchEmbeddingRequest(BaseModel):
    texts: list[str]
    model: Optional[str] = "text-embedding-3-small"


class ChatRequest(BaseModel):
    messages: list[dict[str, str]]
    model: Optional[str] = "gpt-4o-mini"
    temperature: float = 0.7
    max_tokens: int = 4096
    stream: bool = True


@router.post("/embedding")
async def generate_embedding(request: EmbeddingRequest):
    """Generate embedding for text"""
    try:
        openai = get_openai_client()
        if not await openai.check_available():
            raise HTTPException(
                status_code=503,
                detail="OpenAI API not available. Please check your API key."
            )
        
        embedding = await openai.generate_embedding(request.text, request.model)
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
        openai = get_openai_client()
        if not await openai.check_available():
            raise HTTPException(
                status_code=503,
                detail="OpenAI API not available. Please check your API key."
            )
        
        embeddings = await openai.batch_embed(request.texts, request.model)
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
            openai = get_openai_client()
            if not await openai.check_available():
                yield f"data: {json.dumps({'type': 'error', 'text': 'OpenAI API not available. Please check your API key.', 'done': True})}\n\n"
                return
            
            async for chunk in openai.stream_chat(
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
    """Check OpenAI API status"""
    try:
        openai = get_openai_client()
        available = await openai.check_available()
        return {
            "available": available,
            "has_api_key": bool(openai.api_key),
        }
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return {
            "available": False,
            "has_api_key": False,
            "error": str(e),
        }

