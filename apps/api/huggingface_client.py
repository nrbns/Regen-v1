"""
Hugging Face Client for FastAPI Backend
Provides local AI capabilities using Hugging Face Inference API and models
"""

import asyncio
import json
import logging
import os
from typing import AsyncGenerator, Optional, List

import httpx

logger = logging.getLogger(__name__)


class HuggingFaceClient:
    """Client for Hugging Face Inference API and local models"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://router.huggingface.co/hf-inference",
        use_local: bool = False,
        local_model_path: Optional[str] = None,
    ):
        self.api_key = api_key or os.getenv("HUGGINGFACE_API_KEY", "")
        # Use the standard inference API endpoint (works with API key)
        self.base_url = base_url.rstrip("/")
        self.use_local = use_local
        self.local_model_path = local_model_path
        self._client: Optional[httpx.AsyncClient] = None
        self.timeout = 60.0  # Longer timeout for model loading

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
        """Check if Hugging Face API is available"""
        if not self.api_key:
            return False
        try:
            client = await self._get_client()
            # Try a simple embedding request to check availability
            try:
                response = await client.post(
                    f"{self.base_url}/models/sentence-transformers/all-MiniLM-L6-v2",
                    json={"inputs": "test"},
                    timeout=10.0,
                )
                # Accept 200 (success) or 503 (model loading) as available
                return response.status_code in [200, 503]
            except Exception:
                # If request fails but we have API key, assume available
                # (network issues, etc. - let actual calls handle errors)
                return True
        except Exception as e:
            logger.debug(f"Hugging Face check failed: {e}")
            # If we have an API key, assume it might work (network issues, etc.)
            return bool(self.api_key)

    async def generate_embedding(
        self,
        text: str,
        model: str = "sentence-transformers/all-MiniLM-L6-v2",
    ) -> List[float]:
        """
        Generate embedding for text using Hugging Face Inference API
        
        Args:
            text: Text to embed
            model: Model to use (default: all-MiniLM-L6-v2 for 384-dim embeddings)
        
        Returns:
            List of floats representing the embedding vector
        """
        if not self.api_key:
            raise ValueError("Hugging Face API key not configured")

        try:
            client = await self._get_client()
            
            # Use Inference API - try different formats based on model type
            url = f"{self.base_url}/models/{model}"
            
            # For sentence-transformers models, try different input formats
            # Format 1: Simple text input
            payload = {"inputs": text}
            
            response = await client.post(
                url,
                json=payload,
                timeout=30.0,
            )

            # If error mentions "sentences", try alternative format
            if not response.is_success:
                error_text = await response.aread()
                error_msg = error_text.decode() if error_text else str(response.status_code)
                
                # Try to parse error JSON
                try:
                    error_json = json.loads(error_msg)
                    if "error" in error_json:
                        error_msg = error_json["error"]
                except:
                    pass
                
                # If error mentions "sentences", try with sentences parameter
                if "sentences" in error_msg.lower() and "sentence-transformers" in model:
                    logger.debug("Trying alternative format with sentences parameter")
                    # Try format: {"inputs": {"source_sentence": text, "sentences": [text]}}
                    payload = {"inputs": {"source_sentence": text, "sentences": [text]}}
                    response = await client.post(
                        url,
                        json=payload,
                        timeout=30.0,
                    )
                
                # Handle 503 (model loading) - wait and retry once
                if response.status_code == 503:
                    logger.info("Model is loading, waiting 5 seconds and retrying...")
                    await asyncio.sleep(5)
                    response = await client.post(
                        url,
                        json=payload,
                        timeout=30.0,
                    )
                
                if not response.is_success:
                    error_text = await response.aread()
                    error_msg = error_text.decode() if error_text else str(response.status_code)
                    try:
                        error_json = json.loads(error_msg)
                        if "error" in error_json:
                            error_msg = error_json["error"]
                    except:
                        pass
                    raise Exception(f"Hugging Face API error: {error_msg}")

            data = response.json()
            
            # Handle different response formats
            if isinstance(data, list) and len(data) > 0:
                if isinstance(data[0], list):
                    return data[0]  # Single text input, nested list
                return data[0] if isinstance(data[0], (int, float)) else data  # Single embedding or list
            elif isinstance(data, dict):
                # Check for common response formats
                if "embeddings" in data:
                    return data["embeddings"][0] if isinstance(data["embeddings"], list) else data["embeddings"]
                elif "output" in data:
                    output = data["output"]
                    if isinstance(output, list) and len(output) > 0:
                        return output[0] if isinstance(output[0], list) else output
            else:
                # Try to extract first embedding
                return data if isinstance(data, list) and len(data) > 0 else []

        except httpx.TimeoutException:
            logger.error("Hugging Face embedding request timed out")
            raise Exception("Request timed out")
        except Exception as e:
            logger.error(f"Hugging Face embedding error: {e}")
            raise

    async def stream_chat(
        self,
        messages: List[dict[str, str]],
        model: str = "meta-llama/Meta-Llama-3-8B-Instruct",
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[dict, None]:
        """
        Stream chat completion from Hugging Face Inference API
        
        Yields:
            dict with keys: 'text' (str), 'done' (bool), 'error' (Optional[str])
        """
        if not self.api_key:
            yield {"text": "", "done": True, "error": "Hugging Face API key not configured"}
            return

        try:
            client = await self._get_client()
            
            # Format messages for the model
            prompt = self._format_messages(messages)
            
            # Use Inference API for text generation
            async with client.stream(
                "POST",
                f"{self.base_url}/models/{model}",
                json={
                    "inputs": prompt,
                    "parameters": {
                        "temperature": temperature,
                        "max_new_tokens": max_tokens,
                        "return_full_text": False,
                    },
                },
                timeout=60.0,
            ) as response:
                if not response.is_success:
                    error_text = await response.aread()
                    error_msg = error_text.decode() if error_text else str(response.status_code)
                    # Handle 503 (model loading)
                    if response.status_code == 503:
                        yield {"text": "", "done": True, "error": "Model is loading. Please try again in a few moments."}
                    else:
                        yield {"text": "", "done": True, "error": f"Hugging Face error: {error_msg}"}
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
                            # Try to parse as JSON
                            if line.startswith("data: "):
                                line = line[6:]  # Remove "data: " prefix
                            
                            data = json.loads(line)
                            
                            # Extract generated text
                            if "generated_text" in data:
                                text = data["generated_text"]
                                yield {"text": text, "done": False, "error": None}
                            elif "token" in data and "text" in data["token"]:
                                yield {"text": data["token"]["text"], "done": False, "error": None}
                            elif "text" in data:
                                yield {"text": data["text"], "done": False, "error": None}
                            
                            if data.get("done", False):
                                yield {"text": "", "done": True, "error": None}
                                return
                        except json.JSONDecodeError:
                            # If not JSON, try to extract text directly
                            if line and not line.startswith("data:"):
                                # Might be plain text response
                                yield {"text": line + " ", "done": False, "error": None}
                            continue

                yield {"text": "", "done": True, "error": None}

        except httpx.TimeoutException:
            logger.error("Hugging Face chat request timed out")
            yield {"text": "", "done": True, "error": "Request timed out"}
        except Exception as e:
            logger.error(f"Hugging Face streaming error: {e}")
            yield {"text": "", "done": True, "error": str(e)}

    def _format_messages(self, messages: List[dict[str, str]]) -> str:
        """Format messages for the model"""
        formatted = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            if role == "system":
                formatted.append(f"System: {content}")
            elif role == "user":
                formatted.append(f"User: {content}")
            elif role == "assistant":
                formatted.append(f"Assistant: {content}")
        
        return "\n".join(formatted)

    async def batch_embed(
        self,
        texts: List[str],
        model: str = "sentence-transformers/all-MiniLM-L6-v2",
    ) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        if not self.api_key:
            raise ValueError("Hugging Face API key not configured")

        try:
            client = await self._get_client()
            
            response = await client.post(
                f"{self.base_url}/models/{model}",
                json={"inputs": texts},
                timeout=60.0,
            )

            if not response.is_success:
                error_text = await response.aread()
                error_msg = error_text.decode() if error_text else str(response.status_code)
                # Handle 503 (model loading)
                if response.status_code == 503:
                    logger.info("Model is loading, waiting 5 seconds and retrying...")
                    await asyncio.sleep(5)
                    response = await client.post(
                        f"{self.base_url}/models/{model}",
                        json={"inputs": texts},
                        timeout=60.0,
                    )
                    if not response.is_success:
                        error_text = await response.aread()
                        error_msg = error_text.decode() if error_text else str(response.status_code)
                        raise Exception(f"Hugging Face API error: {error_msg}")
                else:
                    raise Exception(f"Hugging Face API error: {error_msg}")

            data = response.json()
            
            # Handle batch response
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and "embeddings" in data:
                return data["embeddings"]
            else:
                return []

        except Exception as e:
            logger.error(f"Hugging Face batch embed error: {e}")
            raise


# Global singleton instance
_hf_client: Optional[HuggingFaceClient] = None


def get_huggingface_client(
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
) -> HuggingFaceClient:
    """Get or create Hugging Face client singleton"""
    global _hf_client
    if _hf_client is None:
        key = api_key or os.getenv("HUGGINGFACE_API_KEY", "")
        url = base_url or os.getenv("HUGGINGFACE_BASE_URL", "https://api-inference.huggingface.co")
        _hf_client = HuggingFaceClient(api_key=key, base_url=url)
    return _hf_client
