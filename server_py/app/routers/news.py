"""News routes: /api/news (cursor-paginated) + /api/news/refresh."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.services import news as news_service

router = APIRouter(prefix="/news")


@router.get("")
async def list_news(
    session: AsyncSession = Depends(get_session),
    cursor: str | None = Query(default=None),
    limit: int | None = Query(default=None, ge=1, le=50),
    category: str | None = Query(default=None),
    country: str | None = Query(default=None),
    search: str | None = Query(default=None),
    minImportance: int | None = Query(default=None, ge=0, le=100),  # noqa: N803 — public API name
) -> dict:
    return await news_service.get_news(
        session,
        cursor=cursor,
        limit=limit,
        category=category,
        country=country,
        search=search,
        min_importance=minImportance,
    )


@router.post("/refresh")
async def refresh(session: AsyncSession = Depends(get_session)) -> dict:
    inserted = await news_service.ingest_news(session)
    return {"inserted": inserted}
