"""Auth dependency (mirrors server/src/middleware/auth.ts)."""

from __future__ import annotations

from fastapi import Header

from app.errors import unauthorized
from app.security import verify_token


async def require_auth(authorization: str | None = Header(default=None)) -> str:
    """Return the authenticated user's id, or raise 401."""
    if not authorization or not authorization.startswith("Bearer "):
        raise unauthorized("Missing bearer token")
    try:
        payload = verify_token(authorization[7:])
    except Exception as exc:  # noqa: BLE001 — any decode failure is a 401
        raise unauthorized("Invalid or expired token") from exc
    sub = payload.get("sub")
    if not sub:
        raise unauthorized("Invalid or expired token")
    return sub
