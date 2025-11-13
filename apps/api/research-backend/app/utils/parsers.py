"""
Document Parsers
"""

import pdfplumber
from bs4 import BeautifulSoup
from typing import Dict, Any
import mammoth
import io


def parse_document(content: bytes, source_type: str) -> Dict[str, Any]:
    """Parse document based on source type"""
    if source_type == "pdf":
        return parse_pdf(content)
    elif source_type == "docx":
        return parse_docx(content)
    elif source_type == "snapshot":
        return parse_html(content)
    elif source_type in ["txt", "md"]:
        return parse_text(content)
    else:
        raise ValueError(f"Unsupported source type: {source_type}")


def parse_pdf(content: bytes) -> Dict[str, Any]:
    """Parse PDF file"""
    import io
    text_parts = []
    
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            if text:
                text_parts.append(f"[Page {page_num}]\n{text}")
    
    return {
        "text": "\n\n".join(text_parts),
        "title": "PDF Document",
        "metadata": {"page_count": len(text_parts)},
    }


def parse_docx(content: bytes) -> Dict[str, Any]:
    """Parse DOCX file"""
    result = mammoth.extract_raw_text(io.BytesIO(content))
    return {
        "text": result.value,
        "title": "DOCX Document",
        "metadata": {},
    }


def parse_html(content: bytes) -> Dict[str, Any]:
    """Parse HTML snapshot"""
    soup = BeautifulSoup(content, "lxml")
    
    # Remove scripts and styles
    for script in soup(["script", "style"]):
        script.decompose()
    
    text = soup.get_text(separator="\n", strip=True)
    title = soup.title.string if soup.title else "Web Page"
    
    return {
        "text": text,
        "title": title,
        "metadata": {"url": None},  # Will be set from metadata
    }


def parse_text(content: bytes) -> Dict[str, Any]:
    """Parse plain text file"""
    text = content.decode("utf-8", errors="ignore")
    return {
        "text": text,
        "title": "Text Document",
        "metadata": {},
    }

