"""Economic calendar (mirrors server/src/services/economicCalendar.ts).

Data sources (tried in order):
1. Finnhub  – if FINNHUB_API_KEY is set
2. ForexFactory mirror (nfs.faireconomy.media) – free, no key needed
3. Tradays / MQL5 – fallback when the FF mirror is down
"""

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
    "NZD": "New Zealand", "INR": "India", "BRL": "Brazil", "SGD": "Singapore",
    "ZAR": "South Africa", "KRW": "South Korea", "MXN": "Mexico", "SEK": "Sweden",
    "NOK": "Norway", "HKD": "Hong Kong",
}


def _impact_to_importance(impact: Any) -> str:
    s = str(impact).lower()
    if "high" in s or s == "3":
        return "high"
    if "medium" in s or s == "2":
        return "medium"
    return "low"


# ---------------------------------------------------------------------------
# Source 1: Finnhub (requires API key)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Source 2: ForexFactory mirror (free, no key)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Source 3: Tradays / MQL5 (free, no key, fallback)
# ---------------------------------------------------------------------------

async def _fetch_tradays(client: httpx.AsyncClient) -> list[EconomicEvent]:
    try:
        now = datetime.now(UTC)
        from_ts = int(now.timestamp()) * 1000
        to_ts = int((now + timedelta(days=7)).timestamp()) * 1000
        resp = await client.post(
            "https://www.mql5.com/en/economic-calendar/content",
            data={
                "date_mode": 0,
                "from": from_ts,
                "to": to_ts,
                "importance": 0,
                "currencies": "0",
            },
            headers={
                "User-Agent": "Mozilla/5.0 MarketIntelligenceDashboard/1.0",
                "X-Requested-With": "XMLHttpRequest",
                "Referer": "https://www.mql5.com/en/economic-calendar",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        if not isinstance(data, list):
            return []
        events: list[EconomicEvent] = []
        for idx, e in enumerate(data):
            imp_raw = (e.get("Importance") or "low").lower()
            if imp_raw == "none":
                imp_raw = "low"
            currency = e.get("CurrencyCode") or ""
            country_name = e.get("CountryName") or CURRENCY_LABEL.get(currency, currency or "Global")
            events.append(
                {
                    "id": f"td-{e.get('Id', idx)}",
                    "date": e.get("FullDate"),
                    "country": country_name,
                    "event": e.get("EventName") or "Economic event",
                    "importance": _impact_to_importance(imp_raw),
                    "previous": e.get("PreviousValue") or None,
                    "forecast": e.get("ForecastValue") or None,
                    "actual": e.get("ActualValue") or None,
                }
            )
        return events
    except Exception:
        logger.warn("Tradays/MQL5 calendar failed")
        return []


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def get_economic_calendar() -> list[EconomicEvent]:
    async def produce() -> list[EconomicEvent]:
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            finnhub = await _fetch_finnhub(client)
            if finnhub:
                merged = finnhub
            else:
                ff = await _fetch_forex_factory(client)
                if ff:
                    merged = ff
                else:
                    merged = await _fetch_tradays(client)

        merged = [e for e in merged if e.get("date")]
        merged.sort(key=lambda e: e["date"])
        return merged

    return await cached("calendar:economic", 60 * 60, produce)
