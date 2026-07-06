from pydantic import BaseModel, HttpUrl
from datetime import datetime
from typing import Optional


class URLCreate(BaseModel):
    original_url: str
    custom_code: Optional[str] = None
    expires_in_days: Optional[int] = None


class URLOut(BaseModel):
    id: int
    short_code: str
    original_url: str
    title: Optional[str]
    short_url: str
    click_count: int
    is_active: bool
    expires_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class URLStats(BaseModel):
    short_code: str
    original_url: str
    total_clicks: int
    clicks_by_country: dict
    clicks_by_device: dict
    clicks_by_browser: dict
    clicks_by_date: dict
    recent_clicks: list
    created_at: datetime
