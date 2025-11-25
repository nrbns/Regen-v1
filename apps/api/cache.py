"""
Redis cache helpers for Regen API.
"""

from __future__ import annotations

import json
import os
from typing import Any, Optional

import redis.asyncio as redis
from redis.exceptions import RedisError

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

try:
    cache_client: Optional[redis.Redis] = redis.from_url(
        REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
        socket_connect_timeout=1,
    )
except RedisError:
    cache_client = None


async def cache_get(key: str) -> Optional[str]:
    if cache_client is None:
        return None
    try:
        return await cache_client.get(key)
    except RedisError:
        return None


async def cache_set(key: str, value: Any, ttl_seconds: int = 60) -> None:
    if cache_client is None:
        return
    encoded = value if isinstance(value, str) else json.dumps(value)
    try:
        await cache_client.setex(key, ttl_seconds, encoded)
    except RedisError:
        return


