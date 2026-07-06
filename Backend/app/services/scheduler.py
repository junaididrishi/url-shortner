from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from datetime import datetime, timezone

scheduler = BackgroundScheduler(timezone="UTC")


def expire_urls(db_factory):
    """Mark URLs as inactive when they've passed their expiry time."""
    db: Session = db_factory()
    try:
        from app.models.url import URL
        from app.services.cache import invalidate_url

        now = datetime.now(timezone.utc)
        expired = (
            db.query(URL)
            .filter(URL.expires_at <= now, URL.is_active == True)
            .all()
        )
        for url in expired:
            url.is_active = False
            invalidate_url(url.short_code)
        if expired:
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"[scheduler] expire_urls error: {e}")
    finally:
        db.close()


def start_scheduler(db_factory):
    scheduler.add_job(expire_urls, "interval", minutes=5, args=[db_factory], id="expire_urls")
    scheduler.start()


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
