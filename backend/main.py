import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from backend.config import settings
from backend.database import Base, engine
from backend.ratelimit import limiter
from backend.routers.router import api_router


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    """Allow credentialed CORS only from exact, configured origins.

    Previously this matched any origin *containing* "localhost", which let
    look-alike hosts (e.g. https://localhost.attacker.io) receive
    credentialed CORS. Now the Origin must exactly match an entry in
    settings.cors_origins (comma-separated).
    """

    ALLOWED_ORIGINS = {o.strip() for o in settings.cors_origins.split(",") if o.strip()}

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        response = await call_next(request)
        if origin and origin in self.ALLOWED_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            if request.method == "OPTIONS":
                response.status_code = 200
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables for local SQLite development
    if settings.database_url.startswith("sqlite"):
        import backend.models  # noqa: F401 — register all models with Base.metadata
        Base.metadata.create_all(bind=engine)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
    )

    # Middleware (order matters: security runs first)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(DynamicCORSMiddleware)
    app.include_router(api_router)

    # Rate limiting (production only)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Serve uploaded files
    uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

    return app


app = create_app()
