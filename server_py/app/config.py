"""Application settings loaded from the environment (mirrors server/src/config/env.ts).

The app runs with ZERO keys configured — optional provider keys just unlock extras.
An empty string means "not configured".
"""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    node_env: str = Field(default="development", alias="NODE_ENV")
    port: int = Field(default=4000, alias="PORT")

    database_url: str = Field(
        default="postgresql://mid:mid_password@localhost:5432/market_intelligence?schema=public",
        alias="DATABASE_URL",
    )
    redis_url: str = Field(default="redis://localhost:6379", alias="REDIS_URL")

    jwt_secret: str = Field(default="dev_secret_change_me", alias="JWT_SECRET")
    jwt_expires_in: str = Field(default="7d", alias="JWT_EXPIRES_IN")
    # Comma-separated list of allowed browser origins. In production set this to
    # your deployed frontend URL(s), e.g. "https://my-app.vercel.app". Multiple
    # origins (production + custom domain) can be separated with commas.
    cors_origin: str = Field(default="http://localhost:3000", alias="CORS_ORIGIN")

    # Optional provider keys — empty string means "not configured".
    finnhub_api_key: str = Field(default="", alias="FINNHUB_API_KEY")
    news_api_key: str = Field(default="", alias="NEWSAPI_KEY")
    alpha_vantage_api_key: str = Field(default="", alias="ALPHAVANTAGE_API_KEY")
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    anthropic_model: str = Field(default="claude-haiku-4-5-20251001", alias="ANTHROPIC_MODEL")

    # AI provider: "anthropic" (needs ANTHROPIC_API_KEY) or "local" (any
    # OpenAI-compatible server — a local one like Ollama, OR a free cloud API
    # like Groq / Gemini). LOCAL_AI_API_KEY is ignored by Ollama but required
    # by hosted providers; it defaults to a placeholder so Ollama still works.
    ai_provider: str = Field(default="anthropic", alias="AI_PROVIDER")
    local_ai_base_url: str = Field(default="http://localhost:11434/v1", alias="LOCAL_AI_BASE_URL")
    local_ai_model: str = Field(default="qwen2.5:3b", alias="LOCAL_AI_MODEL")
    local_ai_api_key: str = Field(default="local", alias="LOCAL_AI_API_KEY")

    @property
    def is_prod(self) -> bool:
        return self.node_env == "production"

    @property
    def cors_origins(self) -> list[str]:
        """CORS_ORIGIN may be a single origin or a comma-separated list, so a
        deployed frontend URL, a custom domain, and localhost can all be
        allowed at once."""
        return [o.strip() for o in self.cors_origin.split(",") if o.strip()]

    @property
    def db_requires_ssl(self) -> bool:
        """Managed Postgres (Neon, Supabase, Render, …) requires TLS, signalled
        by ``sslmode=require`` / ``ssl=require`` in the connection string. asyncpg
        doesn't read that query param, so we translate it into a connect arg
        (see db.py). Local/Docker Postgres has no such flag and stays plaintext."""
        lowered = self.database_url.lower()
        return any(
            flag in lowered for flag in ("sslmode=require", "ssl=require", "sslmode=verify")
        )

    @property
    def sqlalchemy_url(self) -> str:
        """Convert a Prisma/psql-style URL into an asyncpg SQLAlchemy URL.

        Strips the ``?schema=public`` query Prisma appends (asyncpg rejects it)
        and forces the ``postgresql+asyncpg`` driver.
        """
        url = self.database_url
        if "?" in url:
            url = url.split("?", 1)[0]
        if url.startswith("postgresql+asyncpg://"):
            return url
        if url.startswith("postgresql://"):
            return "postgresql+asyncpg://" + url[len("postgresql://") :]
        if url.startswith("postgres://"):
            return "postgresql+asyncpg://" + url[len("postgres://") :]
        return url


settings = Settings()
