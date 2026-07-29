"""Redis cache-aside helper (mirrors server/src/lib/redis.ts).

Gracefully degrades: if Redis is unavailable, an in-memory dict keeps the
last successful result per key so the app never returns stale-empty when the
external API hiccups.
"""

from __future__ import annotations

import json
import time
from collections.abc import Awaitable, Callable
from typing import Any, TypeVar

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

# Fresh values, honouring each key's TTL.
_mem_cache: dict[str, tuple[float, float, str]] = {}
# Last payload that actually had content, kept without expiry as a lifeboat for
# when every upstream is failing.
_last_good: dict[str, str] = {}

# When a producer comes back empty and we fall back to `_last_good`, wait this
# long before hitting the upstream again — otherwise a hard-down provider gets
# retried on literally every request.
_EMPTY_RETRY_SECONDS = 60.0


def _has_content(value: Any) -> bool:
    """Whether a producer actually returned data.

    For every feed in this app an empty list/dict means "the upstream failed",
    not "there is genuinely nothing" — so it must never be cached as if it were
    a real answer.
    """
    if value is None:
        return False
    if isinstance(value, (list, dict, tuple, set, str)):
        return len(value) > 0
    return True


async def cached(
    key: str,
    ttl_seconds: int,
    producer: Callable[[], Awaitable[T]],
    *,
    cache_empty: bool = True,
) -> T:
    """Return cached JSON if present, else run ``producer``, cache, and return.

    Set ``cache_empty=False`` for upstream data feeds, where an empty result
    signals failure: the empty value is then never cached, and the last result
    that did have content is served instead.
    """
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
    has_content = _has_content(value)

    if has_content or cache_empty:
        serialised = json.dumps(value)
        _mem_cache[key] = (now, ttl_seconds, serialised)
        if has_content:
            _last_good[key] = serialised
        try:
            await redis_client.set(key, serialised, ex=ttl_seconds)
        except Exception:
            pass  # non-fatal
        return value

    # --- producer came back empty: serve the last good payload if we have one ---
    stale = _last_good.get(key)
    if stale is not None:
        logger.warn(f"{key} produced no data, serving last known result")
        _mem_cache[key] = (now, _EMPTY_RETRY_SECONDS, stale)
        return json.loads(stale)

    logger.warn(f"{key} produced no data and no previous result is available")
    return value
