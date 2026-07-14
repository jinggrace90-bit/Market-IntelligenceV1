"""Background jobs via APScheduler (mirrors server/src/jobs/index.ts, replacing node-cron)."""

from __future__ import annotations

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.db import SessionLocal
from app.logging_utils import logger
from app.services.economic_calendar import get_economic_calendar
from app.services.market_data import get_market_overview
from app.services.news import ingest_news
from app.services.sentiment import get_sentiment

_scheduler = AsyncIOScheduler()


async def _ingest_news_job() -> None:
    try:
        async with SessionLocal() as session:
            await ingest_news(session)
    except Exception as exc:  # noqa: BLE001
        logger.error("News job failed", repr(exc))


async def _warm_market_sentiment() -> None:
    try:
        await get_market_overview()
    except Exception:
        pass
    try:
        async with SessionLocal() as session:
            await get_sentiment(session)
    except Exception:
        pass


async def _warm_calendar() -> None:
    try:
        await get_economic_calendar()
    except Exception:
        pass


def start_jobs() -> None:
    """Schedule background refresh jobs and warm caches on boot."""
    # News every 5 minutes.
    _scheduler.add_job(_ingest_news_job, CronTrigger.from_crontab("*/5 * * * *"), id="news")
    # Warm market + sentiment caches every 3 minutes.
    _scheduler.add_job(
        _warm_market_sentiment, CronTrigger.from_crontab("*/3 * * * *"), id="warm"
    )
    # Refresh the economic calendar every 6 hours.
    _scheduler.add_job(_warm_calendar, CronTrigger.from_crontab("0 */6 * * *"), id="calendar")
    _scheduler.start()

    # Kick off an initial ingest + cache warm on startup (non-blocking).
    logger.info("Warming caches on boot…")
    _scheduler.add_job(_ingest_news_job, id="news-boot")
    _scheduler.add_job(_warm_market_sentiment, id="warm-boot")
    _scheduler.add_job(_warm_calendar, id="calendar-boot")


def stop_jobs() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
