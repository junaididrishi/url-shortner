import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:////tmp/urlshortener.db"
    REDIS_URL: str = ""
    SECRET_KEY: str = "dev-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    BASE_URL: str = "http://localhost:8001"
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"
        extra = "ignore"


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


def _default_base_url() -> str:
    vercel_url = os.getenv("VERCEL_PROJECT_PRODUCTION_URL") or os.getenv("VERCEL_URL")
    if vercel_url:
        if vercel_url.startswith("http"):
            return vercel_url.rstrip("/")
        return f"https://{vercel_url}".rstrip("/")
    return "http://localhost:8001"


settings = Settings()
settings.DATABASE_URL = _normalize_database_url(settings.DATABASE_URL)
if os.getenv("VERCEL") and settings.BASE_URL in ("http://localhost:8001", "http://localhost:8000"):
    settings.BASE_URL = _default_base_url()
