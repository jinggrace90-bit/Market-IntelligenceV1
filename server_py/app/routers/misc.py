"""Sentiment, calendar, and search routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.errors import bad_request
from app.services import search as search_service
from app.services.economic_calendar import get_economic_calendar
from app.services.sentiment import get_sentiment

sentiment_router = APIRouter(prefix="/sentiment")
calendar_router = APIRouter(prefix="/calendar")
search_router = APIRouter(prefix="/search")


@sentiment_router.get("")
async def sentiment(session: AsyncSession = Depends(get_session)) -> dict:
    return {"data": await get_sentiment(session)}


@calendar_router.get("")
async def calendar(
    country: str | None = Query(default=None),
    importance: str | None = Query(default=None),
) -> dict:
    events = await get_economic_calendar()
    if country:
        events = [e for e in events if e["country"] == country]
    if importance:
        events = [e for e in events if e["importance"] == importance]
    return {"data": events}


@search_router.get("")
async def search(
    q: str = Query(default=""), session: AsyncSession = Depends(get_session)
) -> dict:
    query = q.strip()
    if not query:
        raise bad_request("Provide ?q=")
    return {"data": await search_service.global_search(session, query)}
