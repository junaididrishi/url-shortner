from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.limiter import limiter
from app.routers import auth, urls, redirect


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if os.getenv("VERCEL") != "1":
        from app.services.scheduler import start_scheduler, stop_scheduler

        start_scheduler(SessionLocal)
        yield
        stop_scheduler()
    else:
        yield


app = FastAPI(title="LinkShort", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(urls.router, prefix="/api")
app.include_router(redirect.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}
