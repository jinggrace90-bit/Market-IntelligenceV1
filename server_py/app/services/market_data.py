"""Market data via yfinance (mirrors server/src/services/marketData.ts).

Resilient by design: upstream throttling/failure degrades to empty results
rather than erroring, so the dashboard keeps rendering.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Any

import yfinance as yf

from app.cache import cached
from app.logging_utils import logger
from app.symbols import MARKET_SYMBOL_LIST, NAME_BY_SYMBOL

Quote = dict[str, Any]
SparklinePoint = dict[str, float]
MarketCard = dict[str, Any]


def _num(value: Any) -> float | None:
    try:
        if value is None:
            return None
        f = float(value)
        return f if f == f else None  # drop NaN
    except (TypeError, ValueError):
        return None


def _to_quote(symbol: str, fast_info: Any) -> Quote:
    meta = NAME_BY_SYMBOL.get(symbol)
    price = _num(getattr(fast_info, "last_price", None)) or 0.0
    prev = _num(getattr(fast_info, "previous_close", None))
    prev = prev if prev is not None else price
    change = price - prev
    change_percent = (change / prev * 100) if prev else 0.0
    currency = getattr(fast_info, "currency", None)
    return {
        "symbol": symbol,
        "name": meta["name"] if meta else symbol,
        "group": meta["group"] if meta else None,
        "price": price,
        "change": change,
        "changePercent": change_percent,
        "previousClose": prev,
        "currency": currency,
        "marketState": None,
        "updatedAt": datetime.now(UTC).isoformat(),
    }


def _fetch_quotes_sync(symbols: list[str]) -> list[Quote]:
    tickers = yf.Tickers(" ".join(symbols))
    out: list[Quote] = []
    for sym in symbols:
        try:
            ticker = tickers.tickers.get(sym) or yf.Ticker(sym)
            out.append(_to_quote(sym, ticker.fast_info))
        except Exception:
            logger.warn(f"Quote failed for {sym}")
    return out


async def get_quotes(symbols: list[str]) -> list[Quote]:
    """Live quotes for arbitrary symbols. Cached 15s to stay under rate limits."""
    if not symbols:
        return []
    key = "quotes:" + ",".join(sorted(symbols))
    return await cached(
        key, 15, lambda: asyncio.to_thread(_fetch_quotes_sync, symbols), cache_empty=False
    )


def _fetch_sparkline_sync(symbol: str) -> list[SparklinePoint]:
    try:
        hist = yf.Ticker(symbol).history(period="2d", interval="15m", auto_adjust=False)
        points: list[SparklinePoint] = []
        for ts, close in zip(hist.index, hist["Close"], strict=False):
            c = _num(close)
            if c is None:
                continue
            points.append({"t": int(ts.timestamp() * 1000), "c": c})
        return points
    except Exception:
        logger.warn(f"Sparkline failed for {symbol}")
        return []


async def get_sparkline(symbol: str) -> list[SparklinePoint]:
    """Intraday sparkline (2-day window, 15-minute candles). Cached 60s."""
    key = f"spark:{symbol}"
    return await cached(
        key, 60, lambda: asyncio.to_thread(_fetch_sparkline_sync, symbol), cache_empty=False
    )


async def get_market_overview() -> list[MarketCard]:
    """Quote + sparkline for every tracked symbol, in configured display order."""
    try:
        quotes = await get_quotes(MARKET_SYMBOL_LIST)
    except Exception:
        logger.warn("Market overview quotes failed (provider throttled?) — returning empty set")
        return []

    sparks = await asyncio.gather(*(get_sparkline(q["symbol"]) for q in quotes))
    by_symbol: dict[str, MarketCard] = {}
    for quote, spark in zip(quotes, sparks, strict=False):
        by_symbol[quote["symbol"]] = {**quote, "spark": spark}

    return [by_symbol[s] for s in MARKET_SYMBOL_LIST if s in by_symbol]
