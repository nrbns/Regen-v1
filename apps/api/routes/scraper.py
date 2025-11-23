"""
Research Scraper API
--------------------
Provides normalized content snapshots for research sources.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, HttpUrl
from typing import Dict, List, Optional

from apps.api.services.scraper import scraper_service

router = APIRouter()


class ScrapeRequest(BaseModel):
    urls: List[HttpUrl] = Field(..., description="List of URLs to scrape")
    allow_render: bool = Field(
        default=True,
        description="Attempt to render JavaScript-heavy pages using the configured renderer",
    )
    use_cache: bool = Field(default=True, description="Reuse cached scrape results when available")
    selectors: Optional[List[str]] = Field(
        default=None,
        description="Optional CSS selectors to prioritize for extraction",
    )
    max_chars: int = Field(
        default=20000,
        ge=500,
        le=60000,
        description="Trim extracted content to this many characters",
    )


class ScrapedSource(BaseModel):
    url: HttpUrl
    final_url: Optional[HttpUrl] = None
    status: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    word_count: int = 0
    lang: Optional[str] = None
    content_hash: Optional[str] = None
    rendered: bool = False
    from_cache: bool = False
    fetched_at: Optional[str] = None
    metadata: Optional[Dict[str, object]] = None


class ScrapeResponse(BaseModel):
    results: List[ScrapedSource]
    stats: Dict[str, object]


@router.post("/scrape", response_model=ScrapeResponse)
async def scrape_endpoint(request: ScrapeRequest) -> ScrapeResponse:
    if not request.urls:
        raise HTTPException(status_code=400, detail="At least one URL is required")

    str_urls = [str(url) for url in request.urls]
    results = await scraper_service.scrape_many(
        urls=str_urls,
        allow_render=request.allow_render,
        use_cache=request.use_cache,
        selectors=request.selectors,
        max_chars=request.max_chars,
    )

    stats = {
        "count": len(results),
        "rendered": sum(1 for result in results if result.get("rendered")),
        "cached": sum(1 for result in results if result.get("from_cache")),
    }

    return ScrapeResponse(results=results, stats=stats)

