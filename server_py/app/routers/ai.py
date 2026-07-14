"""AI routes: /api/ai/status|news/:articleId|macro."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.deps import require_auth
from app.schemas import MacroBody
from app.services import ai as ai_service

router = APIRouter(prefix="/ai")


@router.get("/status")
async def status() -> dict:
    return {"configured": ai_service.ai_configured()}


@router.post("/news/{article_id}")
async def analyze_news(
    article_id: str,
    force: str | None = Query(default=None),
    _user_id: str = Depends(require_auth),
    session: AsyncSession = Depends(get_session),
) -> dict:
    return await ai_service.analyze_article(session, article_id, force == "true")


@router.post("/macro")
async def analyze_macro(
    body: MacroBody, _user_id: str = Depends(require_auth)
) -> dict:
    return await ai_service.analyze_macro(body.scenario)
