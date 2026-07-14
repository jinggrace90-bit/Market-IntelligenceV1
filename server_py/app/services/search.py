"""Global search across instruments (Yahoo) + cached news (mirrors search.ts)."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import cached
from app.logging_utils import logger
from app.models import NewsArticle
from app.services.news import _to_item

_YAHOO_SEARCH = "https://query2.finance.yahoo.com/v1/finance/search"
_UA = "Mozilla/5.0 MarketIntelligenceDashboard/1.0"


async def _search_instruments(query: str) -> list[dict[str, Any]]:
    async def produce() -> list[dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=8.0, headers={"User-Agent": _UA}) as client:
                resp = await client.get(
                    _YAHOO_SEARCH,
                    params={"q": query, "quotesCount": 8, "newsCount": 0},
                )
                resp.raise_for_status()
                quotes = resp.json().get("quotes") or []
            results: list[dict[str, Any]] = []
            for r in quotes:
                if not r.get("symbol"):
                    continue
                results.append(
                    {
                        "symbol": r["symbol"],
                        "name": r.get("shortname") or r.get("longname") or r["symbol"],
                        "type": r.get("quoteType") or r.get("typeDisp") or "EQUITY",
                        "exchange": r.get("exchange"),
                    }
                )
            return results
        except Exception:
            logger.warn("Instrument search failed")
            return []

    return await cached(f"search:instruments:{query.lower()}", 60 * 10, produce)


async def _search_news(session: AsyncSession, query: str) -> list[dict[str, Any]]:
    pattern = f"%{query}%"
    rows = (
        await session.execute(
            select(NewsArticle)
            .where(
                or_(NewsArticle.title.ilike(pattern), NewsArticle.summary.ilike(pattern))
            )
            .order_by(NewsArticle.published_at.desc())
            .limit(8)
        )
    ).scalars().all()
    return [_to_item(a) for a in rows]


async def global_search(session: AsyncSession, query: str) -> dict[str, Any]:
    q = query.strip()
    if len(q) < 1:
        return {"instruments": [], "news": []}

    instruments, news = await asyncio.gather(
        _search_instruments(q),
        _search_news(session, q),
    )
    return {"instruments": instruments, "news": news}
