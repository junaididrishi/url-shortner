import random
import string
from sqlalchemy.orm import Session
from app.models.url import URL


BASE62 = string.ascii_letters + string.digits  # 62 chars → ~56B combos at 6 chars


def generate_short_code(length: int = 6) -> str:
    return "".join(random.choices(BASE62, k=length))


def get_unique_code(db: Session, length: int = 6) -> str:
    """Retry until we find a code not in the DB. Collision rate at 6 chars is negligible."""
    for _ in range(10):
        code = generate_short_code(length)
        if not db.query(URL).filter(URL.short_code == code).first():
            return code
    # Extremely unlikely but safe fallback: extend to 8 chars
    return generate_short_code(8)
