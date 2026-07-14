"""Auth routes: /api/auth/register|login|me."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.deps import require_auth
from app.errors import unauthorized
from app.schemas import LoginBody, RegisterBody
from app.services import auth as auth_service

router = APIRouter(prefix="/auth")


@router.post("/register")
async def register(
    body: RegisterBody, session: AsyncSession = Depends(get_session)
) -> JSONResponse:
    result = await auth_service.register(
        session, body.email.lower(), body.password, body.name
    )
    return JSONResponse(status_code=201, content=result)


@router.post("/login")
async def login(body: LoginBody, session: AsyncSession = Depends(get_session)) -> dict:
    return await auth_service.login(session, body.email.lower(), body.password)


@router.get("/me")
async def me(
    user_id: str = Depends(require_auth), session: AsyncSession = Depends(get_session)
) -> dict:
    user = await auth_service.get_me(session, user_id)
    if not user:
        raise unauthorized()
    return {"user": user}
