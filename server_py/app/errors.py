"""HTTP error type + handlers that reproduce the TS error response shapes.

- HttpError          -> { "error": message, "details"?: details }
- validation (422)   -> 400 { "error": "Validation failed", "details": fieldErrors }
- 404 unknown route  -> { "error": "Route not found" }
- unhandled (500)    -> { "error": "Internal server error" }
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.logging_utils import logger


class HttpError(Exception):
    def __init__(self, status: int, message: str, details: Any = None) -> None:
        super().__init__(message)
        self.status = status
        self.message = message
        self.details = details


def bad_request(msg: str, details: Any = None) -> HttpError:
    return HttpError(400, msg, details)


def unauthorized(msg: str = "Unauthorized") -> HttpError:
    return HttpError(401, msg)


def not_found(msg: str = "Not found") -> HttpError:
    return HttpError(404, msg)


def conflict(msg: str) -> HttpError:
    return HttpError(409, msg)


def _field_errors(exc: RequestValidationError) -> dict[str, list[str]]:
    """Flatten pydantic errors to Zod-style ``{ field: [messages] }``."""
    out: dict[str, list[str]] = {}
    for err in exc.errors():
        loc = [str(p) for p in err.get("loc", []) if p not in ("body", "query", "path")]
        field = loc[-1] if loc else "_"
        out.setdefault(field, []).append(err.get("msg", "Invalid value"))
    return out


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HttpError)
    async def _http_error(_request: Request, exc: HttpError) -> JSONResponse:
        body: dict[str, Any] = {"error": exc.message}
        if exc.details is not None:
            body["details"] = exc.details
        return JSONResponse(status_code=exc.status, content=body)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content={"error": "Validation failed", "details": _field_errors(exc)},
        )

    @app.exception_handler(StarletteHTTPException)
    async def _starlette_error(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        if exc.status_code == 404:
            return JSONResponse(status_code=404, content={"error": "Route not found"})
        detail = exc.detail if isinstance(exc.detail, str) else "Error"
        return JSONResponse(status_code=exc.status_code, content={"error": detail})

    @app.exception_handler(Exception)
    async def _unhandled(_request: Request, exc: Exception) -> JSONResponse:
        logger.error("Unhandled error", repr(exc))
        return JSONResponse(status_code=500, content={"error": "Internal server error"})
