"""Sentiment snapshot (mirrors server/src/services/sentiment.ts)."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import cached
from app.logging_utils import logger
from app.models import NewsAnalysis
from app.services.market_data import get_quotes


async def _get_fear_greed() -> dict[str, Any] | None:
    async def produce() -> dict[str, Any] | None:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get("https://api.alternative.me/fng/", params={"limit": 1})
                resp.raise_for_status()
                point = (resp.json().get("data") or [None])[0]
            if not point:
                return None
            return {
                "value": int(point["value"]),
                "label": point["value_classification"],
                "updatedAt": datetime.fromtimestamp(
                    int(point["timestamp"]), tz=UTC
                ).isoformat(),
            }
        except Exception:
            logger.warn("Fear & Greed fetch failed")
            return None

    return await cached("sentiment:feargreed", 60 * 30, produce)


async def _get_vix() -> dict[str, Any] | None:
    try:
        quotes = await get_quotes(["^VIX"])
        if not quotes:
            return None
        vix = quotes[0]
        return {"value": vix["price"], "changePercent": vix["changePercent"]}
    except Exception:
        return None


async def _get_news_sentiment(session: AsyncSession) -> dict[str, int] | None:
    try:
        since = datetime.now(UTC) - timedelta(hours=72)
        rows = (
            await session.execute(
                select(NewsAnalysis.sentiment, func.count())
                .where(NewsAnalysis.created_at >= since)
                .group_by(NewsAnalysis.sentiment)
            )
        ).all()
        if not rows:
            return None
        out = {"bullish": 0, "bearish": 0, "neutral": 0}
        for sentiment, count in rows:
            if sentiment in out:
                out[sentiment] = count
        return out
    except Exception:
        return None


async def get_sentiment(session: AsyncSession) -> dict[str, Any]:
    fear_greed, vix, news_sentiment = await asyncio.gather(
        _get_fear_greed(),
        _get_vix(),
        _get_news_sentiment(session),
    )
    return {
        "fearGreed": fear_greed,
        "vix": vix,
        "newsSentiment": news_sentiment,
        "updatedAt": datetime.now(UTC).isoformat(),
    }
