"""
OpenAI Client for FastAPI Backend
Provides ChatGPT and OpenAI API capabilities
"""

import asyncio
import json
import logging
import os
from typing import AsyncGenerator, Optional, List

import httpx

logger = logging.getLogger(__name__)


class OpenAIClient:
    """Client for OpenAI API (ChatGPT, embeddings, etc.)"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.openai.com/v1",
    ):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY", "")
        self.base_url = base_url.rstrip("/")
        self._client: Optional[httpx.AsyncClient] = None
        self.timeout = 60.0

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None:
            headers = {
                "Content-Type": "application/json",
            }
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                headers=headers,
            )
        return self._client

    async def close(self):
        """Close HTTP client"""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def check_available(self) -> bool:
        """Check if OpenAI API is available"""
        if not self.api_key:
            return False
        try:
            client = await self._get_client()
            # Simple check - try to list models
            response = await client.get(
                f"{self.base_url}/models",
                timeout=10.0,
            )
            return response.is_success
        except Exception as e:
            logger.debug(f"OpenAI check failed: {e}")
            # If we have an API key, assume it might work (network issues, etc.)
            return bool(self.api_key)

    async def generate_embedding(
        self,
        text: str,
        model: str = "text-embedding-3-small",
    ) -> List[float]:
        """
        Generate embedding for text using OpenAI API
        
        Args:
            text: Text to embed
            model: Model to use (default: text-embedding-3-small for 1536-dim embeddings)
        
        Returns:
            List of floats representing the embedding vector
        """
        if not self.api_key:
            raise ValueError("OpenAI API key not configured")

        try:
            client = await self._get_client()
            
            response = await client.post(
                f"{self.base_url}/embeddings",
                json={
                    "model": model,
                    "input": text,
                },
                timeout=30.0,
            )

            if not response.is_success:
                error_text = await response.aread()
                error_msg = error_text.decode() if error_text else str(response.status_code)
                try:
                    error_json = json.loads(error_msg)
                    if "error" in error_json:
                        error_msg = error_json["error"].get("message", str(error_json["error"]))
                except:
                    pass
                raise Exception(f"OpenAI API error: {error_msg}")

            data = response.json()
            
            # OpenAI returns: {"data": [{"embedding": [...]}], "model": "...", ...}
            if "data" in data and len(data["data"]) > 0:
                return data["data"][0]["embedding"]
            else:
                raise Exception("OpenAI API returned unexpected format")

        except httpx.TimeoutException:
            logger.error("OpenAI embedding request timed out")
            raise Exception("Request timed out")
        except Exception as e:
            logger.error(f"OpenAI embedding error: {e}")
            raise

    async def batch_embed(
        self,
        texts: List[str],
        model: str = "text-embedding-3-small",
    ) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        if not self.api_key:
            raise ValueError("OpenAI API key not configured")

        try:
            client = await self._get_client()
            
            response = await client.post(
                f"{self.base_url}/embeddings",
                json={
                    "model": model,
                    "input": texts,
                },
                timeout=60.0,
            )

            if not response.is_success:
                error_text = await response.aread()
                error_msg = error_text.decode() if error_text else str(response.status_code)
                try:
                    error_json = json.loads(error_msg)
                    if "error" in error_json:
                        error_msg = error_json["error"].get("message", str(error_json["error"]))
                except:
                    pass
                raise Exception(f"OpenAI API error: {error_msg}")

            data = response.json()
            
            # OpenAI returns: {"data": [{"embedding": [...]}, ...], "model": "...", ...}
            if "data" in data:
                return [item["embedding"] for item in data["data"]]
            else:
                raise Exception("OpenAI API returned unexpected format")

        except Exception as e:
            logger.error(f"OpenAI batch embed error: {e}")
            raise

    async def stream_chat(
        self,
        messages: List[dict[str, str]],
        model: str = "gpt-4o-mini",
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[dict, None]:
        """
        Stream chat completion from OpenAI API
        
        Yields:
            dict with keys: 'text' (str), 'done' (bool), 'error' (Optional[str])
        """
        if not self.api_key:
            yield {"text": "", "done": True, "error": "OpenAI API key not configured"}
            return

        try:
            client = await self._get_client()
            
            # OpenAI expects messages in specific format
            formatted_messages = []
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                formatted_messages.append({"role": role, "content": content})
            
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                json={
                    "model": model,
                    "messages": formatted_messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": True,
                },
                timeout=60.0,
            ) as response:
                if not response.is_success:
                    error_text = await response.aread()
                    error_msg = error_text.decode() if error_text else str(response.status_code)
                    try:
                        error_json = json.loads(error_msg)
                        if "error" in error_json:
                            error_msg = error_json["error"].get("message", str(error_json["error"]))
                    except:
                        pass
                    yield {"text": "", "done": True, "error": f"OpenAI error: {error_msg}"}
                    return

                buffer = ""
                async for chunk in response.aiter_text():
                    buffer += chunk
                    lines = buffer.split("\n")
                    buffer = lines.pop() if lines else ""

                    for line in lines:
                        line = line.strip()
                        if not line or not line.startswith("data: "):
                            continue

                        # Remove "data: " prefix
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            yield {"text": "", "done": True, "error": None}
                            return

                        try:
                            data = json.loads(data_str)
                            
                            # Extract delta content
                            if "choices" in data and len(data["choices"]) > 0:
                                delta = data["choices"][0].get("delta", {})
                                if "content" in delta:
                                    text = delta["content"]
                                    yield {"text": text, "done": False, "error": None}
                            
                            # Check if finished
                            if data.get("choices", [{}])[0].get("finish_reason"):
                                yield {"text": "", "done": True, "error": None}
                                return
                        except json.JSONDecodeError:
                            continue

                yield {"text": "", "done": True, "error": None}

        except httpx.TimeoutException:
            logger.error("OpenAI chat request timed out")
            yield {"text": "", "done": True, "error": "Request timed out"}
        except Exception as e:
            logger.error(f"OpenAI streaming error: {e}")
            yield {"text": "", "done": True, "error": str(e)}


# Global singleton instance
_openai_client: Optional[OpenAIClient] = None


def get_openai_client(
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
) -> OpenAIClient:
    """Get or create OpenAI client singleton"""
    global _openai_client
    if _openai_client is None:
        key = api_key or os.getenv("OPENAI_API_KEY", "")
        url = base_url or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        _openai_client = OpenAIClient(api_key=key, base_url=url)
    return _openai_client

