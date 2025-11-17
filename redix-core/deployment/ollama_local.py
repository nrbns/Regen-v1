"""
Ollama Local Runtime - Local model handler
Provides local LLM inference via Ollama
"""

from langchain_community.llms import Ollama
from typing import Optional
import os

class OllamaLocal:
    """Local Ollama model handler"""
    
    def __init__(self, model: str = "llama3.2"):
        self.model = model
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.llm: Optional[Ollama] = None
        self._initialize()
    
    def _initialize(self):
        """Initialize Ollama connection"""
        try:
            self.llm = Ollama(
                model=self.model,
                base_url=self.base_url
            )
        except Exception as e:
            print(f"[OllamaLocal] Failed to initialize: {e}")
            self.llm = None
    
    def is_available(self) -> bool:
        """Check if Ollama is available"""
        if not self.llm:
            return False
        try:
            # Try a simple check
            import requests
            response = requests.get(f"{self.base_url}/api/tags", timeout=2)
            return response.status_code == 200
        except:
            return False
    
    def generate(self, prompt: str, temperature: float = 0.7) -> str:
        """
        Generate response from local Ollama model
        
        Args:
            prompt: Input prompt
            temperature: Sampling temperature
        
        Returns:
            Generated text
        """
        if not self.llm:
            raise Exception("Ollama not available. Start Ollama: ollama serve")
        
        try:
            response = self.llm.invoke(prompt)
            return str(response)
        except Exception as e:
            raise Exception(f"Ollama generation failed: {str(e)}")
    
    def stream(self, prompt: str):
        """
        Stream response from local Ollama model
        
        Args:
            prompt: Input prompt
        
        Yields:
            Text chunks
        """
        if not self.llm:
            raise Exception("Ollama not available")
        
        try:
            for chunk in self.llm.stream(prompt):
                yield str(chunk)
        except Exception as e:
            raise Exception(f"Ollama streaming failed: {str(e)}")

