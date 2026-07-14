"""Market routes: /api/market/overview|quotes|spark/:symbol."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.errors import bad_request
from app.services import market_data

router = APIRouter(prefix="/market")


@router.get("/overview")
async def overview() -> dict:
    return {"data": await market_data.get_market_overview()}


@router.get("/quotes")
async def quotes(symbols: str = Query(default="")) -> dict:
    raw = symbols.strip()
    if not raw:
        raise bad_request("Provide ?symbols=AAPL,MSFT")
    parsed = [s.strip().upper() for s in raw.split(",") if s.strip()]
    return {"data": await market_data.get_quotes(parsed)}


@router.get("/spark/{symbol}")
async def spark(symbol: str) -> dict:
    return {"data": await market_data.get_sparkline(symbol)}
