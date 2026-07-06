import httpx
from user_agents import parse as parse_ua
from typing import Optional


async def get_geo(ip: str) -> dict:
    """
    Free IP geolocation via ip-api.com (no API key needed, 45 req/min limit).
    Falls back gracefully — never blocks the redirect.
    """
    if not ip or ip in ("127.0.0.1", "::1", "testclient"):
        return {"country": "Local", "city": "Local"}
    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            resp = await client.get(f"http://ip-api.com/json/{ip}?fields=country,city,status")
            data = resp.json()
            if data.get("status") == "success":
                return {"country": data.get("country", "Unknown"), "city": data.get("city", "Unknown")}
    except Exception:
        pass
    return {"country": "Unknown", "city": "Unknown"}


def parse_device(user_agent_string: Optional[str]) -> dict:
    if not user_agent_string:
        return {"device_type": "unknown", "browser": "unknown", "os": "unknown"}

    ua = parse_ua(user_agent_string)

    if ua.is_bot:
        device_type = "bot"
    elif ua.is_mobile:
        device_type = "mobile"
    elif ua.is_tablet:
        device_type = "tablet"
    else:
        device_type = "desktop"

    return {
        "device_type": device_type,
        "browser": ua.browser.family,
        "os": ua.os.family,
    }


def get_client_ip(request) -> str:
    # Respect X-Forwarded-For for deployments behind a proxy/load balancer
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
