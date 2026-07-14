"""Canonical market-overview instruments (mirrors server/src/config/symbols.ts).

Yahoo Finance symbols require no API key. ``^`` = index, ``=F`` = futures,
``-USD`` = crypto, ``DX-Y.NYB`` = dollar index.
"""

from __future__ import annotations

from typing import TypedDict


class MarketSymbol(TypedDict):
    symbol: str
    name: str
    group: str  # index | commodity | crypto | rates | fx


MARKET_SYMBOLS: list[MarketSymbol] = [
    {"symbol": "^GSPC", "name": "S&P 500", "group": "index"},
    {"symbol": "^IXIC", "name": "NASDAQ Composite", "group": "index"},
    {"symbol": "^DJI", "name": "Dow Jones", "group": "index"},
    {"symbol": "^RUT", "name": "Russell 2000", "group": "index"},
    {"symbol": "^VIX", "name": "VIX Volatility", "group": "index"},
    {"symbol": "DX-Y.NYB", "name": "US Dollar Index (DXY)", "group": "fx"},
    {"symbol": "GC=F", "name": "Gold", "group": "commodity"},
    {"symbol": "SI=F", "name": "Silver", "group": "commodity"},
    {"symbol": "CL=F", "name": "Crude Oil (WTI)", "group": "commodity"},
    {"symbol": "BZ=F", "name": "Brent Oil", "group": "commodity"},
    {"symbol": "BTC-USD", "name": "Bitcoin", "group": "crypto"},
    {"symbol": "ETH-USD", "name": "Ethereum", "group": "crypto"},
    {"symbol": "^TNX", "name": "US 10Y Treasury Yield", "group": "rates"},
    {"symbol": "^FVX", "name": "US 5Y Treasury Yield", "group": "rates"},
    {"symbol": "^IRX", "name": "US 13W T-Bill Yield", "group": "rates"},
]

MARKET_SYMBOL_LIST: list[str] = [s["symbol"] for s in MARKET_SYMBOLS]
NAME_BY_SYMBOL: dict[str, MarketSymbol] = {s["symbol"]: s for s in MARKET_SYMBOLS}
