"""
Web Scraper Service
-------------------
Fetches and normalizes readable content, metadata, and preview data for Research Mode.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import random
import re
from datetime import datetime
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
@dataclass(frozen=True)
class RenderTarget:
    url: str
    method: str = "GET"

from urllib.parse import quote, urlparse

import httpx
from bs4 import BeautifulSoup

from apps.api.services.cache import cache_key, get_cached_response, set_cached_response

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
]

DEFAULT_TIMEOUT = float(os.getenv("SCRAPER_TIMEOUT_SECONDS", "12"))
DEFAULT_CACHE_TTL = int(os.getenv("SCRAPER_CACHE_TTL", "1800"))
MAX_CONCURRENCY = max(1, int(os.getenv("SCRAPER_MAX_CONCURRENCY", "4")))
RENDER_ENDPOINT = os.getenv("SCRAPER_RENDER_ENDPOINT")
FALLBACK_RENDER_ENABLED = os.getenv("SCRAPER_USE_RENDER_FALLBACK", "true").lower() == "true"


def _clean_text(text: str) -> str:
    text = re.sub(r"\r\n?", "\n", text)
    lines = [line.strip() for line in text.split("\n")]
    filtered = [line for line in lines if line]
    return "\n".join(filtered)


class ScraperService:
    def __init__(self) -> None:
        self._semaphore = asyncio.Semaphore(MAX_CONCURRENCY)

    async def scrape_many(
        self,
        urls: List[str],
        allow_render: bool = True,
        use_cache: bool = True,
        selectors: Optional[List[str]] = None,
        max_chars: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        tasks = [
            self._with_semaphore(
                url=url,
                allow_render=allow_render,
                use_cache=use_cache,
                selectors=selectors,
                max_chars=max_chars,
            )
            for url in urls
        ]
        return await asyncio.gather(*tasks)

    async def _with_semaphore(
        self,
        url: str,
        allow_render: bool,
        use_cache: bool,
        selectors: Optional[List[str]],
        max_chars: Optional[int],
    ) -> Dict[str, Any]:
        async with self._semaphore:
            return await self._scrape_single(
                url=url,
                allow_render=allow_render,
                use_cache=use_cache,
                selectors=selectors,
                max_chars=max_chars,
            )

    async def _scrape_single(
        self,
        url: str,
        allow_render: bool,
        use_cache: bool,
        selectors: Optional[List[str]],
        max_chars: Optional[int],
    ) -> Dict[str, Any]:
        cache_id = cache_key(url, "scrape")
        if use_cache:
            cached = get_cached_response(cache_id, max_age_seconds=DEFAULT_CACHE_TTL)
            if cached:
                return {**cached, "from_cache": True}

        fetched_at = datetime.utcnow().isoformat()
        try:
            html, final_url, status_code, rendered = await self._fetch_html(
                url, allow_render=allow_render
            )

            extraction = self._extract_content(
                html=html,
                url=final_url or url,
                selectors=selectors,
                max_chars=max_chars,
            )

            result = {
                "url": url,
                "final_url": final_url or url,
                "status": status_code,
                "title": extraction["title"],
                "description": extraction["description"],
                "image": extraction["image"],
                "excerpt": extraction["excerpt"],
                "content": extraction["content"],
                "word_count": extraction["word_count"],
                "lang": extraction["lang"],
                "content_hash": extraction["content_hash"],
                "rendered": rendered,
                "from_cache": False,
                "fetched_at": fetched_at,
                "metadata": extraction["metadata"],
            }

            if use_cache and extraction["content"]:
                set_cached_response(cache_id, result, ttl_seconds=DEFAULT_CACHE_TTL)

            return result
        except Exception as exc:  # pylint: disable=broad-except
            logger.warning("Scraper failed for %s: %s", url, exc)
            return {
                "url": url,
                "final_url": url,
                "status": None,
                "title": None,
                "description": None,
                "image": None,
                "excerpt": None,
                "content": "",
                "word_count": 0,
                "lang": None,
                "content_hash": None,
                "rendered": False,
                "from_cache": False,
                "fetched_at": fetched_at,
                "metadata": {"error": str(exc)},
            }

    async def _fetch_html(
        self,
        url: str,
        allow_render: bool,
    ) -> Tuple[str, str, int, bool]:
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            html = response.text
            final_url = str(response.url)
            status_code = response.status_code

        rendered = False
        text_preview = BeautifulSoup(html, "html.parser").get_text()
        if allow_render and len(text_preview) < 500:
            rendered_html, render_url = await self._try_render(url)
            if rendered_html:
                html = rendered_html
                final_url = render_url or final_url
                rendered = True

        return html, final_url, status_code, rendered

    async def _try_render(self, url: str) -> Tuple[Optional[str], Optional[str]]:
        headers = {"User-Agent": random.choice(USER_AGENTS)}
        if RENDER_ENDPOINT:
            target = self._build_custom_render_url(url)
        elif FALLBACK_RENDER_ENABLED:
            target = self._build_jina_url(url)
        else:
            target = None

        if not target:
            return None, None

        try:
            async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT + 5, follow_redirects=True) as client:
                if target.method == "POST":
                    response = await client.post(target.url, json={"url": url}, headers=headers)
                else:
                    response = await client.get(target.url, headers=headers)
                response.raise_for_status()
                return response.text, url
        except Exception as exc:  # pylint: disable=broad-except
            logger.debug("Render fallback failed for %s: %s", url, exc)
            return None, None

    @staticmethod
    def _build_custom_render_url(url: str) -> Optional["RenderTarget"]:
        endpoint = RENDER_ENDPOINT
        if not endpoint:
            return None
        endpoint = endpoint.strip()
        if "{url}" in endpoint:
            encoded = quote(url, safe="")
            return RenderTarget(url=endpoint.replace("{url}", encoded), method="GET")
        if endpoint.endswith("/render"):
            return RenderTarget(url=endpoint, method="POST")
        separator = "&" if "?" in endpoint else "?"
        encoded = quote(url, safe="")
        return RenderTarget(url=f"{endpoint}{separator}url={encoded}", method="GET")

    @staticmethod
    def _build_jina_url(url: str) -> Optional["RenderTarget"]:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return None
        safe_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path or ''}"
        if parsed.query:
            safe_url += f"?{parsed.query}"
        return RenderTarget(url=f"https://r.jina.ai/{safe_url}", method="GET")

    def _extract_content(
        self,
        html: str,
        url: str,
        selectors: Optional[List[str]],
        max_chars: Optional[int],
    ) -> Dict[str, Any]:
        soup = BeautifulSoup(html, "html.parser")
        title = (soup.title.get_text(strip=True) if soup.title else url)[:280]

        description_tag = soup.find("meta", attrs={"name": "description"}) or soup.find(
            "meta", attrs={"property": "og:description"}
        )
        description = (description_tag["content"].strip() if description_tag and description_tag.get("content") else "")[:500]

        og_image = soup.find("meta", attrs={"property": "og:image"}) or soup.find(
            "meta", attrs={"name": "twitter:image"}
        )
        image = og_image["content"].strip() if og_image and og_image.get("content") else None

        lang_attr = soup.find("html")
        lang = lang_attr.get("lang", "").lower() if lang_attr else ""

        target_node = None
        selector_matched = False
        if selectors:
            for selector in selectors:
                node = soup.select_one(selector)
                if node:
                    target_node = node
                    selector_matched = True
                    break

        if not target_node:
            target_node = (
                soup.find("article")
                or soup.find("main")
                or soup.find("div", attrs={"role": "main"})
                or soup.body
                or soup
            )

        for tag in target_node.find_all(["script", "style", "noscript", "iframe", "header", "footer", "nav"]):
            tag.decompose()

        text = _clean_text(target_node.get_text(separator="\n", strip=True) if target_node else soup.get_text())
        if max_chars and len(text) > max_chars:
            text = text[: max_chars - 1] + "…"

        excerpt = text[:420] + ("…" if len(text) > 420 else "")
        word_count = len(text.split())
        content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16] if text else None

        metadata = {
            "domain": urlparse(url).hostname or "",
            "selectorMatched": selector_matched,
        }

        return {
            "title": title,
            "description": description,
            "image": image,
            "excerpt": excerpt,
            "content": text,
            "word_count": word_count,
            "lang": lang or "en",
            "content_hash": content_hash,
            "metadata": metadata,
        }


scraper_service = ScraperService()

