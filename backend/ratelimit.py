"""Shared rate limiter.

Enabled only in production. slowapi is optional at runtime: if the
deployed environment lacks it (serverless install gaps), rate limiting
degrades gracefully instead of crashing the whole app at import.
"""

from backend.config import settings

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    _HAS_SLOWAPI = True
except ImportError:  # pragma: no cover — prod runtime without slowapi
    Limiter = None
    _HAS_SLOWAPI = False


def rate_limit(limit: str):
    """Decorator: applies the slowapi limit, or a no-op when unavailable."""
    if limiter is not None:
        return limiter.limit(limit)

    def noop(func):
        return func

    return noop


limiter = (
    Limiter(key_func=get_remote_address, enabled=settings.environment == "production")
    if _HAS_SLOWAPI
    else None
)
