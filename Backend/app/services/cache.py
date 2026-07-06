import json
import redis
from typing import Optional
from app.config import settings

# Single connection pool shared across all requests
_pool = redis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)


def get_redis() -> redis.Redis:
    return redis.Redis(connection_pool=_pool)


URL_TTL = 3600  # 1 hour — hot URLs stay cached; cold URLs expire naturally
STATS_TTL = 60  # analytics cache expires in 60s to stay fresh enough


def cache_url(short_code: str, original_url: str) -> None:
    r = get_redis()
    r.setex(f"url:{short_code}", URL_TTL, original_url)


def get_cached_url(short_code: str) -> Optional[str]:
    r = get_redis()
    return r.get(f"url:{short_code}")


def invalidate_url(short_code: str) -> None:
    r = get_redis()
    r.delete(f"url:{short_code}")


def cache_stats(short_code: str, stats: dict) -> None:
    r = get_redis()
    r.setex(f"stats:{short_code}", STATS_TTL, json.dumps(stats, default=str))


def get_cached_stats(short_code: str) -> Optional[dict]:
    r = get_redis()
    raw = r.get(f"stats:{short_code}")
    return json.loads(raw) if raw else None


def invalidate_stats(short_code: str) -> None:
    r = get_redis()
    r.delete(f"stats:{short_code}")
