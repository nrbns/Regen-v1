"""
LLM Assistant API - Unified endpoint for AI assistant features
Supports page content extraction, "Ask about this page", and summarization
"""

import asyncio
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json

from apps.api.ollama_client import get_ollama_client
from apps.api.huggingface_client import get_huggingface_client
from apps.api.openai_client import get_openai_client
from apps.api.routes.extract import extract_content, ExtractRequest
from apps.api.cache import cache_get, cache_set

logger = logging.getLogger(__name__)

router = APIRouter()


class AskAboutPageRequest(BaseModel):
    """Request for 'Ask about this page' feature"""
    prompt: str
    url: str
    context: Optional[str] = None  # Pre-extracted context (optional)


class SummarizePageRequest(BaseModel):
    """Request for page summarization"""
    url: str
    max_length: Optional[int] = 200  # Max summary length in words
    style: Optional[str] = "concise"  # concise, detailed, bullet


class LLMAssistantRequest(BaseModel):
    """General LLM assistant request"""
    prompt: str
    context: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2048
    stream: bool = True


@router.post("/ask-about-page")
async def ask_about_page(request: AskAboutPageRequest):
    """
    Ask a question about a specific page.
    Extracts page content and answers the question using AI.
    """
    try:
        # Extract page content if not provided
        page_context = request.context
        if not page_context:
            extract_req = ExtractRequest(url=request.url)
            extracted = await extract_content(extract_req)
            page_context = f"Title: {extracted.title}\n\nContent: {extracted.content[:5000]}"  # Limit to 5000 chars
        
        # Build prompt with context
        system_prompt = """You are Redix, an AI assistant for OmniBrowser. 
You help users understand web pages by answering questions about their content.
Provide accurate, concise answers based on the page content provided."""
        
        user_prompt = f"""Page URL: {request.url}

Page Content:
{page_context}

User Question: {request.prompt}

Please answer the user's question based on the page content above. If the answer cannot be found in the content, say so."""
        
        # Get AI client
        openai = get_openai_client()
        openai_available = await openai.check_available()
        
        hf = get_huggingface_client()
        hf_available = await hf.check_available()
        
        ollama = get_ollama_client()
        ollama_available = await ollama.check_available()
        
        if not openai_available and not hf_available and not ollama_available:
            raise HTTPException(
                status_code=503,
                detail="AI services unavailable. Please check your API keys or start Ollama."
            )
        
        # Streaming response
        async def generate():
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            
            yield f"data: {json.dumps({'type': 'start', 'message': 'Analyzing page and preparing answer...'})}\n\n"
            
            # Prefer OpenAI, then Hugging Face, then Ollama
            if openai_available:
                async for chunk in openai.stream_chat(
                    messages=messages,
                    model="gpt-4o-mini",
                    temperature=0.7,
                    max_tokens=1024,
                ):
                    if chunk.get("text"):
                        yield f"data: {json.dumps({'type': 'token', 'text': chunk['text']})}\n\n"
                    if chunk.get("done"):
                        break
            elif hf_available:
                async for chunk in hf.stream_chat(
                    messages=messages,
                    model="meta-llama/Meta-Llama-3-8B-Instruct",
                    temperature=0.7,
                    max_tokens=1024,
                ):
                    if chunk.get("text"):
                        yield f"data: {json.dumps({'type': 'token', 'text': chunk['text']})}\n\n"
                    if chunk.get("done"):
                        break
            else:
                response = await ollama.chat(
                    messages=messages,
                    model="llama3.2",
                    temperature=0.7,
                    max_tokens=1024,
                )
                answer = response.get("message", {}).get("content", "")
                # Stream the answer character by character for consistency
                for char in answer:
                    yield f"data: {json.dumps({'type': 'token', 'text': char})}\n\n"
                    await asyncio.sleep(0.01)
            
            yield f"data: {json.dumps({'type': 'done', 'done': True})}\n\n"
        
        return StreamingResponse(generate(), media_type="text/event-stream")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ask about page error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process request: {str(e)}")


@router.post("/summarize-page")
async def summarize_page(request: SummarizePageRequest):
    """
    Summarize a web page using AI.
    Extracts content and generates a summary.
    """
    try:
        # Extract page content
        extract_req = ExtractRequest(url=request.url)
        extracted = await extract_content(extract_req)
        
        # Build summarization prompt
        style_instructions = {
            "concise": "Provide a brief 2-3 sentence summary.",
            "detailed": "Provide a comprehensive summary covering all key points.",
            "bullet": "Provide a bullet-point summary of the main points.",
        }
        style_instruction = style_instructions.get(request.style, style_instructions["concise"])
        
        system_prompt = """You are Redix, an AI assistant for OmniBrowser.
You create clear, accurate summaries of web pages."""
        
        user_prompt = f"""Page URL: {request.url}
Page Title: {extracted.title}

Page Content:
{extracted.content[:8000]}  # Limit to 8000 chars for summarization

{style_instruction}
Maximum length: {request.max_length} words."""
        
        # Get AI client
        openai = get_openai_client()
        openai_available = await openai.check_available()
        
        hf = get_huggingface_client()
        hf_available = await hf.check_available()
        
        ollama = get_ollama_client()
        ollama_available = await ollama.check_available()
        
        if not openai_available and not hf_available and not ollama_available:
            raise HTTPException(
                status_code=503,
                detail="AI services unavailable. Please check your API keys or start Ollama."
            )
        
        # Streaming response
        async def generate():
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            
            yield f"data: {json.dumps({'type': 'start', 'message': 'Summarizing page...'})}\n\n"
            
            # Prefer OpenAI, then Hugging Face, then Ollama
            if openai_available:
                async for chunk in openai.stream_chat(
                    messages=messages,
                    model="gpt-4o-mini",
                    temperature=0.5,
                    max_tokens=512,
                ):
                    if chunk.get("text"):
                        yield f"data: {json.dumps({'type': 'token', 'text': chunk['text']})}\n\n"
                    if chunk.get("done"):
                        break
            elif hf_available:
                async for chunk in hf.stream_chat(
                    messages=messages,
                    model="meta-llama/Meta-Llama-3-8B-Instruct",
                    temperature=0.5,
                    max_tokens=512,
                ):
                    if chunk.get("text"):
                        yield f"data: {json.dumps({'type': 'token', 'text': chunk['text']})}\n\n"
                    if chunk.get("done"):
                        break
            else:
                response = await ollama.chat(
                    messages=messages,
                    model="llama3.2",
                    temperature=0.5,
                    max_tokens=512,
                )
                answer = response.get("message", {}).get("content", "")
                for char in answer:
                    yield f"data: {json.dumps({'type': 'token', 'text': char})}\n\n"
                    await asyncio.sleep(0.01)
            
            yield f"data: {json.dumps({'type': 'done', 'done': True})}\n\n"
        
        return StreamingResponse(generate(), media_type="text/event-stream")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Summarize page error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to summarize page: {str(e)}")


@router.post("/assistant")
async def llm_assistant(request: LLMAssistantRequest):
    """
    General-purpose LLM assistant endpoint.
    Can be used for any AI assistant task with optional context.
    """
    try:
        system_prompt = request.system_prompt or "You are Redix, an AI assistant for OmniBrowser. Provide helpful, concise answers."
        
        user_prompt = request.prompt
        if request.context:
            user_prompt = f"Context:\n{request.context}\n\nUser Question: {request.prompt}"
        
        # Get AI client
        openai = get_openai_client()
        openai_available = await openai.check_available()
        
        hf = get_huggingface_client()
        hf_available = await hf.check_available()
        
        ollama = get_ollama_client()
        ollama_available = await ollama.check_available()
        
        if not openai_available and not hf_available and not ollama_available:
            raise HTTPException(
                status_code=503,
                detail="AI services unavailable. Please check your API keys or start Ollama."
            )
        
        if not request.stream:
            # Non-streaming response
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            
            if openai_available:
                response_text = ""
                async for chunk in openai.stream_chat(
                    messages=messages,
                    model="gpt-4o-mini",
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                ):
                    if chunk.get("text"):
                        response_text += chunk["text"]
                    if chunk.get("done"):
                        break
                return {"response": response_text, "model": "gpt-4o-mini"}
            elif hf_available:
                response_text = ""
                async for chunk in hf.stream_chat(
                    messages=messages,
                    model="meta-llama/Meta-Llama-3-8B-Instruct",
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                ):
                    if chunk.get("text"):
                        response_text += chunk["text"]
                    if chunk.get("done"):
                        break
                return {"response": response_text, "model": "meta-llama/Meta-Llama-3-8B-Instruct"}
            else:
                response = await ollama.chat(
                    messages=messages,
                    model="llama3.2",
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                )
                answer = response.get("message", {}).get("content", "")
                return {"response": answer, "model": "llama3.2"}
        
        # Streaming response
        async def generate():
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            
            yield f"data: {json.dumps({'type': 'start', 'message': 'Redix is thinking...'})}\n\n"
            
            if openai_available:
                async for chunk in openai.stream_chat(
                    messages=messages,
                    model="gpt-4o-mini",
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                ):
                    if chunk.get("text"):
                        yield f"data: {json.dumps({'type': 'token', 'text': chunk['text']})}\n\n"
                    if chunk.get("done"):
                        break
            elif hf_available:
                async for chunk in hf.stream_chat(
                    messages=messages,
                    model="meta-llama/Meta-Llama-3-8B-Instruct",
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                ):
                    if chunk.get("text"):
                        yield f"data: {json.dumps({'type': 'token', 'text': chunk['text']})}\n\n"
                    if chunk.get("done"):
                        break
            else:
                response = await ollama.chat(
                    messages=messages,
                    model="llama3.2",
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                )
                answer = response.get("message", {}).get("content", "")
                for char in answer:
                    yield f"data: {json.dumps({'type': 'token', 'text': char})}\n\n"
                    await asyncio.sleep(0.01)
            
            yield f"data: {json.dumps({'type': 'done', 'done': True})}\n\n"
        
        return StreamingResponse(generate(), media_type="text/event-stream")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LLM assistant error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process request: {str(e)}")


