"""
Prompt agent endpoint - "Ask about this page" feature
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging
from apps.api.openai_client import get_openai_client
from apps.api.huggingface_client import get_huggingface_client
from apps.api.ollama_client import get_ollama_client

logger = logging.getLogger(__name__)

router = APIRouter()


class PromptRequest(BaseModel):
    prompt: str
    url: Optional[str] = None
    context: Optional[str] = None


class PromptResponse(BaseModel):
    answer: str
    model: str


@router.post("/prompt", response_model=PromptResponse)
async def prompt_agent(request: PromptRequest):
    """
    Process a prompt with optional page context.
    Used for "Ask about this page" feature.
    """
    try:
        # Build context-aware prompt
        system_prompt = "You are Redix, an AI assistant for Regen. Provide helpful, concise answers."
        
        user_prompt = request.prompt
        if request.context:
            user_prompt = f"Context from page:\n{request.context}\n\nUser question: {request.prompt}"
        if request.url:
            user_prompt = f"Page URL: {request.url}\n\n{user_prompt}"
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        
        # Try AI backends in priority order
        openai = get_openai_client()
        openai_available = await openai.check_available()
        
        if openai_available:
            # Use OpenAI
            response_text = ""
            async for chunk in openai.stream_chat(
                messages=messages,
                model="gpt-4o-mini",
                temperature=0.7,
                max_tokens=1024,
            ):
                if chunk.get("text"):
                    response_text += chunk["text"]
                if chunk.get("done"):
                    break
            return PromptResponse(answer=response_text or "No response generated.", model="gpt-4o-mini")
        
        # Try Hugging Face
        hf = get_huggingface_client()
        hf_available = await hf.check_available()
        
        if hf_available:
            response_text = ""
            async for chunk in hf.stream_chat(
                messages=messages,
                model="meta-llama/Meta-Llama-3-8B-Instruct",
                temperature=0.7,
                max_tokens=1024,
            ):
                if chunk.get("text"):
                    response_text += chunk["text"]
                if chunk.get("done"):
                    break
            return PromptResponse(answer=response_text or "No response generated.", model="meta-llama/Meta-Llama-3-8B-Instruct")
        
        # Try Ollama
        ollama = get_ollama_client()
        ollama_available = await ollama.check_available()
        
        if ollama_available:
            response = await ollama.chat(
                messages=messages,
                model="llama3.2",
                temperature=0.7,
                max_tokens=1024,
            )
            answer = response.get("message", {}).get("content", "No response generated.")
            return PromptResponse(answer=answer, model="llama3.2")
        
        # No AI backend available
        raise HTTPException(
            status_code=503,
            detail="AI services unavailable. Please check your OpenAI, Hugging Face API key, or start Ollama."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prompt agent error: {e}")
        raise HTTPException(status_code=500, detail=f"Prompt processing failed: {str(e)}")

