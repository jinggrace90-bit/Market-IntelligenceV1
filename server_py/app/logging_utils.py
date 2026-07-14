"""Minimal structured logger (mirrors server/src/utils/logger.ts)."""

from __future__ import annotations

import sys
from datetime import UTC, datetime
from typing import Any

from app.config import settings


def _emit(level: str, msg: str, meta: Any = None) -> None:
    ts = datetime.now(UTC).isoformat()
    line = f"[{ts}] {level.upper()} {msg}"
    stream = sys.stderr if level in ("error", "warn") else sys.stdout
    if meta is None:
        print(line, file=stream)
    else:
        print(line, meta, file=stream)


class _Logger:
    def info(self, msg: str, meta: Any = None) -> None:
        _emit("info", msg, meta)

    def warn(self, msg: str, meta: Any = None) -> None:
        _emit("warn", msg, meta)

    def error(self, msg: str, meta: Any = None) -> None:
        _emit("error", msg, meta)

    def debug(self, msg: str, meta: Any = None) -> None:
        if not settings.is_prod:
            _emit("debug", msg, meta)


logger = _Logger()
