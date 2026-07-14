"""Economic calendar (mirrors server/src/services/economicCalendar.ts)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from app.cache import cached
from app.config import settings
from app.logging_utils import logger

EconomicEvent = dict[str, Any]

CURRENCY_LABEL: dict[str, str] = {
    "USD": "United States", "EUR": "Euro Area", "GBP": "United Kingdom", "JPY": "Japan",
    "CNY": "China", "AUD": "Australia", "CAD": "Canada", "CHF": "Switzerland",
    "NZD": "New Zealand",
}


def _impact_to_importance(impact: Any) -> str:
    s = str(impact).lower()
    if "high" in s or s == "3":
        return "high"
    if "medium" in s or s == "2":
        return "medium"
    return "low"


async def _fetch_forex_factory(client: httpx.AsyncClient) -> list[EconomicEvent]:
    try:
        resp = await client.get(
            "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
            headers={"User-Agent": "Mozilla/5.0 MarketIntelligenceDashboard/1.0"},
        )
        resp.raise_for_status()
        data = resp.json()
        if not isinstance(data, list):
            return []
        events: list[EconomicEvent] = []
        for idx, e in enumerate(data):
            events.append(
                {
                    "id": f"ff-{e.get('date', idx)}-{idx}",
                    "date": e.get("date"),
                    "country": CURRENCY_LABEL.get(e.get("country"), e.get("country") or "Global"),
                    "event": e.get("title") or "Economic event",
                    "importance": _impact_to_importance(e.get("impact")),
                    "previous": str(e["previous"]) if e.get("previous") else None,
                    "forecast": str(e["forecast"]) if e.get("forecast") else None,
                    "actual": str(e["actual"]) if e.get("actual") else None,
                }
            )
        return events
    except Exception:
        logger.warn("ForexFactory calendar failed")
        return []


async def _fetch_finnhub(client: httpx.AsyncClient) -> list[EconomicEvent]:
    if not settings.finnhub_api_key:
        return []
    try:
        now = datetime.now(UTC)
        from_date = now.strftime("%Y-%m-%d")
        to_date = (now + timedelta(days=14)).strftime("%Y-%m-%d")
        resp = await client.get(
            "https://finnhub.io/api/v1/calendar/economic",
            params={"from": from_date, "to": to_date, "token": settings.finnhub_api_key},
        )
        resp.raise_for_status()
        events = (resp.json() or {}).get("economicCalendar") or []
        out: list[EconomicEvent] = []
        for idx, e in enumerate(events):
            out.append(
                {
                    "id": f"fh-{e.get('time', idx)}-{idx}",
                    "date": e.get("time"),
                    "country": e.get("country") or "Unknown",
                    "event": e.get("event") or "Economic event",
                    "importance": _impact_to_importance(e.get("impact")),
                    "previous": str(e["prev"]) if e.get("prev") is not None else None,
                    "forecast": str(e["estimate"]) if e.get("estimate") is not None else None,
                    "actual": str(e["actual"]) if e.get("actual") is not None else None,
                }
            )
        return out
    except Exception:
        logger.warn("Finnhub calendar failed")
        return []


async def get_economic_calendar() -> list[EconomicEvent]:
    async def produce() -> list[EconomicEvent]:
        async with httpx.AsyncClient(timeout=9.0, follow_redirects=True) as client:
            finnhub = await _fetch_finnhub(client)
            ff = await _fetch_forex_factory(client)
        merged = finnhub if finnhub else ff
        merged = [e for e in merged if e.get("date")]
        merged.sort(key=lambda e: e["date"])
        return merged

    return await cached("calendar:economic", 60 * 60, produce)
