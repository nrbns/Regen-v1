"""
AI-Powered Search Endpoint
Provides search with AI summarization and enhanced ranking
"""

import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import json
import logging

from apps.api.services.search_aggregator import aggregate_search
from apps.api.openai_client import get_openai_client
from apps.api.huggingface_client import get_huggingface_client
from apps.api.ollama_client import get_ollama_client

logger = logging.getLogger(__name__)

router = APIRouter()


class AISearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = 20
    sources: Optional[List[str]] = None
    include_summary: bool = True
    summary_length: Optional[int] = 200
    stream: bool = True


@router.post("/ai-search")
async def ai_search(request: AISearchRequest):
    """
    AI-powered search with real-time summarization
    Returns search results with AI-generated summary
    """
    try:
        import os
        bing_api_key = os.getenv('BING_API_KEY')
        
        # Perform search
        search_response = await aggregate_search(
            query=request.query,
            sources=request.sources or ['duckduckgo', 'bing'],
            max_results=request.max_results or 20,
            bing_api_key=bing_api_key,
            include_summary=request.include_summary,
            summary_length=request.summary_length or 200,
        )
        
        # Handle response format
        if isinstance(search_response, dict):
            results = search_response.get('results', [])
            summary = search_response.get('summary', '')
        else:
            results = search_response
            summary = ''
        
        if request.stream:
            # Streaming response
            async def generate():
                # Send results first
                yield f"data: {json.dumps({'type': 'results', 'results': results[:10]})}\n\n"
                
                # Generate and stream summary if requested
                if request.include_summary and summary:
                    yield f"data: {json.dumps({'type': 'summary_start'})}\n\n"
                    # Stream summary character by character for effect
                    for char in summary:
                        yield f"data: {json.dumps({'type': 'summary_token', 'text': char})}\n\n"
                        await asyncio.sleep(0.01)
                    yield f"data: {json.dumps({'type': 'summary_done'})}\n\n"
                
                yield f"data: {json.dumps({'type': 'done', 'total_results': len(results), 'done': True})}\n\n"
            
            return StreamingResponse(generate(), media_type="text/event-stream")
        else:
            # Non-streaming response
            return {
                'results': results,
                'summary': summary,
                'query': request.query,
                'total_results': len(results),
            }
    
    except Exception as e:
        logger.error(f"AI search error: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

