"""
Rate Limiting Service - Prevent abuse and manage costs
"""

from __future__ import annotations

import logging
import time
from collections import defaultdict
from typing import Dict, Tuple, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class RateLimitConfig:
    """Rate limit configuration per task kind"""
    requests_per_minute: int = 30
    requests_per_hour: int = 200
    requests_per_day: int = 1000
    cost_per_hour_usd: float = 5.0  # Max cost per hour
    cost_per_day_usd: float = 50.0  # Max cost per day


# Default rate limits per task kind
DEFAULT_LIMITS: Dict[str, RateLimitConfig] = {
    "search": RateLimitConfig(
        requests_per_minute=20,
        requests_per_hour=150,
        requests_per_day=800,
        cost_per_hour_usd=3.0,
        cost_per_day_usd=30.0,
    ),
    "agent": RateLimitConfig(
        requests_per_minute=15,
        requests_per_hour=100,
        requests_per_day=500,
        cost_per_hour_usd=5.0,
        cost_per_day_usd=50.0,
    ),
    "chat": RateLimitConfig(
        requests_per_minute=30,
        requests_per_hour=200,
        requests_per_day=1000,
        cost_per_hour_usd=5.0,
        cost_per_day_usd=50.0,
    ),
    "summary": RateLimitConfig(
        requests_per_minute=25,
        requests_per_hour=180,
        requests_per_day=900,
        cost_per_hour_usd=4.0,
        cost_per_day_usd=40.0,
    ),
    "discipline_log": RateLimitConfig(
        requests_per_minute=10,
        requests_per_hour=60,
        requests_per_day=200,
        cost_per_hour_usd=0.0,
        cost_per_day_usd=0.0,
    ),
}


class RateLimiter:
    """
    In-memory rate limiter (for single-instance deployments).
    For multi-instance, use Redis or similar distributed store.
    """

    def __init__(self):
        # Track requests: key -> list of timestamps
        self.request_history: Dict[str, list[float]] = defaultdict(list)
        # Track costs: key -> list of (timestamp, cost) tuples
        self.cost_history: Dict[str, list[Tuple[float, float]]] = defaultdict(list)
        # Cleanup threshold (remove entries older than 24 hours)
        self.cleanup_threshold = 24 * 60 * 60

    def _get_key(self, identifier: str, kind: str) -> str:
        """Generate rate limit key"""
        return f"{identifier}:{kind}"

    def _cleanup_old_entries(self, key: str, history: list[float], cutoff: float):
        """Remove entries older than cutoff"""
        while history and history[0] < cutoff:
            history.pop(0)

    def _cleanup_cost_history(self, key: str, cutoff: float):
        """Remove cost entries older than cutoff"""
        if key in self.cost_history:
            self.cost_history[key] = [
                (ts, cost) for ts, cost in self.cost_history[key] if ts >= cutoff
            ]

    def check_rate_limit(
        self,
        identifier: str,
        kind: str,
        estimated_cost: Optional[float] = None,
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if request is within rate limits.
        Returns (allowed, error_message)
        """
        now = time.time()
        key = self._get_key(identifier, kind)
        config = DEFAULT_LIMITS.get(kind.lower(), DEFAULT_LIMITS["chat"])

        # Cleanup old entries
        minute_cutoff = now - 60
        hour_cutoff = now - 3600
        day_cutoff = now - 86400

        history = self.request_history[key]
        self._cleanup_old_entries(key, history, day_cutoff)

        # Check per-minute limit
        recent_minute = [ts for ts in history if ts >= minute_cutoff]
        if len(recent_minute) >= config.requests_per_minute:
            return (
                False,
                f"Rate limit exceeded: {config.requests_per_minute} requests per minute",
            )

        # Check per-hour limit
        recent_hour = [ts for ts in history if ts >= hour_cutoff]
        if len(recent_hour) >= config.requests_per_hour:
            return (
                False,
                f"Rate limit exceeded: {config.requests_per_hour} requests per hour",
            )

        # Check per-day limit
        recent_day = [ts for ts in history if ts >= day_cutoff]
        if len(recent_day) >= config.requests_per_day:
            return (
                False,
                f"Rate limit exceeded: {config.requests_per_day} requests per day",
            )

        # Check cost limits if estimated cost provided
        if estimated_cost and estimated_cost > 0:
            cost_key = self._get_key(identifier, kind)
            self._cleanup_cost_history(cost_key, hour_cutoff)

            # Check hourly cost
            hourly_cost = sum(
                cost
                for ts, cost in self.cost_history.get(cost_key, [])
                if ts >= hour_cutoff
            )
            if hourly_cost + estimated_cost > config.cost_per_hour_usd:
                return (
                    False,
                    f"Cost limit exceeded: ${config.cost_per_hour_usd:.2f} per hour",
                )

            # Check daily cost
            daily_cost = sum(
                cost
                for ts, cost in self.cost_history.get(cost_key, [])
                if ts >= day_cutoff
            )
            if daily_cost + estimated_cost > config.cost_per_day_usd:
                return (
                    False,
                    f"Cost limit exceeded: ${config.cost_per_day_usd:.2f} per day",
                )

        # All checks passed
        return (True, None)

    def record_request(
        self,
        identifier: str,
        kind: str,
        cost: Optional[float] = None,
    ):
        """Record a request (call after successful rate limit check)"""
        now = time.time()
        key = self._get_key(identifier, kind)
        self.request_history[key].append(now)

        if cost and cost > 0:
            cost_key = self._get_key(identifier, kind)
            self.cost_history[cost_key].append((now, cost))

    def get_stats(self, identifier: str, kind: str) -> Dict[str, int]:
        """Get rate limit statistics for debugging"""
        now = time.time()
        key = self._get_key(identifier, kind)
        history = self.request_history.get(key, [])

        minute_cutoff = now - 60
        hour_cutoff = now - 3600
        day_cutoff = now - 86400

        return {
            "requests_last_minute": len([ts for ts in history if ts >= minute_cutoff]),
            "requests_last_hour": len([ts for ts in history if ts >= hour_cutoff]),
            "requests_last_day": len([ts for ts in history if ts >= day_cutoff]),
        }


# Global rate limiter instance
_rate_limiter = RateLimiter()


def get_rate_limiter() -> RateLimiter:
    """Get the global rate limiter instance"""
    return _rate_limiter


def enforce_rate_limit(identifier: str, kind: str, estimated_cost: Optional[float] = None):
    limiter = get_rate_limiter()
    return limiter.check_rate_limit(identifier, kind, estimated_cost=estimated_cost)


def mark_request(identifier: str, kind: str, cost: Optional[float] = None):
    limiter = get_rate_limiter()
    limiter.record_request(identifier, kind, cost=cost)


def get_client_identifier(request: Any, metadata: Optional[Dict[str, Any]] = None) -> str:
    """
    Extract client identifier from request.
    In production, use user ID, API key, or IP address.
    For now, use IP address as fallback.
    """
    # Try to get user ID from metadata first
    if metadata:
        user_id = metadata.get("user_id") or metadata.get("userId")
        if user_id:
            return str(user_id)

    # Try to get from request object (FastAPI Request)
    if hasattr(request, "client") and request.client:
        return request.client.host or "anonymous"

    # Fallback
    return "anonymous"


