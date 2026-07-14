"""Watchlist routes (all require auth): /api/watchlist ..."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.deps import require_auth
from app.schemas import ReorderBody, WatchlistAddBody
from app.services import watchlist as service

router = APIRouter(prefix="/watchlist")


@router.get("")
async def list_watchlist(
    user_id: str = Depends(require_auth), session: AsyncSession = Depends(get_session)
) -> dict:
    return {"data": await service.get_watchlist(session, user_id)}


@router.post("")
async def add(
    body: WatchlistAddBody,
    user_id: str = Depends(require_auth),
    session: AsyncSession = Depends(get_session),
) -> JSONResponse:
    item = await service.add_to_watchlist(
        session, user_id, body.symbol, body.name, body.asset_type
    )
    return JSONResponse(status_code=201, content={"data": item})


@router.put("/reorder")
async def reorder(
    body: ReorderBody,
    user_id: str = Depends(require_auth),
    session: AsyncSession = Depends(get_session),
) -> dict:
    await service.reorder_watchlist(session, user_id, body.ordered_ids)
    return {"ok": True}


@router.delete("/{item_id}")
async def remove(
    item_id: str,
    user_id: str = Depends(require_auth),
    session: AsyncSession = Depends(get_session),
) -> Response:
    await service.remove_from_watchlist(session, user_id, item_id)
    return Response(status_code=204)
