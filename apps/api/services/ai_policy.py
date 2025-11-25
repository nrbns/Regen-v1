"""
AI Policy Engine - Cost-based routing, fallbacks, and safeguards
"""

from __future__ import annotations

import logging
import os
from typing import Optional, Dict, Any, List, Tuple
from enum import Enum

logger = logging.getLogger(__name__)


class CostTier(str, Enum):
    """Cost optimization tiers"""
    LOW = "low"  # Use cheapest available model
    MEDIUM = "medium"  # Balanced cost/quality
    HIGH = "high"  # Best quality, cost not a concern


class ModelSpec:
    """Model specification with cost metadata"""

    def __init__(
        self,
        provider: str,
        model: str,
        max_tokens: int,
        temperature: float,
        estimated_cost_per_1k_tokens: float = 0.0,  # USD
        fallback: Optional[str] = None,  # Fallback model name if this fails
    ):
        self.provider = provider
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.estimated_cost_per_1k_tokens = estimated_cost_per_1k_tokens
        self.fallback = fallback


# Model registry with cost estimates (as of 2024)
MODEL_REGISTRY: Dict[str, ModelSpec] = {
    # OpenAI models
    "gpt-4o-mini": ModelSpec(
        provider="openai",
        model="gpt-4o-mini",
        max_tokens=800,
        temperature=0.2,
        estimated_cost_per_1k_tokens=0.15 / 1000,  # $0.15 per 1M tokens
        fallback="gpt-3.5-turbo",
    ),
    "gpt-4o": ModelSpec(
        provider="openai",
        model="gpt-4o",
        max_tokens=1000,
        temperature=0.2,
        estimated_cost_per_1k_tokens=2.50 / 1000,  # $2.50 per 1M tokens
        fallback="gpt-4o-mini",
    ),
    "gpt-3.5-turbo": ModelSpec(
        provider="openai",
        model="gpt-3.5-turbo",
        max_tokens=600,
        temperature=0.2,
        estimated_cost_per_1k_tokens=0.50 / 1000,  # $0.50 per 1M tokens
        fallback=None,
    ),
    # Anthropic models
    "claude-3-haiku-20240307": ModelSpec(
        provider="anthropic",
        model="claude-3-haiku-20240307",
        max_tokens=800,
        temperature=0.2,
        estimated_cost_per_1k_tokens=0.25 / 1000,  # $0.25 per 1M tokens
        fallback="gpt-4o-mini",
    ),
    "claude-3-sonnet-20240229": ModelSpec(
        provider="anthropic",
        model="claude-3-sonnet-20240229",
        max_tokens=1000,
        temperature=0.2,
        estimated_cost_per_1k_tokens=3.0 / 1000,  # $3.00 per 1M tokens
        fallback="claude-3-haiku-20240307",
    ),
    "claude-3-opus-20240229": ModelSpec(
        provider="anthropic",
        model="claude-3-opus-20240229",
        max_tokens=1200,
        temperature=0.2,
        estimated_cost_per_1k_tokens=15.0 / 1000,  # $15.00 per 1M tokens
        fallback="claude-3-sonnet-20240229",
    ),
    # Ollama models (local, free)
    "llama3.2": ModelSpec(
        provider="ollama",
        model="llama3.2",
        max_tokens=1000,
        temperature=0.7,
        estimated_cost_per_1k_tokens=0.0,  # Local, free
        fallback="llama2",
    ),
    "llama2": ModelSpec(
        provider="ollama",
        model="llama2",
        max_tokens=800,
        temperature=0.7,
        estimated_cost_per_1k_tokens=0.0,  # Local, free
        fallback="gpt-4o-mini",  # Fallback to cloud if Ollama unavailable
    ),
    "mistral": ModelSpec(
        provider="ollama",
        model="mistral",
        max_tokens=1000,
        temperature=0.7,
        estimated_cost_per_1k_tokens=0.0,  # Local, free
        fallback="llama3.2",
    ),
}


# Task-specific policy templates
TASK_POLICIES: Dict[str, Dict[str, Any]] = {
    "search": {
        "default_tier": CostTier.LOW,
        "models": ["gpt-4o-mini", "claude-3-haiku-20240307", "llama3.2", "gpt-3.5-turbo"],
        "max_tokens": 800,
        "temperature": 0.2,
        "requires_citations": True,
    },
    "agent": {
        "default_tier": CostTier.MEDIUM,
        "models": ["gpt-4o-mini", "claude-3-haiku-20240307", "llama3.2", "gpt-4o"],
        "max_tokens": 900,
        "temperature": 0.1,
        "requires_citations": False,
    },
    "chat": {
        "default_tier": CostTier.MEDIUM,
        "models": ["gpt-4o-mini", "claude-3-haiku-20240307", "llama3.2", "gpt-4o"],
        "max_tokens": 1000,
        "temperature": 0.7,
        "requires_citations": False,
    },
    "summary": {
        "default_tier": CostTier.LOW,
        "models": ["gpt-4o-mini", "claude-3-haiku-20240307", "llama3.2", "gpt-3.5-turbo"],
        "max_tokens": 600,
        "temperature": 0.1,
        "requires_citations": False,
    },
}


def resolve_cost_tier(metadata: Optional[Dict[str, Any]] = None) -> CostTier:
    """Extract cost tier from request metadata or use default"""
    if not metadata:
        return CostTier.MEDIUM

    cost_flag = metadata.get("cost_tier") or metadata.get("cost")
    if cost_flag:
        try:
            return CostTier(cost_flag.lower())
        except ValueError:
            pass

    # Check for explicit flags
    flags = metadata.get("flags", [])
    if isinstance(flags, list):
        if "cost:low" in flags or "cost_low" in flags:
            return CostTier.LOW
        if "cost:high" in flags or "cost_high" in flags:
            return CostTier.HIGH

    return CostTier.MEDIUM


def select_model_for_task(
    kind: str,
    cost_tier: CostTier,
    available_providers: Optional[List[str]] = None,
) -> ModelSpec:
    """
    Select the best model for a task based on kind and cost tier.
    Returns a ModelSpec with provider, model, and parameters.
    """
    policy = TASK_POLICIES.get(kind.lower(), TASK_POLICIES["chat"])
    candidate_models = policy.get("models", ["gpt-4o-mini"])

    # Filter by available providers if specified
    if available_providers:
        candidate_models = [
            m for m in candidate_models if MODEL_REGISTRY.get(m, ModelSpec("", "", 0, 0.0)).provider in available_providers
        ]

    if not candidate_models:
        # Fallback to first available model
        candidate_models = ["gpt-4o-mini"]

    # Select model based on cost tier
    if cost_tier == CostTier.LOW:
        # Prefer cheapest model
        models_by_cost = sorted(
            [m for m in candidate_models if m in MODEL_REGISTRY],
            key=lambda m: MODEL_REGISTRY[m].estimated_cost_per_1k_tokens,
        )
        selected = models_by_cost[0] if models_by_cost else candidate_models[0]
    elif cost_tier == CostTier.HIGH:
        # Prefer most capable model
        models_by_cost = sorted(
            [m for m in candidate_models if m in MODEL_REGISTRY],
            key=lambda m: MODEL_REGISTRY[m].estimated_cost_per_1k_tokens,
            reverse=True,
        )
        selected = models_by_cost[0] if models_by_cost else candidate_models[0]
    else:
        # MEDIUM: use default from policy
        selected = candidate_models[0]

    spec = MODEL_REGISTRY.get(selected)
    if not spec:
        # Create a default spec if model not in registry
        spec = ModelSpec(
            provider="openai",
            model=selected,
            max_tokens=policy.get("max_tokens", 800),
            temperature=policy.get("temperature", 0.2),
        )

    # Override with policy defaults
    spec.max_tokens = policy.get("max_tokens", spec.max_tokens)
    spec.temperature = policy.get("temperature", spec.temperature)

    return spec


def get_fallback_model(current_spec: ModelSpec) -> Optional[ModelSpec]:
    """Get fallback model if current one fails"""
    if current_spec.fallback and current_spec.fallback in MODEL_REGISTRY:
        fallback_spec = MODEL_REGISTRY[current_spec.fallback]
        # Inherit task-specific settings
        return ModelSpec(
            provider=fallback_spec.provider,
            model=fallback_spec.model,
            max_tokens=current_spec.max_tokens,  # Keep original token budget
            temperature=current_spec.temperature,
            estimated_cost_per_1k_tokens=fallback_spec.estimated_cost_per_1k_tokens,
            fallback=fallback_spec.fallback,
        )
    return None


def estimate_cost(spec: ModelSpec, prompt_tokens: int, completion_tokens: int) -> float:
    """Estimate cost in USD for a request"""
    # Simplified: assume same cost for input/output
    total_tokens = prompt_tokens + completion_tokens
    return (total_tokens / 1000) * spec.estimated_cost_per_1k_tokens


def enforce_token_budget(requested: Optional[int], policy_max: int, absolute_max: int = 2000) -> int:
    """Enforce token budget with safety caps"""
    if not requested:
        return policy_max
    return min(max(requested, 50), policy_max, absolute_max)  # Min 50, max from policy or absolute


def get_system_prompt(kind: str) -> str:
    """Get system prompt for task kind"""
    prompts = {
        "search": "You are ReGen's research copilot. Answer concisely and cite sources when available.",
        "agent": "You are an execution agent that produces actionable next steps.",
        "chat": "You are a helpful and concise assistant.",
        "summary": "You are a summarization expert. Provide a concise summary.",
    }
    default = os.getenv(
        "AI_TASK_DEFAULT_SYSTEM_PROMPT",
        "You are Regen's assistant. Be factual and concise.",
    )
    return prompts.get(kind.lower(), default)


async def check_provider_availability(provider: str) -> bool:
    """Check if a provider is available"""
    if provider == "openai":
        try:
            from apps.api.openai_client import get_openai_client
            client = get_openai_client()
            return await client.check_available()
        except Exception:
            return False
    elif provider == "anthropic":
        try:
            from apps.api.anthropic_client import get_anthropic_client
            client = get_anthropic_client()
            return await client.check_available()
        except Exception:
            return False
    elif provider == "ollama":
        try:
            from apps.api.ollama_client import get_ollama_client
            client = get_ollama_client()
            return await client.check_available()
        except Exception:
            return False
    return False


async def get_available_providers() -> List[str]:
    """Get list of available providers"""
    providers = []
    for provider in ["openai", "anthropic", "ollama"]:
        if await check_provider_availability(provider):
            providers.append(provider)
    return providers

