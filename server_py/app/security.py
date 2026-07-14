"""JWT signing/verification + password hashing.

Token format matches the TS server so the existing frontend works unchanged:
HS256, payload ``{ "sub": userId, "email": email, "exp": ... }``.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from passlib.context import CryptContext

from app.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

_DURATION_RE = re.compile(r"^\s*(\d+)\s*([smhdw]?)\s*$", re.IGNORECASE)
_UNIT_SECONDS = {"s": 1, "m": 60, "h": 3600, "d": 86400, "w": 604800}


def _expires_in_seconds(value: str) -> int:
    """Parse a ``7d`` / ``24h`` / ``3600`` style duration into seconds."""
    match = _DURATION_RE.match(value)
    if not match:
        return 7 * 86400
    amount = int(match.group(1))
    unit = (match.group(2) or "s").lower()
    return amount * _UNIT_SECONDS.get(unit, 1)


def sign_token(sub: str, email: str) -> str:
    now = datetime.now(UTC)
    expires = now + timedelta(seconds=_expires_in_seconds(settings.jwt_expires_in))
    payload = {
        "sub": sub,
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def verify_token(token: str) -> dict[str, Any]:
    """Decode and verify a token, returning its payload. Raises on failure."""
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])


# bcrypt operates on the first 72 bytes; match bcryptjs behaviour explicitly.
def hash_password(password: str) -> str:
    return _pwd_context.hash(password[:72])


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _pwd_context.verify(password[:72], password_hash)
    except Exception:
        return False
