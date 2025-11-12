"""
Ollama Client for FastAPI Backend
Provides local LLM streaming capabilities
"""

import asyncio
import json
import logging
from typing import AsyncGenerator, Optional

import httpx

logger = logging.getLogger(__name__)


class OllamaClient:
    """Client for Ollama local LLM API"""

    def __init__(self, base_url: str = "http://localhost:11434", timeout: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client

    async def close(self):
        """Close HTTP client"""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def check_available(self) -> bool:
        """Check if Ollama is available"""
        try:
            client = await self._get_client()
            response = await client.get(f"{self.base_url}/api/tags")
            return response.is_success
        except Exception as e:
            logger.debug(f"Ollama check failed: {e}")
            return False

    async def list_models(self) -> list[str]:
        """List available models"""
        try:
            client = await self._get_client()
            response = await client.get(f"{self.base_url}/api/tags")
            if response.is_success:
                data = response.json()
                return [m["name"] for m in data.get("models", [])]
            return []
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            return []

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        model: str = "llama3.2",
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[dict, None]:
        """
        Stream chat completion from Ollama
        
        Yields:
            dict with keys: 'text' (str), 'done' (bool), 'error' (Optional[str])
        """
        try:
            client = await self._get_client()
            
            # Check availability first
            if not await self.check_available():
                logger.warning("Ollama not available, falling back to simulation")
                yield from self._simulate_stream(messages[-1].get("content", ""))
                return

            async with client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": True,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens,
                    },
                },
            ) as response:
                if not response.is_success:
                    error_text = await response.aread()
                    error_msg = error_text.decode() if error_text else response.status_code
                    yield {"text": "", "done": True, "error": f"Ollama error: {error_msg}"}
                    return

                buffer = ""
                async for chunk in response.aiter_text():
                    buffer += chunk
                    lines = buffer.split("\n")
                    buffer = lines.pop() if lines else ""

                    for line in lines:
                        line = line.strip()
                        if not line:
                            continue

                        try:
                            data = json.loads(line)
                            if "message" in data and "content" in data["message"]:
                                yield {
                                    "text": data["message"]["content"],
                                    "done": data.get("done", False),
                                    "error": None,
                                }
                            if data.get("done"):
                                return
                        except json.JSONDecodeError:
                            logger.debug(f"Invalid JSON line: {line}")
                            continue

        except httpx.TimeoutException:
            logger.error("Ollama request timed out")
            yield {"text": "", "done": True, "error": "Request timed out"}
        except Exception as e:
            logger.error(f"Ollama streaming error: {e}")
            yield {"text": "", "done": True, "error": str(e)}

    async def _simulate_stream(self, query: str) -> AsyncGenerator[dict, None]:
        """Simulate streaming when Ollama is unavailable"""
        words = query.split()
        for word in words:
            await asyncio.sleep(0.05)  # Simulate network delay
            yield {"text": word + " ", "done": False, "error": None}
        yield {"text": "", "done": True, "error": None}


# Global singleton instance
_ollama_client: Optional[OllamaClient] = None


def get_ollama_client(base_url: Optional[str] = None) -> OllamaClient:
    """Get or create Ollama client singleton"""
    global _ollama_client
    if _ollama_client is None:
        import os
        url = base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        _ollama_client = OllamaClient(base_url=url)
    return _ollama_client

