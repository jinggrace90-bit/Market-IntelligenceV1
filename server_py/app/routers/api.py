"""Aggregate /api router (mirrors server/src/routes/index.ts)."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter

from app.routers import ai, auth, market, news, watchlist
from app.routers.misc import calendar_router, search_router, sentiment_router

api_router = APIRouter(prefix="/api")


@api_router.get("/health")
async def health() -> dict:
    return {"status": "ok", "time": datetime.now(UTC).isoformat()}


api_router.include_router(auth.router)
api_router.include_router(market.router)
api_router.include_router(news.router)
api_router.include_router(ai.router)
api_router.include_router(watchlist.router)
api_router.include_router(sentiment_router)
api_router.include_router(calendar_router)
api_router.include_router(search_router)
