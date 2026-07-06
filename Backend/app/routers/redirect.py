from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app.models.url import URL
from app.models.click import Click
from app.services.cache import get_cached_url, invalidate_url
from app.services.analytics import get_geo, parse_device, get_client_ip

router = APIRouter(tags=["redirect"])


async def record_click(url_id: int, request: Request, db: Session):
    """Fire-and-forget: record analytics without blocking the redirect."""
    ip = get_client_ip(request)
    geo = await get_geo(ip)
    device = parse_device(request.headers.get("user-agent"))

    click = Click(
        url_id=url_id,
        ip_address=ip,
        country=geo["country"],
        city=geo["city"],
        device_type=device["device_type"],
        browser=device["browser"],
        os=device["os"],
        referrer=request.headers.get("referer"),
        user_agent=request.headers.get("user-agent", "")[:512],
    )
    db.add(click)
    # Atomic increment on click_count — avoids read-modify-write race
    db.query(URL).filter(URL.id == url_id).update({"click_count": URL.click_count + 1})
    db.commit()


@router.get("/{short_code}")
async def redirect(short_code: str, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # 1. Check Redis cache first (avoids DB hit on every redirect for hot URLs)
    original_url = get_cached_url(short_code)

    if original_url:
        # Still need the url_id for analytics; fetch just the id column
        url = db.query(URL).filter(URL.short_code == short_code).first()
    else:
        url = db.query(URL).filter(URL.short_code == short_code).first()
        if not url:
            raise HTTPException(status_code=404, detail="Short URL not found")
        original_url = url.original_url

    if not url:
        raise HTTPException(status_code=404, detail="Short URL not found")

    if not url.is_active:
        raise HTTPException(status_code=410, detail="This link has expired or been deactivated")

    if url.expires_at and url.expires_at < datetime.now(timezone.utc):
        url.is_active = False
        db.commit()
        invalidate_url(short_code)
        raise HTTPException(status_code=410, detail="This link has expired")

    # Analytics recorded asynchronously — redirect happens immediately
    background_tasks.add_task(record_click, url.id, request, db)

    return RedirectResponse(url=original_url, status_code=302)
