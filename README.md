# url-shortner
url- shortner 

live link - https://url-shortner-nu-lime.vercel.app
# ⚡ LinkShort — URL Shortener with Analytics

A production-grade URL shortener built as a FAANG system design interview reference project. Every architectural decision maps directly to a real interview question.

---

## Features

- **URL Shortening** — Base62 short codes, optional custom aliases
- **JWT Authentication** — Register / login, bearer token auth
- **Redis Caching** — Hot URLs served from cache; DB only hit on cold paths
- **Click Analytics** — Timestamp, country (IP geolocation), device type, browser, referrer
- **Rate Limiting** — 10 shortens/minute per IP (free tier)
- **URL Expiry** — Set TTL in days; background job marks expired links inactive every 5 min
- **Analytics Dashboard** — React frontend with charts (clicks over time, country, device, browser)

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | FastAPI (Python) |
| Database | PostgreSQL 15 (SQLAlchemy ORM) |
| Cache | Redis |
| Auth | JWT via `python-jose`, bcrypt for passwords |
| Rate Limiting | `slowapi` |
| Background Jobs | APScheduler |
| Geolocation | ip-api.com (free, no key needed) |
| Frontend | React 18 + Vite + Recharts |

---

## Project Structure

url-shortener/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, scheduler startup
│   │   ├── config.py            # Pydantic settings from .env
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── models/
│   │   │   ├── user.py          # users table
│   │   │   ├── url.py           # urls table (short_code, expiry, click_count)
│   │   │   └── click.py         # clicks table (analytics events)
│   │   ├── routers/
│   │   │   ├── auth.py          # POST /register, POST /login, GET /me
│   │   │   ├── urls.py          # POST /shorten, GET /urls, GET /urls/:code/stats
│   │   │   └── redirect.py      # GET /:code → 302 redirect + async analytics
│   │   └── services/
│   │       ├── auth.py          # JWT create/verify, bcrypt hash/verify
│   │       ├── cache.py         # Redis get/set with TTL constants
│   │       ├── analytics.py     # IP geolocation + user-agent parsing
│   │       ├── shortener.py     # Base62 code generation + collision retry
│   │       └── scheduler.py     # APScheduler: expire URLs every 5 min
│   ├── requirements.txt
│   ├── .env.example
│   └── railway.toml
└── frontend/
    ├── src/
    │   ├── main.jsx             # React Router, protected routes
    │   ├── lib/api.js           # Axios instance with JWT interceptor
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Register.jsx
    │       ├── Dashboard.jsx    # Shorten, list, delete, copy links
    │       └── Analytics.jsx    # Charts: timeline, country, device, browser
    └── vite.config.js

---

## Local Setup

### Prerequisites

- Python 3.9+, Node.js 18+, PostgreSQL 15, Redis

On macOS:
```bash
brew install postgresql@15 redis
brew services start postgresql@15
brew services start redis
createdb urlshortener

Backend

cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — set DATABASE_URL and SECRET_KEY

uvicorn app.main:app --reload --port 8001

API docs: http://localhost:8001/docs

Frontend

cd frontend
npm install
npm run dev

Dashboard: http://localhost:5173

---
API Reference

Auth

POST /api/auth/register    { email, username, password }
POST /api/auth/login       { email, password } → { access_token }
GET  /api/auth/me

URLs (require Bearer token)

POST   /api/shorten               { original_url, custom_code?, expires_in_days? }
GET    /api/urls
DELETE /api/urls/:code
GET    /api/urls/:code/stats

Redirect

GET /:code   → 302 to original URL
Deployment (Railway)

1. Push to GitHub
2. Create Railway project, add PostgreSQL and Redis plugins
3. Set env vars:

SECRET_KEY=<openssl rand -hex 32>
BASE_URL=https://url-shortner-nu-lime.vercel.app
ENVIRONMENT=production

