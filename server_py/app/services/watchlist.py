"""Watchlist service (mirrors server/src/services/watchlist.ts)."""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import not_found
from app.models import WatchlistItem
from app.services.market_data import get_quotes


def _to_raw(item: WatchlistItem) -> dict[str, Any]:
    return {
        "id": item.id,
        "userId": item.user_id,
        "symbol": item.symbol,
        "name": item.name,
        "assetType": item.asset_type,
        "position": item.position,
        "createdAt": item.created_at.isoformat(),
    }


async def get_watchlist(session: AsyncSession, user_id: str) -> list[dict[str, Any]]:
    items = list(
        (
            await session.execute(
                select(WatchlistItem)
                .where(WatchlistItem.user_id == user_id)
                .order_by(WatchlistItem.position.asc())
            )
        )
        .scalars()
        .all()
    )
    if not items:
        return []

    quotes = await get_quotes([i.symbol for i in items])
    quote_by_symbol = {q["symbol"]: q for q in quotes}

    return [
        {
            "id": i.id,
            "symbol": i.symbol,
            "name": i.name,
            "assetType": i.asset_type,
            "position": i.position,
            "quote": quote_by_symbol.get(i.symbol),
        }
        for i in items
    ]


async def add_to_watchlist(
    session: AsyncSession,
    user_id: str,
    symbol: str,
    name: str | None = None,
    asset_type: str | None = None,
) -> dict[str, Any]:
    upper = symbol.upper()
    existing = (
        await session.execute(
            select(WatchlistItem).where(
                WatchlistItem.user_id == user_id, WatchlistItem.symbol == upper
            )
        )
    ).scalar_one_or_none()

    if existing:
        if name is not None:
            existing.name = name
        if asset_type is not None:
            existing.asset_type = asset_type
        await session.commit()
        await session.refresh(existing)
        return _to_raw(existing)

    count = (
        await session.execute(
            select(func.count()).select_from(WatchlistItem).where(WatchlistItem.user_id == user_id)
        )
    ).scalar_one()

    item = WatchlistItem(
        user_id=user_id,
        symbol=upper,
        name=name,
        asset_type=asset_type or "stock",
        position=count,
    )
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return _to_raw(item)


async def remove_from_watchlist(session: AsyncSession, user_id: str, item_id: str) -> None:
    item = (
        await session.execute(
            select(WatchlistItem).where(
                WatchlistItem.id == item_id, WatchlistItem.user_id == user_id
            )
        )
    ).scalar_one_or_none()
    if not item:
        raise not_found("Watchlist item not found")
    await session.delete(item)
    await session.commit()


async def reorder_watchlist(session: AsyncSession, user_id: str, ordered_ids: list[str]) -> None:
    """Persist a new ordering. ``ordered_ids`` is the full list in display order."""
    for index, item_id in enumerate(ordered_ids):
        await session.execute(
            update(WatchlistItem)
            .where(WatchlistItem.id == item_id, WatchlistItem.user_id == user_id)
            .values(position=index)
        )
    await session.commit()
