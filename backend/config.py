from pydantic_settings import BaseSettings


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
    secret_key: str = "change-me-to-a-random-64-char-string-in-production"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Storage
    storage_provider: str = "local"
    storage_local_path: str = "./uploads"

    # Cron
    cron_secret: str = "change-me-to-a-random-secret"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
