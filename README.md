# url-shortner
url- shortner 

# ⚡ LinkShort — URL Shortener with Analytics

A production-grade URL shortener project. ion.


**Live:** [https://url-shortner-nu-lime.vercel.app](https://url-shortner-nu-lime.vercel.app)

---

## Features

- **URL Shortening** — Base62 short codes, optional custom aliases
- **JWT Authentication** — Register / login, bearer token auth
- **Redis Caching** — Hot URLs served from cache; DB only hit on cold paths (optional; skipped if `REDIS_URL` is unset)
- **Click Analytics** — Timestamp, country (IP geolocation), device type, browser, referrer
- **Rate Limiting** — 10 shortens/minute per IP (free tier)
- **URL Expiry** — Set TTL in days; background job marks expired links inactive every 5 min (local / Railway only)
- **Analytics Dashboard** — React frontend with charts (clicks over time, country, device, browser)

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | FastAPI (Python 3.12) |
| Database | PostgreSQL (SQLAlchemy ORM); SQLite fallback |
| Cache | Redis (optional) |
| Auth | JWT via `python-jose`, bcrypt for passwords |
| Rate Limiting | `slowapi` |
| Background Jobs | APScheduler (not run on Vercel serverless) |
| Geolocation | ip-api.com (free, no key needed) |
| Frontend | React 18 + Vite + Recharts |
| Deploy | Vercel Services (Vite frontend + FastAPI backend) |

---

## Project Structure

```
url-shortner/
├── vercel.json                 # Vercel Services: Frontend + Backend routing
├── Backend/
│   ├── main.py                 # Vercel FastAPI entrypoint (`main:app`)
│   ├── pyproject.toml          # Python deps + Vercel entrypoint
│   ├── requirements.txt
│   ├── railway.toml
│   └── app/
│       ├── main.py             # FastAPI app, CORS, lifespan, routers
│       ├── config.py           # Pydantic settings from .env
│       ├── database.py         # SQLAlchemy engine + session
│       ├── limiter.py          # Shared SlowAPI limiter
│       ├── models/
│       │   ├── user.py
│       │   ├── url.py
│       │   └── click.py
│       ├── routers/
│       │   ├── auth.py         # POST /register, POST /login, GET /me
│       │   ├── urls.py         # POST /shorten, GET /urls, GET /urls/:code/stats
│       │   └── redirect.py     # GET /:code → 302 redirect + async analytics
│       ├── schemas/            # Pydantic request/response models
│       └── services/
│           ├── auth.py         # JWT create/verify, bcrypt hash/verify
│           ├── cache.py        # Redis get/set (no-op without REDIS_URL)
│           ├── analytics.py    # IP geolocation + user-agent parsing
│           ├── shortener.py    # Base62 code generation + collision retry
│           └── scheduler.py    # APScheduler: expire URLs every 5 min
└── Frontend/
    ├── src/
    │   ├── main.jsx            # React Router, protected routes
    │   ├── lib/api.js          # Axios instance with JWT interceptor
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Register.jsx
    │       ├── Dashboard.jsx
    │       └── Analytics.jsx
    └── vite.config.js          # Dev proxy: /api → localhost:8001
```

---

## Local Setup

### Prerequisites

- Python 3.12+, Node.js 18+
- Optional: PostgreSQL 15 and Redis (SQLite works without them)

On macOS (optional Postgres + Redis):

```bash
brew install postgresql@15 redis
brew services start postgresql@15
brew services start redis
createdb urlshortener
```

### Backend

```bash
cd Backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Optional: create .env
# DATABASE_URL=postgresql://localhost:5432/urlshortener
# REDIS_URL=redis://localhost:6379/0
# SECRET_KEY=$(openssl rand -hex 32)
# BASE_URL=http://localhost:8001
# ENVIRONMENT=development

uvicorn app.main:app --reload --port 8001
```

API docs: [http://localhost:8001/docs](http://localhost:8001/docs)

Without `DATABASE_URL`, the API uses SQLite at `/tmp/urlshortener.db`.

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

Dashboard: [http://localhost:5173](http://localhost:5173)

Vite proxies `/api` to the backend on port 8001.

---

## API Reference

### Auth

```
POST /api/auth/register    { email, username, password }
POST /api/auth/login       { email, password } → { access_token }
GET  /api/auth/me
```

### URLs (require Bearer token)

```
POST   /api/shorten               { original_url, custom_code?, expires_in_days? }
GET    /api/urls
DELETE /api/urls/:code
GET    /api/urls/:code/stats
```

### Other

```
GET /api/health
GET /:code   → 302 to original URL
```

---

## Environment Variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `SECRET_KEY` | Yes in production | `dev-secret-change-me` | JWT signing key (`openssl rand -hex 32`) |
| `DATABASE_URL` | No | `sqlite:////tmp/urlshortener.db` | Postgres recommended in production |
| `REDIS_URL` | No | empty | Cache disabled if unset |
| `BASE_URL` | No | `http://localhost:8001` | Used to build short links; on Vercel, derived from `VERCEL_URL` when left as localhost |
| `ENVIRONMENT` | No | `development` | Set `production` on deploy |

---

## Deployment (Vercel)

The repo is a Vercel Services project: Vite frontend + FastAPI backend on one domain (`vercel.json`).

- `/`, `/login`, `/register`, `/analytics/*`, `/assets/*` → frontend
- `/api/*` and short codes `/:code` → backend

### CLI

```bash
npx vercel@latest login
npx vercel@latest deploy --prod
```

### Production env (Vercel dashboard)

Set at least:

```
SECRET_KEY=<openssl rand -hex 32>
ENVIRONMENT=production
BASE_URL=https://url-shortner-nu-lime.vercel.app
```

For durable data and caching, add:

- **Postgres** (Neon or Vercel Postgres) → `DATABASE_URL`
- **Redis** (Upstash) → `REDIS_URL`

SQLite on Vercel lives under `/tmp` and does **not** persist across instances. APScheduler does not run on Vercel; expiry is still enforced on redirect.

Project dashboard: [https://vercel.com/junaididrishi/url-shortner](https://vercel.com/junaididrishi/url-shortner)
