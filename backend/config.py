from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "HomeBase"
    app_version: str = "0.1.0"
    debug: bool = True
    environment: str = "development"

    # Database
    database_url: str = "postgresql://user:password@host:5432/homebase"
    database_pool_size: int = 5
    database_max_overflow: int = 10
    database_pool_pre_ping: bool = True

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
