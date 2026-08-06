"""Shared rate limiter — dependency-free, production only.

slowapi was previously used here but never reached the Vercel runtime
(install-source/cache quirk), leaving rate limiting silently disabled.
This in-memory fixed-window limiter has zero dependencies and works
everywhere. Like any in-memory limiter on serverless it is per-instance —
a best-effort guard against auth brute force; bcrypt hashing is the real
throttle for passwords.
"""

import functools
import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException
from starlette.requests import Request

from backend.config import settings

_ENABLED = settings.environment == "production"
_WINDOWS = {"second": 1, "minute": 60, "hour": 3600}
_MAX_KEYS = 10_000

_buckets: dict[str, list[float]] = defaultdict(list)
_lock = Lock()


def _client_ip(request: Request) -> str:
    """Real client IP — Vercel's edge sets X-Forwarded-For."""
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check(key: str, limit: int, window: int) -> bool:
    """Record a hit; return False when the window is exhausted."""
    now = time.monotonic()
    with _lock:
        hits = [t for t in _buckets[key] if t > now - window]
        if len(hits) >= limit:
            return False
        hits.append(now)
        if len(_buckets) > _MAX_KEYS:
            _buckets.clear()
        _buckets[key] = hits
        return True


def rate_limit(spec: str):
    """Decorator: allow at most `limit` requests per window per IP.

    Usage: @rate_limit("20/minute"). Accepts second/minute/hour windows.
    No-op outside production.
    """
    limit_str, _, window_str = spec.partition("/")
    limit = int(limit_str)
    window = _WINDOWS.get(window_str, 60)

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            if _ENABLED:
                request = kwargs.get("request") or next(
                    (a for a in args if isinstance(a, Request)), None
                )
                if request is not None and not _check(
                    f"{_client_ip(request)}:{func.__name__}", limit, window
                ):
                    raise HTTPException(
                        status_code=429,
                        detail="Too many requests — please try again later.",
                    )
            return func(*args, **kwargs)

        return wrapper

    return decorator
