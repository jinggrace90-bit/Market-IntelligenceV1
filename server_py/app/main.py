"""FastAPI application + Socket.IO mount (mirrors server/src/index.ts)."""

from __future__ import annotations

from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.errors import register_error_handlers
from app.jobs import start_jobs, stop_jobs
from app.logging_utils import logger
from app.realtime import sio, start_broadcasters, stop_broadcasters
from app.routers.api import api_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Background ingestion + cache warming, plus realtime broadcasters.
    start_jobs()
    start_broadcasters()
    logger.info(f"API + WS listening on http://localhost:{settings.port}")
    yield
    await stop_broadcasters()
    stop_jobs()


app = FastAPI(title="Market Intelligence API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)


@app.get("/")
async def root() -> dict:
    return {"name": "Market Intelligence API", "docs": "/api/health"}


app.include_router(api_router)

# Wrap FastAPI with the Socket.IO ASGI app so both share one port/server.
# Lifespan events are forwarded to the FastAPI app by socketio.ASGIApp.
asgi = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path="socket.io")
