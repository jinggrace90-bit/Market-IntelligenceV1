"""Redis cache-aside helper (mirrors server/src/lib/redis.ts).

Gracefully degrades: if Redis is unavailable, the producer still runs so the
app keeps working.
"""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from typing import TypeVar

import redis.asyncio as aioredis

from app.config import settings
from app.logging_utils import logger

T = TypeVar("T")

redis_client: aioredis.Redis = aioredis.from_url(
    settings.redis_url,
    encoding="utf-8",
    decode_responses=True,
    socket_connect_timeout=3,
    socket_timeout=3,
    retry_on_timeout=False,
)


async def cached(key: str, ttl_seconds: int, producer: Callable[[], Awaitable[T]]) -> T:
    """Return cached JSON if present, else run ``producer``, cache, and return."""
    try:
        hit = await redis_client.get(key)
        if hit:
            return json.loads(hit)
    except Exception:
        logger.warn(f"Redis GET failed for {key}, bypassing cache")

    value = await producer()

    try:
        await redis_client.set(key, json.dumps(value), ex=ttl_seconds)
    except Exception:
        pass  # non-fatal
    return value
