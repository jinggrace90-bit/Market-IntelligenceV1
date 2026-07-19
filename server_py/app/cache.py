"""Redis cache-aside helper (mirrors server/src/lib/redis.ts).

Gracefully degrades: if Redis is unavailable, an in-memory dict keeps the
last successful result per key so the app never returns stale-empty when the
external API hiccups.
"""

from __future__ import annotations

import json
import time
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

_mem_cache: dict[str, tuple[float, float, str]] = {}


async def cached(key: str, ttl_seconds: int, producer: Callable[[], Awaitable[T]]) -> T:
    """Return cached JSON if present, else run ``producer``, cache, and return."""
    now = time.monotonic()

    # --- try Redis first ---
    try:
        hit = await redis_client.get(key)
        if hit:
            return json.loads(hit)
    except Exception:
        pass

    # --- try in-memory cache ---
    entry = _mem_cache.get(key)
    if entry:
        stored_at, ttl, payload = entry
        if now - stored_at < ttl:
            return json.loads(payload)

    # --- produce fresh value ---
    value = await producer()

    serialised = json.dumps(value)

    # store in memory unconditionally (survives Redis-less deployments)
    _mem_cache[key] = (now, ttl_seconds, serialised)

    try:
        await redis_client.set(key, serialised, ex=ttl_seconds)
    except Exception:
        pass  # non-fatal
    return value
