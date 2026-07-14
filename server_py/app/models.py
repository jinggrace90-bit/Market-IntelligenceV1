"""SQLAlchemy models mirroring server/prisma/schema.prisma.

Table names and (camelCase) column names match what Prisma generates, so these
models are a drop-in for the same physical Postgres database.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    ARRAY,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.ids import cuid


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column("passwordHash", String, nullable=False)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updatedAt",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    watchlist: Mapped[list[WatchlistItem]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"
    __table_args__ = (
        UniqueConstraint("userId", "symbol", name="watchlist_items_userId_symbol_key"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    user_id: Mapped[str] = mapped_column(
        "userId", String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    symbol: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    asset_type: Mapped[str] = mapped_column(
        "assetType", String, nullable=False, server_default="stock"
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship(back_populates="watchlist")


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    external_id: Mapped[str] = mapped_column("externalId", String, unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    country: Mapped[str | None] = mapped_column(String, nullable=True)
    image_url: Mapped[str | None] = mapped_column("imageUrl", String, nullable=True)
    summary: Mapped[str | None] = mapped_column(String, nullable=True)
    published_at: Mapped[datetime] = mapped_column(
        "publishedAt", DateTime(timezone=True), nullable=False, index=True
    )
    related_assets: Mapped[list[str]] = mapped_column(
        "relatedAssets", ARRAY(String), nullable=False, server_default="{}"
    )
    importance: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    analysis: Mapped[NewsAnalysis | None] = relationship(
        back_populates="article", cascade="all, delete-orphan", uselist=False
    )


class NewsAnalysis(Base):
    __tablename__ = "news_analyses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    article_id: Mapped[str] = mapped_column(
        "articleId",
        String,
        ForeignKey("news_articles.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    summary: Mapped[str] = mapped_column(String, nullable=False)
    key_events: Mapped[list[str]] = mapped_column(
        "keyEvents", ARRAY(String), nullable=False, server_default="{}"
    )
    sentiment: Mapped[str] = mapped_column(String, nullable=False)
    sentiment_score: Mapped[float] = mapped_column(
        "sentimentScore", Float, nullable=False, server_default="0"
    )
    affected_sectors: Mapped[list[str]] = mapped_column(
        "affectedSectors", ARRAY(String), nullable=False, server_default="{}"
    )
    affected_assets: Mapped[list[str]] = mapped_column(
        "affectedAssets", ARRAY(String), nullable=False, server_default="{}"
    )
    market_implication: Mapped[str] = mapped_column("marketImplication", String, nullable=False)
    model: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    article: Mapped[NewsArticle] = relationship(back_populates="analysis")
