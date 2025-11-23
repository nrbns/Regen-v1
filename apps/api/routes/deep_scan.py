"""
Deep Scan API - orchestrates multi-page scraping for research mode
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, HttpUrl

from apps.api.services.search_aggregator import aggregate_search
from apps.api.services.scraper import scraper_service

router = APIRouter()


class DeepScanRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=400)
    urls: Optional[List[HttpUrl]] = None
    max_pages: int = Field(default=5, ge=1, le=8)
    allow_render: bool = True
    use_cache: bool = True


class DeepScanStep(BaseModel):
    label: str
    status: str
    detail: Optional[str] = None
    started_at: str
    completed_at: Optional[str] = None


class DeepScanResponse(BaseModel):
    query: str
    sources: List[Dict[str, Any]]
    search_results: List[Dict[str, Any]]
    steps: List[DeepScanStep]
    created_at: str


@router.post("/research/deep-scan", response_model=DeepScanResponse)
async def deep_scan(request: DeepScanRequest) -> DeepScanResponse:
    steps: List[DeepScanStep] = []
    created_at = datetime.utcnow().isoformat()

    def start_step(label: str) -> DeepScanStep:
        step = DeepScanStep(label=label, status="running", started_at=datetime.utcnow().isoformat())
        steps.append(step)
        return step

    def finish_step(step: DeepScanStep, status: str, detail: Optional[str] = None) -> None:
        step.status = status
        step.detail = detail
        step.completed_at = datetime.utcnow().isoformat()

    if not request.query.strip() and not request.urls:
        raise HTTPException(status_code=400, detail="Provide a query or explicit URLs to scan.")

    search_step = start_step("Gathering candidate sources")
    candidate_urls: List[str] = []
    search_results: List[Dict[str, Any]] = []

    if request.urls:
        candidate_urls = [str(url) for url in request.urls][: request.max_pages]
        finish_step(search_step, "complete", f"Using {len(candidate_urls)} provided URLs")
    else:
        try:
            search_payload = await aggregate_search(
                query=request.query,
                sources=["duckduckgo", "bing"],
                max_results=max(request.max_pages * 2, 8),
                bing_api_key=None,
                include_summary=False,
            )
            if isinstance(search_payload, list):
                search_results = search_payload
            else:
                search_results = search_payload.get("results", [])
            for item in search_results:
                url = item.get("url")
                if url and url not in candidate_urls:
                    candidate_urls.append(url)
            candidate_urls = candidate_urls[: request.max_pages]
            finish_step(search_step, "complete", f"Selected {len(candidate_urls)} URLs from search")
        except Exception as exc:  # pylint: disable=broad-except
            finish_step(search_step, "error", f"Search failed: {exc}")
            raise HTTPException(status_code=500, detail="Failed to gather search results") from exc

    if not candidate_urls:
        raise HTTPException(status_code=404, detail="No candidate URLs available for deep scan.")

    scrape_step = start_step("Scraping pages")
    try:
        scraped = await scraper_service.scrape_many(
            candidate_urls,
            allow_render=request.allow_render,
            use_cache=request.use_cache,
            max_chars=15000,
        )
        finish_step(scrape_step, "complete", f"Scraped {len(scraped)} pages")
    except Exception as exc:  # pylint: disable=broad-except
        finish_step(scrape_step, "error", f"Scraping failed: {exc}")
        raise HTTPException(status_code=500, detail="Failed to scrape candidate pages") from exc

    sources = []
    for index, snapshot in enumerate(scraped):
        domain = snapshot.get("metadata", {}).get("domain") or ""
        sources.append(
            {
                "id": snapshot.get("content_hash") or f"deep-{index}",
                "title": snapshot.get("title") or snapshot.get("final_url") or snapshot.get("url"),
                "url": snapshot.get("final_url") or snapshot.get("url"),
                "domain": domain,
                "snippet": snapshot.get("excerpt") or "",
                "text": snapshot.get("content") or snapshot.get("excerpt") or "",
                "sourceType": infer_source_type(domain),
                "relevanceScore": 90 - index * 3,
                "metadata": {
                    "provider": "deep-scan",
                    "selectorMatched": snapshot.get("metadata", {}).get("selectorMatched"),
                },
                "image": snapshot.get("image"),
                "wordCount": snapshot.get("word_count"),
                "lang": snapshot.get("lang"),
                "contentHash": snapshot.get("content_hash"),
                "fromCache": snapshot.get("from_cache"),
                "rendered": snapshot.get("rendered"),
                "fetchedAt": snapshot.get("fetched_at"),
            }
        )

    return DeepScanResponse(
        query=request.query,
        sources=sources,
        search_results=search_results,
        steps=steps,
        created_at=created_at,
    )


def infer_source_type(domain: str) -> str:
    domain_lower = (domain or "").lower()
    if domain_lower.endswith(".edu") or "research" in domain_lower:
        return "academic"
    if domain_lower.endswith(".gov"):
        return "documentation"
    if any(keyword in domain_lower for keyword in ["news", "guardian", "times", "cnn", "bbc", "reuters"]):
        return "news"
    return "other"


