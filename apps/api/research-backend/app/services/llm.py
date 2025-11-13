"""
LLM Service for Streaming Answers
"""

import openai
from typing import AsyncGenerator, List, Dict
from app.core.config import settings


class LLMService:
    def __init__(self):
        if settings.LLM_PROVIDER == "openai":
            self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        else:
            raise ValueError(f"Unsupported LLM provider: {settings.LLM_PROVIDER}")
    
    async def stream_answer(
        self,
        query: str,
        chunks: List[Dict],
        mode: str = "quick",
    ) -> AsyncGenerator[str, None]:
        """Stream LLM answer tokens"""
        # Build context from chunks
        context = "\n\n".join([
            f"[Source {i+1}]: {chunk['text']}"
            for i, chunk in enumerate(chunks[:5])  # Use top 5 chunks
        ])
        
        # Build prompt
        if mode == "quick":
            prompt = f"""Answer the following question based on the provided sources. Be concise (2-3 sentences).

Sources:
{context}

Question: {query}

Answer:"""
        else:
            prompt = f"""Provide a comprehensive answer to the following question based on the provided sources. Include citations in the format [Source N].

Sources:
{context}

Question: {query}

Answer:"""
        
        # Stream from OpenAI
        stream = self.client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": "You are a helpful research assistant. Always cite sources when making claims."},
                {"role": "user", "content": prompt},
            ],
            temperature=settings.LLM_TEMPERATURE,
            max_tokens=settings.LLM_MAX_TOKENS,
            stream=True,
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

