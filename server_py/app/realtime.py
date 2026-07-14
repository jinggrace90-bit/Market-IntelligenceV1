"""Socket.IO server + broadcasters (mirrors server/src/websocket/index.ts).

Channels (compatible with the existing socket.io-client frontend):
  - ``market:overview``  pushed every 15s
  - ``news:latest``      pushed every 60s (top of feed)
  - ``sentiment``        pushed every 5m
Clients receive an immediate snapshot on connect.
"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from typing import Any

import socketio

from app.config import settings
from app.db import SessionLocal
from app.logging_utils import logger
from app.services.market_data import get_market_overview
from app.services.news import get_news
from app.services.sentiment import get_sentiment

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.cors_origins,
)

_connected: set[str] = set()
_tasks: list[asyncio.Task] = []


async def _market_payload() -> Any:
    return await get_market_overview()


async def _news_payload() -> Any:
    async with SessionLocal() as session:
        result = await get_news(session, limit=20)
    return result["items"]


async def _sentiment_payload() -> Any:
    async with SessionLocal() as session:
        return await get_sentiment(session)


@sio.event
async def connect(sid: str, _environ: dict, _auth: Any = None) -> None:
    _connected.add(sid)
    logger.debug(f"WS connected: {sid}")
    try:
        await sio.emit("market:overview", await _market_payload(), to=sid)
        await sio.emit("sentiment", await _sentiment_payload(), to=sid)
        await sio.emit("news:latest", await _news_payload(), to=sid)
    except Exception:
        logger.warn("Failed to send initial WS snapshot")


@sio.event
async def disconnect(sid: str) -> None:
    _connected.discard(sid)
    logger.debug(f"WS disconnected: {sid}")


async def _broadcast_loop(
    interval: float, event: str, producer: Callable[[], Awaitable[Any]]
) -> None:
    while True:
        await asyncio.sleep(interval)
        if not _connected:
            continue
        try:
            await sio.emit(event, await producer())
        except Exception:
            logger.warn(f"Broadcast failed for {event}")


def start_broadcasters() -> None:
    _tasks.append(asyncio.create_task(_broadcast_loop(15, "market:overview", _market_payload)))
    _tasks.append(asyncio.create_task(_broadcast_loop(60, "news:latest", _news_payload)))
    _tasks.append(asyncio.create_task(_broadcast_loop(300, "sentiment", _sentiment_payload)))


async def stop_broadcasters() -> None:
    for task in _tasks:
        task.cancel()
    _tasks.clear()
