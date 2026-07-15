"""Async SQLAlchemy engine + session factory."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

# Managed Postgres providers (Neon, Supabase, Render, …) require TLS. asyncpg
# takes SSL as a connect arg rather than a URL query param, so translate it.
_connect_args: dict = {"ssl": "require"} if settings.db_requires_ssl else {}

engine = create_async_engine(
    settings.sqlalchemy_url,
    echo=False,
    pool_pre_ping=True,
    connect_args=_connect_args,
)

SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding a request-scoped async session."""
    async with SessionLocal() as session:
        yield session
