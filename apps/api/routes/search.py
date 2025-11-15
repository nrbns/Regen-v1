"""
Search Routes
Enhanced search endpoint using search aggregator
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import json
import os

from apps.api.cache import cache_get, cache_set
from apps.api.services.search_aggregator import aggregate_search

router = APIRouter()

class SearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = 20
    sources: Optional[List[str]] = None
    include_summary: Optional[bool] = False
    summary_length: Optional[int] = 200

class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str
    source: str
    relevance_score: Optional[float] = None
    rank: Optional[int] = None
    domain: Optional[str] = None

class SearchResponse(BaseModel):
    results: List[SearchResult]
    query: str
    total_results: int
    sources_used: List[str]
    summary: Optional[str] = None

@router.post("", response_model=SearchResponse)
async def search(request: SearchRequest):
    """
    Perform aggregated search across multiple sources (DuckDuckGo, Bing)
    with advanced ranking and deduplication
    """
    # Check cache first
    cache_key = f"search:{request.query}:{request.max_results}"
    cached = await cache_get(cache_key)
    if cached:
        payload = json.loads(cached)
        return SearchResponse(
            results=[SearchResult(**item) for item in payload.get('results', [])],
            query=request.query,
            total_results=len(payload.get('results', [])),
            sources_used=payload.get('sources_used', []),
        )

    # Get Bing API key from environment
    bing_api_key = os.getenv('BING_API_KEY')
    
    # Determine sources to use
    sources = request.sources or ['duckduckgo', 'bing']
    
    # Perform aggregated search
    try:
        search_response = await aggregate_search(
            query=request.query,
            sources=sources,
            max_results=request.max_results or 20,
            bing_api_key=bing_api_key,
            include_summary=request.include_summary or False,
            summary_length=request.summary_length or 200,
        )
        
        # Handle response format (dict if summary included, list otherwise)
        if isinstance(search_response, dict):
            # Summary included
            search_results = search_response.get('results', [])
            summary = search_response.get('summary')
        else:
            # Backward compatible list format
            search_results = search_response
            summary = None
        
        # Convert to response format
        results = [
            SearchResult(
                title=r.get('title', ''),
                url=r.get('url', ''),
                snippet=r.get('snippet', ''),
                source=r.get('source', 'unknown'),
                relevance_score=r.get('relevance_score'),
                rank=r.get('rank'),
                domain=r.get('domain'),
            )
            for r in search_results
        ]
        
        # Track which sources were actually used
        sources_used = list(set(r.source for r in results))
        
        # Cache results for 5 minutes
        cache_payload = {
            'results': [r.model_dump() for r in results],
            'sources_used': sources_used,
            'summary': summary,
        }
        await cache_set(cache_key, cache_payload, ttl_seconds=300)
        
        return SearchResponse(
            results=results,
            query=request.query,
            total_results=len(results),
            sources_used=sources_used,
            summary=summary,
        )
    except Exception as e:
        # Fallback to empty results on error
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Search failed: {e}")
        
        return SearchResponse(
            results=[],
            query=request.query,
            total_results=0,
            sources_used=[],
        )

