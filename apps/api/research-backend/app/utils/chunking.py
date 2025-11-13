"""
Text Chunking Utilities
"""

import tiktoken
from typing import List, Dict, Any
import uuid
from app.core.config import settings

encoding = tiktoken.get_encoding("cl100k_base")


def chunk_text(text: str) -> List[Dict[str, Any]]:
    """Split text into chunks with overlap"""
    chunks = []
    chunk_size = settings.CHUNK_SIZE
    overlap = settings.CHUNK_OVERLAP
    
    # Tokenize text
    tokens = encoding.encode(text)
    
    start = 0
    chunk_order = 0
    
    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))
        chunk_tokens = tokens[start:end]
        chunk_text = encoding.decode(chunk_tokens)
        
        chunks.append({
            "id": str(uuid.uuid4()),
            "text": chunk_text,
            "chunk_order": chunk_order,
            "char_start": start,
            "char_end": end,
            "token_count": len(chunk_tokens),
        })
        
        start = end - overlap
        chunk_order += 1
    
    return chunks

