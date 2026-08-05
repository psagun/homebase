"""Shared rate limiter.

Enabled only in production — local development and tests are unaffected.
In-memory storage is per-function-instance on serverless, which is
imperfect but still blocks the obvious brute-force/registration spam.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from backend.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    enabled=settings.environment == "production",
    default_limits=[],
)
