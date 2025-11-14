"""
Redix /ask Endpoint - Fast AI responses with SSE streaming
"""

import asyncio
import hashlib
import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# For development, allow unauthenticated access
# In production, use proper auth
try:
    from apps.api.security import get_current_user
    from apps.api.models import User
    AUTH_REQUIRED = True
except (ImportError, AttributeError):
    # Fallback for development
    AUTH_REQUIRED = False
    class MockUser:
        id = "dev-user"
    def get_current_user():
        return MockUser()
    User = MockUser

from apps.api.ollama_client import get_ollama_client
from apps.api.cache import cache_get, cache_set

logger = logging.getLogger(__name__)

router = APIRouter()


class AskRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None
    stream: bool = True


# Create auth dependency based on AUTH_REQUIRED
if AUTH_REQUIRED:
    auth_dep = Depends(get_current_user)
else:
    def no_auth():
        return type('User', (), {'id': 'dev-user'})()
    auth_dep = Depends(no_auth)

@router.post("/ask")
async def ask_redix(
    request: AskRequest,
    current_user: User = auth_dep,
):
    """
    Redix /ask endpoint with SSE streaming and Redis caching.
    Falls back to Ollama if Redix unavailable, with offline mode.
    """
    
    # Check cache first
    prompt_hash = hashlib.sha256(request.prompt.encode()).hexdigest()[:16]
    cache_key = f"redix:ask:{prompt_hash}"
    
    if not request.stream:
        # Non-streaming: return cached if available
        cached = await cache_get(cache_key)
        if cached:
            try:
                data = json.loads(cached)
                return {
                    "response": data.get("response", ""),
                    "tokens": data.get("tokens", 0),
                    "cached": True,
                    "ready": True,
                }
            except:
                pass
    
    # Streaming response
    async def generate():
        try:
            # Try Redix first (if available via external service)
            redix_available = False
            try:
                # Check if Redix service is available
                # In production, this would check a Redix service endpoint
                # For now, we'll use Ollama as the primary backend
                redix_available = False
            except Exception as e:
                logger.debug(f"Redix check failed: {e}")
                redix_available = False
            
            # Fallback to Ollama
            ollama = get_ollama_client()
            ollama_available = await ollama.check_available()
            
            if not ollama_available:
                # Offline mode: return cached or simple response
                cached = await cache_get(cache_key)
                if cached:
                    try:
                        data = json.loads(cached)
                        yield f"data: {json.dumps({'type': 'cached', 'text': data.get('response', ''), 'done': True})}\n\n"
                        return
                    except:
                        pass
                
                # No cache, no backend: return offline message
                yield f"data: {json.dumps({'type': 'error', 'text': 'AI services unavailable. Please check your connection or start Ollama.', 'done': True})}\n\n"
                return
            
            # Use Ollama for streaming
            messages = [
                {
                    "role": "system",
                    "content": "You are Redix, an AI assistant for OmniBrowser. Provide helpful, concise answers.",
                },
                {
                    "role": "user",
                    "content": request.prompt,
                },
            ]
            
            accumulated_text = ""
            total_tokens = 0
            
            yield f"data: {json.dumps({'type': 'start', 'message': 'Redix is thinking...'})}\n\n"
            
            async for chunk in ollama.stream_chat(
                messages=messages,
                model="llama3.2",
                temperature=0.7,
                max_tokens=2048,
            ):
                if chunk.get("error"):
                    yield f"data: {json.dumps({'type': 'error', 'text': chunk['error'], 'done': True})}\n\n"
                    break
                
                text = chunk.get("text", "")
                if text:
                    accumulated_text += text
                    chunk_tokens = max(1, len(text) // 4)
                    total_tokens += chunk_tokens
                    
                    yield f"data: {json.dumps({'type': 'token', 'text': text, 'tokens': chunk_tokens})}\n\n"
                
                if chunk.get("done"):
                    break
            
            # Cache the response
            if accumulated_text and len(accumulated_text) > 10:
                cache_data = {
                    "response": accumulated_text,
                    "tokens": total_tokens,
                    "timestamp": asyncio.get_event_loop().time(),
                }
                await cache_set(cache_key, json.dumps(cache_data), ttl_seconds=3600)
            
            yield f"data: {json.dumps({'type': 'done', 'text': '', 'tokens': total_tokens, 'done': True})}\n\n"
            
        except Exception as e:
            logger.error(f"Redix /ask error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'text': f'Error: {str(e)}', 'done': True})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/status")
async def redix_status(current_user: User = auth_dep):
    """Check Redix service status"""
    ollama = get_ollama_client()
    ollama_available = await ollama.check_available()
    
    return {
        "ready": ollama_available,
        "backend": "ollama" if ollama_available else "offline",
        "message": "Redix is ready" if ollama_available else "Redix is offline (Ollama unavailable)",
    }

