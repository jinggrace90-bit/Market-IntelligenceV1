"""News ingestion + cursor-paginated feed (mirrors server/src/services/news.ts)."""

from __future__ import annotations

import asyncio
import hashlib
import re
from datetime import UTC, datetime
from typing import Any

import feedparser
import httpx
from sqlalchemy import or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.ids import cuid
from app.logging_utils import logger
from app.models import NewsArticle
from app.services.news_sources import (
    ASSET_DICTIONARY,
    IMPORTANCE_KEYWORDS,
    RSS_FEEDS,
    FeedSource,
)

NewsItem = dict[str, Any]

_USER_AGENT = "MarketIntelligenceDashboard/1.0 (+rss)"
_TAG_RE = re.compile(r"<[^>]*>")
_ENTITY_RE = re.compile(r"&[a-z]+;", re.IGNORECASE)
_WS_RE = re.compile(r"\s+")


def _hash_url(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()


def _strip_html(value: str | None) -> str:
    if not value:
        return ""
    out = _TAG_RE.sub(" ", value)
    out = _ENTITY_RE.sub(" ", out)
    return _WS_RE.sub(" ", out).strip()


def _score_importance(text: str, published_at: datetime) -> int:
    lower = text.lower()
    score = 0
    for kw, weight in IMPORTANCE_KEYWORDS.items():
        if kw in lower:
            score += weight
    age_hours = (datetime.now(UTC) - published_at).total_seconds() / 3600
    if age_hours < 1:
        score += 15
    elif age_hours < 3:
        score += 10
    elif age_hours < 6:
        score += 5
    return min(100, score)


def _extract_assets(text: str) -> list[str]:
    lower = text.lower()
    found: list[str] = []
    for phrase, symbol in ASSET_DICTIONARY.items():
        if phrase in lower and symbol not in found:
            found.append(symbol)
    return found[:6]


def _parse_published(entry: Any) -> datetime:
    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if parsed:
        return datetime(*parsed[:6], tzinfo=UTC)
    return datetime.now(UTC)


def _entry_image(entry: Any) -> str | None:
    enclosures = entry.get("enclosures") or []
    if enclosures and enclosures[0].get("href"):
        return enclosures[0]["href"]
    media = entry.get("media_content") or []
    if media and media[0].get("url"):
        return media[0]["url"]
    thumb = entry.get("media_thumbnail") or []
    if thumb and thumb[0].get("url"):
        return thumb[0]["url"]
    return None


async def _fetch_feed(client: httpx.AsyncClient, feed: FeedSource) -> list[dict[str, Any]]:
    try:
        resp = await client.get(feed["url"], headers={"User-Agent": _USER_AGENT})
        resp.raise_for_status()
        parsed = feedparser.parse(resp.content)
        items: list[dict[str, Any]] = []
        for entry in parsed.entries:
            link = entry.get("link")
            title = entry.get("title")
            if not link or not title:
                continue
            summary = _strip_html(
                entry.get("summary") or entry.get("description") or entry.get("content", "")
            )
            categories = entry.get("tags") or []
            category = categories[0].get("term") if categories else feed["category"]
            items.append(
                {
                    "title": title.strip(),
                    "url": link,
                    "source": feed["name"],
                    "category": category or feed["category"],
                    "country": feed["country"],
                    "summary": summary,
                    "imageUrl": _entry_image(entry),
                    "publishedAt": _parse_published(entry),
                }
            )
        return items
    except Exception:
        logger.warn(f"Feed failed: {feed['name']}")
        return []


async def _fetch_news_api(client: httpx.AsyncClient) -> list[dict[str, Any]]:
    if not settings.news_api_key:
        return []
    try:
        resp = await client.get(
            "https://newsapi.org/v2/top-headlines",
            params={"category": "business", "language": "en", "pageSize": 50},
            headers={"X-Api-Key": settings.news_api_key},
        )
        resp.raise_for_status()
        data = resp.json()
        out: list[dict[str, Any]] = []
        for a in data.get("articles", []):
            if not a.get("url") or not a.get("title"):
                continue
            published = a.get("publishedAt")
            try:
                published_at = (
                    datetime.fromisoformat(published.replace("Z", "+00:00"))
                    if published
                    else datetime.now(UTC)
                )
            except ValueError:
                published_at = datetime.now(UTC)
            out.append(
                {
                    "title": a["title"],
                    "url": a["url"],
                    "source": (a.get("source") or {}).get("name") or "NewsAPI",
                    "category": "business",
                    "country": "US",
                    "summary": _strip_html(a.get("description")),
                    "imageUrl": a.get("urlToImage"),
                    "publishedAt": published_at,
                }
            )
        return out
    except Exception:
        logger.warn("NewsAPI fetch failed")
        return []


async def ingest_news(session: AsyncSession) -> int:
    """Fetch every source, score + dedupe, upsert into Postgres. Returns new-row count."""
    async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
        batches = await asyncio.gather(
            *[_fetch_feed(client, feed) for feed in RSS_FEEDS],
            _fetch_news_api(client),
        )

    by_id: dict[str, dict[str, Any]] = {}
    for batch in batches:
        for item in batch:
            if not item.get("title") or not item.get("url"):
                continue
            by_id[_hash_url(item["url"])] = item

    if not by_id:
        logger.info("News ingest: 0 items seen, ~0 new")
        return 0

    rows = []
    for external_id, item in by_id.items():
        text = f"{item['title']} {item['summary']}"
        rows.append(
            {
                "id": cuid(),
                "external_id": external_id,
                "title": item["title"],
                "url": item["url"],
                "source": item["source"],
                "category": item["category"],
                "country": item["country"],
                "image_url": item["imageUrl"],
                "summary": item["summary"] or None,
                "published_at": item["publishedAt"],
                "related_assets": _extract_assets(text),
                "importance": _score_importance(text, item["publishedAt"]),
            }
        )

    stmt = (
        pg_insert(NewsArticle)
        .values(rows)
        .on_conflict_do_nothing(index_elements=[NewsArticle.external_id])
        .returning(NewsArticle.id)
    )
    result = await session.execute(stmt)
    inserted = len(result.fetchall())
    await session.commit()

    logger.info(f"News ingest: {len(by_id)} items seen, ~{inserted} new")
    return inserted


def _to_item(a: NewsArticle) -> NewsItem:
    return {
        "id": a.id,
        "externalId": a.external_id,
        "title": a.title,
        "url": a.url,
        "source": a.source,
        "category": a.category,
        "country": a.country,
        "imageUrl": a.image_url,
        "summary": a.summary,
        "publishedAt": a.published_at.isoformat(),
        "relatedAssets": list(a.related_assets or []),
        "importance": a.importance,
    }


async def get_news(
    session: AsyncSession,
    *,
    cursor: str | None = None,
    limit: int | None = None,
    category: str | None = None,
    country: str | None = None,
    search: str | None = None,
    min_importance: int | None = None,
) -> dict[str, Any]:
    """Cursor-paginated news feed for infinite scroll (newest first)."""
    take = min(limit or 20, 50)
    stmt = select(NewsArticle)
    if category:
        stmt = stmt.where(NewsArticle.category == category)
    if country:
        stmt = stmt.where(NewsArticle.country == country)
    if min_importance:
        stmt = stmt.where(NewsArticle.importance >= min_importance)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(NewsArticle.title.ilike(pattern), NewsArticle.summary.ilike(pattern))
        )

    # Keyset pagination on (publishedAt desc, id desc); cursor stays an opaque id.
    if cursor:
        anchor = await session.get(NewsArticle, cursor)
        if anchor is not None:
            stmt = stmt.where(
                or_(
                    NewsArticle.published_at < anchor.published_at,
                    (NewsArticle.published_at == anchor.published_at)
                    & (NewsArticle.id < anchor.id),
                )
            )

    stmt = stmt.order_by(NewsArticle.published_at.desc(), NewsArticle.id.desc()).limit(take + 1)
    rows = list((await session.execute(stmt)).scalars().all())

    has_more = len(rows) > take
    page = rows[:take] if has_more else rows
    return {
        "items": [_to_item(a) for a in page],
        "nextCursor": page[-1].id if has_more else None,
    }


async def get_article_by_id(session: AsyncSession, article_id: str) -> NewsArticle | None:
    stmt = (
        select(NewsArticle)
        .where(NewsArticle.id == article_id)
        .options(selectinload(NewsArticle.analysis))
    )
    return (await session.execute(stmt)).scalar_one_or_none()
