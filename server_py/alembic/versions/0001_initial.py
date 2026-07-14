"""initial schema — users, watchlist_items, news_articles, news_analyses

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-14
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("passwordHash", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("createdAt", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updatedAt", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_unique_constraint("users_email_key", "users", ["email"])

    op.create_table(
        "watchlist_items",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("userId", sa.String(), nullable=False),
        sa.Column("symbol", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("assetType", sa.String(), server_default="stock", nullable=False),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        sa.Column("createdAt", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["userId"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_unique_constraint(
        "watchlist_items_userId_symbol_key", "watchlist_items", ["userId", "symbol"]
    )
    op.create_index("watchlist_items_userId_idx", "watchlist_items", ["userId"])

    op.create_table(
        "news_articles",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("externalId", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("url", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("country", sa.String(), nullable=True),
        sa.Column("imageUrl", sa.String(), nullable=True),
        sa.Column("summary", sa.String(), nullable=True),
        sa.Column("publishedAt", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "relatedAssets",
            postgresql.ARRAY(sa.String()),
            server_default="{}",
            nullable=False,
        ),
        sa.Column("importance", sa.Integer(), server_default="0", nullable=False),
        sa.Column("createdAt", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_unique_constraint("news_articles_externalId_key", "news_articles", ["externalId"])
    op.create_index("news_articles_publishedAt_idx", "news_articles", ["publishedAt"])
    op.create_index("news_articles_category_idx", "news_articles", ["category"])

    op.create_table(
        "news_analyses",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("articleId", sa.String(), nullable=False),
        sa.Column("summary", sa.String(), nullable=False),
        sa.Column("keyEvents", postgresql.ARRAY(sa.String()), server_default="{}", nullable=False),
        sa.Column("sentiment", sa.String(), nullable=False),
        sa.Column("sentimentScore", sa.Float(), server_default="0", nullable=False),
        sa.Column("affectedSectors", postgresql.ARRAY(sa.String()), server_default="{}", nullable=False),
        sa.Column("affectedAssets", postgresql.ARRAY(sa.String()), server_default="{}", nullable=False),
        sa.Column("marketImplication", sa.String(), nullable=False),
        sa.Column("model", sa.String(), nullable=False),
        sa.Column("createdAt", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["articleId"], ["news_articles.id"], ondelete="CASCADE"),
    )
    op.create_unique_constraint("news_analyses_articleId_key", "news_analyses", ["articleId"])


def downgrade() -> None:
    op.drop_table("news_analyses")
    op.drop_table("news_articles")
    op.drop_table("watchlist_items")
    op.drop_table("users")
