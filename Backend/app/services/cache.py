import json
from typing import Optional

from app.config import settings

_pool = None
_redis_disabled = False


def _client():
    global _pool, _redis_disabled
    if _redis_disabled or not settings.REDIS_URL:
        return None
    try:
        import redis

        if _pool is None:
            _pool = redis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)
        return redis.Redis(connection_pool=_pool)
    except Exception:
        _redis_disabled = True
        return None


URL_TTL = 3600
STATS_TTL = 60


def cache_url(short_code: str, original_url: str) -> None:
    r = _client()
    if r is None:
        return
    try:
        r.setex(f"url:{short_code}", URL_TTL, original_url)
    except Exception:
        pass


def get_cached_url(short_code: str) -> Optional[str]:
    r = _client()
    if r is None:
        return None
    try:
        return r.get(f"url:{short_code}")
    except Exception:
        return None


def invalidate_url(short_code: str) -> None:
    r = _client()
    if r is None:
        return
    try:
        r.delete(f"url:{short_code}")
    except Exception:
        pass


def cache_stats(short_code: str, stats: dict) -> None:
    r = _client()
    if r is None:
        return
    try:
        r.setex(f"stats:{short_code}", STATS_TTL, json.dumps(stats, default=str))
    except Exception:
        pass


def get_cached_stats(short_code: str) -> Optional[dict]:
    r = _client()
    if r is None:
        return None
    try:
        raw = r.get(f"stats:{short_code}")
        return json.loads(raw) if raw else None
    except Exception:
        return None


def invalidate_stats(short_code: str) -> None:
    r = _client()
    if r is None:
        return
    try:
        r.delete(f"stats:{short_code}")
    except Exception:
        pass
