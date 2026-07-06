from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from typing import List
from collections import defaultdict

from app.database import get_db
from app.models.url import URL
from app.models.click import Click
from app.models.user import User
from app.schemas.url import URLCreate, URLOut, URLStats
from app.services.auth import get_current_user
from app.services.shortener import get_unique_code
from app.services.cache import cache_url, get_cached_url, invalidate_url, cache_stats, get_cached_stats, invalidate_stats
from app.services.analytics import get_geo, parse_device, get_client_ip
from app.config import settings
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(tags=["urls"])

RATE_LIMIT_FREE = "10/minute"


@router.post("/shorten", response_model=URLOut, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_LIMIT_FREE)
def shorten_url(
    request: Request,
    payload: URLCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate custom code uniqueness
    if payload.custom_code:
        if db.query(URL).filter(URL.short_code == payload.custom_code).first():
            raise HTTPException(status_code=400, detail="Custom code already taken")
        short_code = payload.custom_code
    else:
        short_code = get_unique_code(db)

    expires_at = None
    if payload.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=payload.expires_in_days)

    url = URL(
        short_code=short_code,
        original_url=str(payload.original_url),
        user_id=current_user.id,
        expires_at=expires_at,
    )
    db.add(url)
    db.commit()
    db.refresh(url)

    cache_url(short_code, str(payload.original_url))

    url.short_url = f"{settings.BASE_URL}/{short_code}"
    return url


@router.get("/urls", response_model=List[URLOut])
def list_urls(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    urls = db.query(URL).filter(URL.user_id == current_user.id).order_by(URL.created_at.desc()).all()
    for url in urls:
        url.short_url = f"{settings.BASE_URL}/{url.short_code}"
    return urls


@router.delete("/urls/{short_code}", status_code=status.HTTP_204_NO_CONTENT)
def delete_url(
    short_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = db.query(URL).filter(URL.short_code == short_code, URL.user_id == current_user.id).first()
    if not url:
        raise HTTPException(status_code=404, detail="URL not found")
    db.delete(url)
    db.commit()
    invalidate_url(short_code)
    invalidate_stats(short_code)


@router.get("/urls/{short_code}/stats", response_model=URLStats)
def url_stats(
    short_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = db.query(URL).filter(URL.short_code == short_code, URL.user_id == current_user.id).first()
    if not url:
        raise HTTPException(status_code=404, detail="URL not found")

    cached = get_cached_stats(short_code)
    if cached:
        return cached

    clicks = db.query(Click).filter(Click.url_id == url.id).order_by(Click.clicked_at.desc()).all()

    by_country: dict = defaultdict(int)
    by_device: dict = defaultdict(int)
    by_browser: dict = defaultdict(int)
    by_date: dict = defaultdict(int)
    recent = []

    for click in clicks:
        by_country[click.country or "Unknown"] += 1
        by_device[click.device_type or "unknown"] += 1
        by_browser[click.browser or "unknown"] += 1
        date_key = click.clicked_at.strftime("%Y-%m-%d") if click.clicked_at else "unknown"
        by_date[date_key] += 1
        if len(recent) < 10:
            recent.append({
                "clicked_at": str(click.clicked_at),
                "country": click.country,
                "device_type": click.device_type,
                "browser": click.browser,
                "referrer": click.referrer,
            })

    stats = URLStats(
        short_code=url.short_code,
        original_url=url.original_url,
        total_clicks=url.click_count,
        clicks_by_country=dict(by_country),
        clicks_by_device=dict(by_device),
        clicks_by_browser=dict(by_browser),
        clicks_by_date=dict(by_date),
        recent_clicks=recent,
        created_at=url.created_at,
    )
    cache_stats(short_code, stats.model_dump())
    return stats
