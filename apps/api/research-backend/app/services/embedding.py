"""
Embedding Service
"""

import hashlib
import redis
from typing import List, Optional
import openai
from app.core.config import settings

# Initialize Redis for caching
redis_client = redis.from_url(settings.REDIS_URL)


class EmbeddingService:
    def __init__(self):
        if settings.EMBEDDING_PROVIDER == "openai":
            self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        else:
            raise ValueError(f"Unsupported embedding provider: {settings.EMBEDDING_PROVIDER}")
    
    def _get_cache_key(self, text: str) -> str:
        """Generate cache key from text hash"""
        text_hash = hashlib.sha256(text.encode()).hexdigest()
        return f"embedding:{text_hash}"
    
    async def get_embeddings(
        self,
        texts: List[str],
        use_cache: bool = True,
    ) -> List[List[float]]:
        """Get embeddings for texts, with caching"""
        embeddings = []
        texts_to_embed = []
        text_indices = []
        
        # Check cache
        if use_cache:
            for idx, text in enumerate(texts):
                cache_key = self._get_cache_key(text)
                cached = redis_client.get(cache_key)
                if cached:
                    import json
                    embeddings.append(json.loads(cached))
                else:
                    texts_to_embed.append(text)
                    text_indices.append(idx)
        else:
            texts_to_embed = texts
            text_indices = list(range(len(texts)))
        
        # Get embeddings for uncached texts
        if texts_to_embed:
            # Batch API call
            response = self.client.embeddings.create(
                model=settings.EMBEDDING_MODEL,
                input=texts_to_embed,
            )
            
            new_embeddings = [item.embedding for item in response.data]
            
            # Cache new embeddings
            if use_cache:
                for text, embedding in zip(texts_to_embed, new_embeddings):
                    cache_key = self._get_cache_key(text)
                    import json
                    redis_client.setex(
                        cache_key,
                        settings.EMBEDDING_CACHE_TTL,
                        json.dumps(embedding),
                    )
            
            # Merge cached and new embeddings
            if use_cache:
                final_embeddings = [None] * len(texts)
                cached_idx = 0
                new_idx = 0
                for i in range(len(texts)):
                    if i in text_indices:
                        final_embeddings[i] = new_embeddings[new_idx]
                        new_idx += 1
                    else:
                        final_embeddings[i] = embeddings[cached_idx]
                        cached_idx += 1
                embeddings = final_embeddings
            else:
                embeddings = new_embeddings
        
        return embeddings

