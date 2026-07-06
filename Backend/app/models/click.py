from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Click(Base):
    __tablename__ = "clicks"

    id = Column(Integer, primary_key=True, index=True)
    url_id = Column(Integer, ForeignKey("urls.id"), nullable=False)
    clicked_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    ip_address = Column(String(45), nullable=True)   # supports IPv6
    country = Column(String(64), nullable=True)
    city = Column(String(64), nullable=True)
    device_type = Column(String(32), nullable=True)  # desktop | mobile | tablet | bot
    browser = Column(String(64), nullable=True)
    os = Column(String(64), nullable=True)
    referrer = Column(String(512), nullable=True)
    user_agent = Column(String(512), nullable=True)

    url = relationship("URL", back_populates="clicks")
