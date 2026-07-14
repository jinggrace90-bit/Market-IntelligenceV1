"""AI news analysis + macro cause-and-effect chains (mirrors server/src/services/ai.ts).

Two providers are supported, selected by ``AI_PROVIDER``:
  - "anthropic" (default): Claude via tool-use, needs ANTHROPIC_API_KEY.
  - "local": any OpenAI-compatible server (e.g. Ollama) via JSON mode — free,
    no key needed, just a reachable server.

Results are cached in Postgres so tokens/compute are never re-spent. When
neither is configured/reachable, endpoints return a 503 rather than fake data.
"""

from __future__ import annotations

import json
from typing import Any

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.errors import HttpError
from app.logging_utils import logger
from app.models import NewsAnalysis
from app.services.news import get_article_by_id

_anthropic_client = (
    AsyncAnthropic(api_key=settings.anthropic_api_key) if settings.anthropic_api_key else None
)
# Works with any OpenAI-compatible server: a local one (Ollama, which ignores
# the key) or a free hosted API (Groq/Gemini, which needs LOCAL_AI_API_KEY).
_local_client = (
    AsyncOpenAI(base_url=settings.local_ai_base_url, api_key=settings.local_ai_api_key or "local")
    if settings.ai_provider == "local"
    else None
)


def ai_configured() -> bool:
    if settings.ai_provider == "local":
        return True
    return bool(settings.anthropic_api_key)


def _model_name() -> str:
    return settings.local_ai_model if settings.ai_provider == "local" else settings.anthropic_model


NEWS_TOOL: dict[str, Any] = {
    "name": "record_analysis",
    "description": "Record the structured market analysis of a news article.",
    "input_schema": {
        "type": "object",
        "properties": {
            "summary": {"type": "string", "description": "2-3 sentence neutral summary"},
            "keyEvents": {"type": "array", "items": {"type": "string"}, "description": "Key facts/events"},
            "sentiment": {"type": "string", "enum": ["bullish", "bearish", "neutral"]},
            "sentimentScore": {"type": "number", "description": "-1 (very bearish) to 1 (very bullish)"},
            "affectedSectors": {"type": "array", "items": {"type": "string"}},
            "affectedAssets": {"type": "array", "items": {"type": "string"}, "description": "Tickers or asset names"},
            "marketImplication": {"type": "string", "description": "Educational explanation of why this could move markets"},
        },
        "required": ["summary", "sentiment", "marketImplication"],
    },
}

SYSTEM_PROMPT = (
    "You are a markets analyst who helps retail investors build financial literacy.\n"
    "Analyze the news article neutrally. Do NOT give buy/sell recommendations or "
    "personalized financial advice.\n"
    "Explain macro cause-and-effect so the reader learns how markets work. "
    "Call record_analysis with your result."
)

LOCAL_NEWS_SYSTEM_PROMPT = (
    SYSTEM_PROMPT
    + "\n\nRespond with ONLY a single JSON object (no markdown, no commentary) matching this shape:\n"
    '{"summary": string, "keyEvents": string[], "sentiment": "bullish"|"bearish"|"neutral", '
    '"sentimentScore": number (-1 to 1), "affectedSectors": string[], "affectedAssets": string[], '
    '"marketImplication": string}'
)

MACRO_TOOL: dict[str, Any] = {
    "name": "record_macro_chain",
    "description": "Record a macro cause-and-effect chain.",
    "input_schema": {
        "type": "object",
        "properties": {
            "thesis": {"type": "string"},
            "chain": {
                "type": "array",
                "description": "Ordered cause -> effect nodes",
                "items": {
                    "type": "object",
                    "properties": {
                        "label": {"type": "string"},
                        "detail": {"type": "string"},
                        "direction": {"type": "string", "enum": ["up", "down", "neutral"]},
                    },
                    "required": ["label", "detail"],
                },
            },
        },
        "required": ["thesis", "chain"],
    },
}

MACRO_SYSTEM = (
    "You explain macroeconomic cause-and-effect for learners. Given a scenario, "
    "produce a chain of 3-6 linked effects across asset classes (rates, USD, gold, "
    "equities, bonds, crypto). Educational, not advice."
)

LOCAL_MACRO_SYSTEM = (
    MACRO_SYSTEM
    + "\n\nRespond with ONLY a single JSON object (no markdown, no commentary) matching this shape:\n"
    '{"thesis": string, "chain": [{"label": string, "detail": string, '
    '"direction": "up"|"down"|"neutral"}]}'
)


def _tool_use_input(message: Any, tool_name: str, err: str) -> dict[str, Any]:
    for block in message.content:
        if getattr(block, "type", None) == "tool_use" and block.name == tool_name:
            return dict(block.input)
    raise HttpError(502, err)


def _parse_json_content(content: str | None, err: str) -> dict[str, Any]:
    if not content:
        raise HttpError(502, err)
    text = content.strip()
    # Strip markdown code fences some local models add despite instructions.
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise HttpError(502, err) from exc
    if not isinstance(parsed, dict):
        raise HttpError(502, err)
    return parsed


def _normalize_analysis(raw: dict[str, Any]) -> dict[str, Any]:
    sentiment = raw.get("sentiment")
    if sentiment not in ("bullish", "bearish", "neutral"):
        sentiment = "neutral"
    try:
        score = float(raw.get("sentimentScore", 0) or 0)
    except (TypeError, ValueError):
        score = 0.0
    score = max(-1.0, min(1.0, score))
    return {
        "summary": str(raw.get("summary", "")),
        "keyEvents": list(raw.get("keyEvents") or []),
        "sentiment": sentiment,
        "sentimentScore": score,
        "affectedSectors": list(raw.get("affectedSectors") or []),
        "affectedAssets": list(raw.get("affectedAssets") or []),
        "marketImplication": str(raw.get("marketImplication", "")),
    }


def _normalize_macro(raw: dict[str, Any]) -> dict[str, Any]:
    chain = []
    for node in raw.get("chain") or []:
        if not isinstance(node, dict) or not node.get("label") or not node.get("detail"):
            continue
        direction = node.get("direction")
        if direction not in ("up", "down", "neutral"):
            direction = "neutral"
        chain.append(
            {"label": str(node["label"]), "detail": str(node["detail"]), "direction": direction}
        )
    return {"thesis": str(raw.get("thesis", "")), "chain": chain}


async def _run_analysis_anthropic(title: str, summary: str) -> dict[str, Any]:
    if not _anthropic_client:
        raise HttpError(503, "AI analysis unavailable: set ANTHROPIC_API_KEY")
    message = await _anthropic_client.messages.create(
        model=settings.anthropic_model,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        tools=[NEWS_TOOL],
        tool_choice={"type": "tool", "name": "record_analysis"},
        messages=[
            {
                "role": "user",
                "content": f"Headline: {title}\n\nSummary: {summary or '(no summary provided)'}",
            }
        ],
    )
    return _normalize_analysis(
        _tool_use_input(message, "record_analysis", "AI did not return structured analysis")
    )


async def _run_analysis_local(title: str, summary: str) -> dict[str, Any]:
    if not _local_client:
        raise HttpError(503, "AI analysis unavailable: local AI provider not configured")
    try:
        completion = await _local_client.chat.completions.create(
            model=settings.local_ai_model,
            max_tokens=1024,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": LOCAL_NEWS_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Headline: {title}\n\nSummary: {summary or '(no summary provided)'}",
                },
            ],
        )
    except Exception as exc:
        raise HttpError(
            503,
            f"AI analysis unavailable: local AI server not reachable at {settings.local_ai_base_url}",
        ) from exc
    content = completion.choices[0].message.content if completion.choices else None
    return _normalize_analysis(
        _parse_json_content(content, "AI did not return structured analysis")
    )


async def _run_analysis(title: str, summary: str) -> dict[str, Any]:
    if settings.ai_provider == "local":
        return await _run_analysis_local(title, summary)
    return await _run_analysis_anthropic(title, summary)


def _to_dto(a: NewsAnalysis) -> dict[str, Any]:
    return {
        "summary": a.summary,
        "keyEvents": list(a.key_events or []),
        "sentiment": a.sentiment,
        "sentimentScore": a.sentiment_score,
        "affectedSectors": list(a.affected_sectors or []),
        "affectedAssets": list(a.affected_assets or []),
        "marketImplication": a.market_implication,
        "model": a.model,
    }


async def analyze_article(
    session: AsyncSession, article_id: str, force: bool = False
) -> dict[str, Any]:
    article = await get_article_by_id(session, article_id)
    if not article:
        raise HttpError(404, "Article not found")

    existing = article.analysis
    if not force and existing:
        return {**_to_dto(existing), "cached": True}

    parsed = await _run_analysis(article.title, article.summary or "")
    model = _model_name()

    if existing:
        existing.model = model
        existing.summary = parsed["summary"]
        existing.key_events = parsed["keyEvents"]
        existing.sentiment = parsed["sentiment"]
        existing.sentiment_score = parsed["sentimentScore"]
        existing.affected_sectors = parsed["affectedSectors"]
        existing.affected_assets = parsed["affectedAssets"]
        existing.market_implication = parsed["marketImplication"]
        saved = existing
    else:
        saved = NewsAnalysis(
            article_id=article_id,
            model=model,
            summary=parsed["summary"],
            key_events=parsed["keyEvents"],
            sentiment=parsed["sentiment"],
            sentiment_score=parsed["sentimentScore"],
            affected_sectors=parsed["affectedSectors"],
            affected_assets=parsed["affectedAssets"],
            market_implication=parsed["marketImplication"],
        )
        session.add(saved)

    await session.commit()
    await session.refresh(saved)
    logger.info(f"AI analysis cached for article {article_id}")
    return {**_to_dto(saved), "cached": False}


async def _analyze_macro_anthropic(scenario: str) -> dict[str, Any]:
    if not _anthropic_client:
        raise HttpError(503, "AI analysis unavailable: set ANTHROPIC_API_KEY")
    message = await _anthropic_client.messages.create(
        model=settings.anthropic_model,
        max_tokens=1024,
        system=MACRO_SYSTEM,
        tools=[MACRO_TOOL],
        tool_choice={"type": "tool", "name": "record_macro_chain"},
        messages=[{"role": "user", "content": f"Scenario: {scenario}"}],
    )
    return _tool_use_input(message, "record_macro_chain", "AI did not return a macro chain")


async def _analyze_macro_local(scenario: str) -> dict[str, Any]:
    if not _local_client:
        raise HttpError(503, "AI analysis unavailable: local AI provider not configured")
    try:
        completion = await _local_client.chat.completions.create(
            model=settings.local_ai_model,
            max_tokens=1024,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": LOCAL_MACRO_SYSTEM},
                {"role": "user", "content": f"Scenario: {scenario}"},
            ],
        )
    except Exception as exc:
        raise HttpError(
            503,
            f"AI analysis unavailable: local AI server not reachable at {settings.local_ai_base_url}",
        ) from exc
    content = completion.choices[0].message.content if completion.choices else None
    return _normalize_macro(_parse_json_content(content, "AI did not return a macro chain"))


async def analyze_macro(scenario: str) -> dict[str, Any]:
    if settings.ai_provider == "local":
        return await _analyze_macro_local(scenario)
    return await _analyze_macro_anthropic(scenario)
