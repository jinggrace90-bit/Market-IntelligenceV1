# 📈 Market Intelligence Dashboard

A **real-time, AI-powered market intelligence dashboard** for investors — live markets, a curated news feed, market sentiment, macro cause-and-effect analysis, an economic calendar, and a personal watchlist.

Its purpose is **not** to tell you what to buy. It's to help you filter information overload and gradually build understanding of **macro economics, market sentiment, risk, and independent thinking**.

> ⚠️ Educational tool. Nothing here is financial advice.

---

## ✨ What's real (no mock data)

Every number and headline comes from a live source. The app runs with **zero API keys** using free, no-key providers, and unlocks extras when you add keys.

| Module | Source | Key required? |
| --- | --- | --- |
| Market Overview (indices, commodities, crypto, yields, DXY, VIX) | **Yahoo Finance** | ❌ No |
| Live News Feed | **RSS**: CNBC, Yahoo Finance, Investing.com, MarketWatch, FT, Seeking Alpha | ❌ No |
| Market Sentiment — Fear & Greed | **alternative.me** | ❌ No |
| Economic Calendar | **ForexFactory** mirror → **Tradays/MQL5** fallback | ❌ No |
| Global Search (instruments) | **Yahoo Finance** | ❌ No |
| Richer news + economic calendar | **NewsAPI**, **Finnhub** | ✅ Optional |
| AI News Analysis & AI Macro Analysis | **Groq** | ✅ Optional |

If an optional key is missing, that feature degrades gracefully (e.g. AI panels show a "configure a key" notice) — the rest keeps working.

---

## 🧱 Tech stack

**Frontend** — Next.js 15 · React 19 · TypeScript · Ant Design 5 · Tailwind CSS · TanStack Query · Zustand · React Hook Form · Recharts · Framer Motion · Socket.IO client

**Backend** — Python 3.12 · FastAPI · uvicorn (ASGI) · REST + WebSocket (python-socketio) · JWT auth (PyJWT + passlib/bcrypt) · APScheduler · httpx · yfinance · feedparser · Anthropic SDK

**Data** — PostgreSQL · SQLAlchemy 2.0 (async, asyncpg) · Alembic migrations · Redis (cache)

**Infra** — Docker · Docker Compose

### Architecture

```
External APIs (Yahoo / RSS / alternative.me / ForexFactory+Tradays / Finnhub / Claude)
        │
        ▼
FastAPI services  ──►  Redis cache  ──►  PostgreSQL (news + analyses + users + watchlist)
        │
        ▼
Socket.IO push  ──►  Next.js dashboard (TanStack Query + Zustand)
```

APScheduler jobs ingest news every 5 min and warm market/sentiment/calendar caches. WebSocket channels push `market:overview` (15s), `news:latest` (60s), and `sentiment` (5m) to all clients, with an immediate snapshot on connect.

---

## 🚀 Quick start (Docker — recommended)

Requires Docker + Docker Compose.

```bash
cp .env.example .env        # optional: add API keys to unlock extras
docker compose up --build
```

Then open:

- **Dashboard** → http://localhost:3000
- **API health** → http://localhost:4000/api/health

Compose brings up Postgres, Redis, the API/WebSocket server (which runs Alembic migrations on boot), and the Next.js frontend. No mock data — the news ingester and cache warmers run on startup.

To stop: `docker compose down` (add `-v` to also wipe the database volume).

---

## 🛠️ Local development (without Docker)

You need Python 3.11+ and Node 20+, plus a local PostgreSQL and Redis (or point the env vars at hosted ones).

```bash
# 1. Configure the backend
cp .env.example .env        # ensure DATABASE_URL / REDIS_URL point at your instances

# 2. Backend (Python) — API + WebSocket
cd server_py
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head                       # create the database schema
uvicorn app.main:asgi --port 4000 --reload # http://localhost:4000
cd ..

# 3. Frontend (in a second terminal)
npm --prefix web install
npm run dev:web             # http://localhost:3000
```

The frontend reads `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000`). The
backend runs with **zero API keys**; add optional keys to `.env` to unlock extras.

Lint the backend with [`ruff`](https://docs.astral.sh/ruff/): `cd server_py && ruff check .`

---

## 🔑 Environment variables

See [`.env.example`](.env.example). Highlights:

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection | local compose value |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `JWT_SECRET` | Auth token signing — **change in production** | dev placeholder |
| `AI_PROVIDER` | `anthropic` (needs a key) or `local` (free, no key) | `anthropic` |
| `ANTHROPIC_API_KEY` | Enables AI news + macro analysis when `AI_PROVIDER=anthropic` | *(empty)* |
| `ANTHROPIC_MODEL` | Claude model id | `claude-haiku-4-5-20251001` |
| `LOCAL_AI_BASE_URL` / `LOCAL_AI_MODEL` / `LOCAL_AI_API_KEY` | OpenAI-compatible server (local Ollama **or** a free cloud API like Groq) when `AI_PROVIDER=local` | `http://localhost:11434/v1` / `qwen2.5:3b` / *(empty)* |
| `FINNHUB_API_KEY` / `NEWSAPI_KEY` / `ALPHAVANTAGE_API_KEY` | Optional data enrichment | *(empty)* |

### Free AI analysis without Claude (`AI_PROVIDER=local`)

"AI News Analysis" and "AI Macro Analysis" can run against any OpenAI-compatible server
instead of Claude. Two free ways:

**Option A — Free cloud API (runs 24/7, recommended for a deployed site).** A hosted provider
like [Groq](https://console.groq.com) has a generous free tier and needs no machine of your
own. In `.env`:

```
AI_PROVIDER=local
LOCAL_AI_BASE_URL=https://api.groq.com/openai/v1
LOCAL_AI_API_KEY=<your Groq key>
LOCAL_AI_MODEL=openai/gpt-oss-120b       # see note below on model retirement
```

> ⚠️ **Groq retires models.** `llama-3.3-70b-versatile` and `llama-3.1-8b-instant`
> were shut down on 2026-08-16, which breaks AI analysis with a
> "local AI server not reachable" error until `LOCAL_AI_MODEL` is repointed.
> Check [console.groq.com/docs/models](https://console.groq.com/docs/models) and
> prefer a model listed under **Production** — **Preview** models can be pulled
> at short notice.

**Option B — Local model (free, but only while your computer is on).**

1. Install [Ollama](https://ollama.com).
2. Pull a small model: `ollama pull qwen2.5:3b` (~2GB; plenty for summarizing/tagging news,
   small enough not to bog down a laptop — no need to go to 7B+).
3. Set `AI_PROVIDER=local` (defaults already point at Ollama's local port; no key needed).
4. When the API runs in `docker-compose` and Ollama runs on your host, use
   `LOCAL_AI_BASE_URL=http://host.docker.internal:11434/v1` (already the compose default).

Models are distributed pre-quantized on Hugging Face per runtime (GGUF for Ollama/llama.cpp,
MLX for Apple-Silicon runtimes like LM Studio) — pull the format your runtime expects; no
manual conversion needed.

---

## 📦 Project structure

```
.
├── docker-compose.yml
├── .env.example
├── server_py/                  # FastAPI + python-socketio + SQLAlchemy API
│   ├── requirements.txt
│   ├── alembic/                # database migrations (User, WatchlistItem, NewsArticle, NewsAnalysis)
│   └── app/
│       ├── config.py           # settings (pydantic-settings)
│       ├── symbols.py          # tracked market symbols
│       ├── db.py · models.py   # async engine + SQLAlchemy models
│       ├── cache.py            # redis + in-memory cache-aside helper
│       ├── security.py · deps.py  # JWT auth + password hashing
│       ├── errors.py           # error handlers (TS-compatible shapes)
│       ├── services/           # market_data, news, sentiment, economic_calendar, ai, search, auth, watchlist
│       ├── routers/            # REST endpoints
│       ├── realtime.py         # Socket.IO channels + broadcasters
│       └── jobs.py             # APScheduler ingestion + cache warming
└── web/                        # Next.js 15 App Router frontend
    └── src/
        ├── app/                # dashboard, login, register
        ├── components/         # MarketOverview, NewsFeed, SentimentPanel, MacroAnalysis, …
        ├── hooks/              # useRealtime, useNews, useWatchlist
        ├── store/              # Zustand auth store
        └── lib/                # api client, socket, formatters
```

---

## 🔌 API reference

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | — | Create account |
| `POST` | `/api/auth/login` | — | Sign in → JWT |
| `GET` | `/api/auth/me` | ✅ | Current user |
| `GET` | `/api/market/overview` | — | All tracked instruments + sparklines |
| `GET` | `/api/market/quotes?symbols=AAPL,MSFT` | — | Live quotes |
| `GET` | `/api/news?cursor=&search=&category=&minImportance=` | — | Paginated news feed |
| `POST` | `/api/news/refresh` | — | Trigger ingestion |
| `POST` | `/api/ai/news/:articleId` | ✅ | AI analysis of an article (cached) |
| `POST` | `/api/ai/macro` | ✅ | Macro cause-and-effect chain |
| `GET` | `/api/sentiment` | — | Fear & Greed + VIX + AI news tone |
| `GET` | `/api/calendar?country=&importance=` | — | Economic calendar |
| `GET` | `/api/watchlist` · `POST` · `DELETE /:id` · `PUT /reorder` | ✅ | Personal watchlist |
| `GET` | `/api/search?q=` | — | Global search (instruments + news) |

**WebSocket** (Socket.IO, same origin as API): channels `market:overview`, `news:latest`, `sentiment`.

---

## 📝 Notes & honest limitations

- **Provider rate limits**: Yahoo Finance and the ForexFactory feed occasionally throttle by IP (HTTP 429). Redis caching, in-memory fallback caching, and request throttling keep this rare; endpoints degrade to the last-known state rather than erroring.
- **Economic Calendar reliability**: The primary source (ForexFactory mirror at `nfs.faireconomy.media`) is an unofficial community mirror and can be intermittent. When it fails, the backend automatically falls back to **Tradays/MQL5** (MetaQuotes' official calendar). On top of that, feed caches never store an empty result — an empty response means the upstream failed, so the last result that *did* have data is served instead and the upstream is retried a minute later. Outages are therefore invisible to users once any fetch has succeeded.
- **US 2Y yield**: Yahoo doesn't expose a clean 2Y index ticker, so the rates row uses 10Y (`^TNX`), 5Y (`^FVX`), and 13-week (`^IRX`) as available proxies.
- **AI cost control**: AI endpoints require login and cache every result in Postgres so tokens are never re-spent on the same article.
- The Fear & Greed Index from alternative.me is crypto-derived but widely used as a broad market risk-appetite proxy.

---

## 📄 License

MIT — for educational use.
