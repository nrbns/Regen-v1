"""
Page content extraction endpoint for Reader/Notes sidebar
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class ExtractRequest(BaseModel):
    url: str


class ExtractResponse(BaseModel):
    url: str
    title: str
    content: str
    excerpt: str
    lang: str = "en"


@router.post("/extract", response_model=ExtractResponse)
async def extract_content(request: ExtractRequest):
    """
    Extract readable content from a URL for the Reader sidebar.
    Uses Readability algorithm to extract main content.
    """
    try:
        # Fetch the page
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                request.url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Regen/1.0"
                },
                follow_redirects=True,
            )
            response.raise_for_status()
            html = response.text
            final_url = str(response.url)

        # Extract readable content using Readability
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html, "html.parser")
            
            # Simple extraction (can be enhanced with full Readability library)
            title = soup.find("title")
            title_text = title.get_text().strip() if title else ""
            
            # Try to find main content
            main_content = (
                soup.find("article") or
                soup.find("main") or
                soup.find("div", class_=lambda x: x and ("content" in x.lower() or "article" in x.lower() or "post" in x.lower())) or
                soup.find("body")
            )
            
            if main_content:
                # Remove script and style elements
                for script in main_content(["script", "style", "nav", "header", "footer", "aside"]):
                    script.decompose()
                
                content = main_content.get_text(separator="\n", strip=True)
                excerpt = content[:200] if len(content) > 200 else content
            else:
                # Fallback: extract all text
                for script in soup(["script", "style", "nav", "header", "footer", "aside"]):
                    script.decompose()
                content = soup.get_text(separator="\n", strip=True)
                excerpt = content[:200] if len(content) > 200 else content
            
            # Detect language (simple heuristic)
            lang = soup.find("html", lang=True)
            lang_code = lang.get("lang", "en") if lang else "en"
            
            return ExtractResponse(
                url=final_url,
                title=title_text or final_url,
                content=content,
                excerpt=excerpt,
                lang=lang_code,
            )
        except Exception as e:
            logger.warning(f"Readability extraction failed, using fallback: {e}")
            # Fallback: return basic info
            return ExtractResponse(
                url=final_url,
                title=final_url,
                content="Unable to extract readable content from this page.",
                excerpt="Unable to extract readable content.",
                lang="en",
            )
            
    except httpx.HTTPError as e:
        logger.error(f"HTTP error extracting {request.url}: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")
    except Exception as e:
        logger.error(f"Error extracting {request.url}: {e}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

