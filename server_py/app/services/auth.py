"""Auth service (mirrors server/src/services/auth.ts)."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import conflict, unauthorized
from app.models import User
from app.security import hash_password, sign_token, verify_password


def _to_public(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "createdAt": user.created_at.isoformat(),
    }


async def _find_by_email(session: AsyncSession, email: str) -> User | None:
    return (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()


async def register(
    session: AsyncSession, email: str, password: str, name: str | None
) -> dict[str, Any]:
    if await _find_by_email(session, email):
        raise conflict("An account with this email already exists")

    user = User(email=email, password_hash=hash_password(password), name=name)
    session.add(user)
    await session.commit()
    await session.refresh(user)

    token = sign_token(user.id, user.email)
    return {"token": token, "user": _to_public(user)}


async def login(session: AsyncSession, email: str, password: str) -> dict[str, Any]:
    user = await _find_by_email(session, email)
    if not user:
        raise unauthorized("Invalid email or password")
    if not verify_password(password, user.password_hash):
        raise unauthorized("Invalid email or password")

    token = sign_token(user.id, user.email)
    return {"token": token, "user": _to_public(user)}


async def get_me(session: AsyncSession, user_id: str) -> dict[str, Any] | None:
    user = await session.get(User, user_id)
    return _to_public(user) if user else None
