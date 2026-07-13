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
| Economic Calendar | **ForexFactory** weekly feed (faireconomy mirror) | ❌ No |
| Global Search (instruments) | **Yahoo Finance** | ❌ No |
| Richer news + economic calendar | **NewsAPI**, **Finnhub** | ✅ Optional |
| AI News Analysis & AI Macro Analysis | **Anthropic Claude** | ✅ Optional |

If an optional key is missing, that feature degrades gracefully (e.g. AI panels show a "configure a key" notice) — the rest keeps working.

---

## 🧱 Tech stack

**Frontend** — Next.js 15 · React 19 · TypeScript · Ant Design 5 · Tailwind CSS · TanStack Query · Zustand · React Hook Form · Recharts · Framer Motion · Socket.IO client

**Backend** — Node.js · Express · TypeScript · REST + WebSocket (Socket.IO) · JWT auth (bcrypt) · node-cron

**Data** — PostgreSQL · Prisma ORM · Redis (cache)

**Infra** — Docker · Docker Compose

### Architecture

```
External APIs (Yahoo / RSS / alternative.me / ForexFactory / Finnhub / Claude)
        │
        ▼
Express services  ──►  Redis cache  ──►  PostgreSQL (news + analyses + users + watchlist)
        │
        ▼
Socket.IO push  ──►  Next.js dashboard (TanStack Query + Zustand)
```

Cron jobs ingest news every 5 min and warm market/sentiment/calendar caches. WebSocket channels push `market:overview` (15s), `news:latest` (60s), and `sentiment` (5m) to all clients, with an immediate snapshot on connect.

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

Compose brings up Postgres, Redis, the API/WebSocket server (which auto-applies the Prisma schema on boot), and the Next.js frontend. No mock data — the news ingester and cache warmers run on startup.

To stop: `docker compose down` (add `-v` to also wipe the database volume).

---

## 🛠️ Local development (without Docker)

You need Node 20+, plus a local PostgreSQL and Redis (or point the env vars at hosted ones).

```bash
# 1. Install dependencies
npm run install:all

# 2. Configure the backend
cp .env.example .env        # ensure DATABASE_URL / REDIS_URL point at your instances

# 3. Create the database schema
cd server && npx prisma db push && cd ..

# 4. Run backend (API + WebSocket) and frontend in two terminals
npm run dev:server          # http://localhost:4000
npm run dev:web             # http://localhost:3000
```

The frontend reads `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000`).

---

## 🔑 Environment variables

See [`.env.example`](.env.example). Highlights:

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection | local compose value |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `JWT_SECRET` | Auth token signing — **change in production** | dev placeholder |
| `ANTHROPIC_API_KEY` | Enables AI news + macro analysis | *(empty)* |
| `ANTHROPIC_MODEL` | Claude model id | `claude-haiku-4-5-20251001` |
| `FINNHUB_API_KEY` / `NEWSAPI_KEY` / `ALPHAVANTAGE_API_KEY` | Optional data enrichment | *(empty)* |

---

## 📦 Project structure

```
.
├── docker-compose.yml
├── .env.example
├── server/                     # Express + Socket.IO + Prisma API
│   ├── prisma/schema.prisma    # User, WatchlistItem, NewsArticle, NewsAnalysis
│   └── src/
│       ├── config/             # env + tracked market symbols
│       ├── lib/                # prisma + redis (cache-aside helper)
│       ├── middleware/         # JWT auth + error handling
│       ├── services/           # marketData, news, sentiment, economicCalendar, ai, search, auth, watchlist
│       ├── routes/             # REST endpoints
│       ├── websocket/          # Socket.IO channels + broadcasters
│       └── jobs/               # cron ingestion + cache warming
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

- **Provider rate limits**: Yahoo Finance and the ForexFactory feed occasionally throttle by IP (HTTP 429). Redis caching and request throttling keep this rare; endpoints degrade to an empty/last-known state rather than erroring.
- **US 2Y yield**: Yahoo doesn't expose a clean 2Y index ticker, so the rates row uses 10Y (`^TNX`), 5Y (`^FVX`), and 13-week (`^IRX`) as available proxies.
- **AI cost control**: AI endpoints require login and cache every result in Postgres so tokens are never re-spent on the same article.
- The Fear & Greed Index from alternative.me is crypto-derived but widely used as a broad market risk-appetite proxy.

---

## 📄 License

MIT — for educational use.
