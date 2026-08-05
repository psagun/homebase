from pydantic import model_validator
from pydantic_settings import BaseSettings

_DEFAULT_SECRET_KEY = "change-me-to-a-random-64-char-string-in-production"
_DEFAULT_CRON_SECRET = "change-me-to-a-random-secret"


class Settings(BaseSettings):
    app_name: str = "HomeBase"
    app_version: str = "0.1.0"
    # Safe default: SQL echo off unless explicitly enabled via DEBUG env var.
    debug: bool = False
    environment: str = "development"

    # Database — serverless-friendly pool settings.
    # Vercel spawns many function instances; a large per-instance pool causes
    # connection buildup against the Supabase pooler and eventual exhaustion.
    database_url: str = "postgresql://user:password@host:5432/homebase"
    database_pool_size: int = 1
    database_max_overflow: int = 2
    database_pool_recycle: int = 60
    database_pool_pre_ping: bool = False
    database_pool_timeout: int = 10

    # Auth
    secret_key: str = _DEFAULT_SECRET_KEY
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Storage
    storage_provider: str = "local"
    storage_local_path: str = "./uploads"

    # Cron
    cron_secret: str = _DEFAULT_CRON_SECRET

    # CORS — exact origins allowed to make credentialed cross-origin requests
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,https://homebase-seven-lac.vercel.app"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @model_validator(mode="after")
    def _validate_production_secrets(self):
        """Fail fast at boot when production runs with publicly-known secrets.

        The defaults are shipped in the repo; a deployment that forgets to
        override them signs JWTs with a known key and opens the seed/cron
        endpoints. Local development keeps working with defaults.
        """
        if self.environment == "production":
            if not self.secret_key or self.secret_key == _DEFAULT_SECRET_KEY:
                raise ValueError(
                    "SECRET_KEY must be set to a strong random value in production"
                )
            if not self.cron_secret or self.cron_secret == _DEFAULT_CRON_SECRET:
                raise ValueError(
                    "CRON_SECRET must be set to a strong random value in production"
                )
        return self


settings = Settings()
