"""Application settings and environment configuration."""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Sentinel AI"
    api_v1_prefix: str = "/api"
    environment: str = "development"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 12
    database_url: str = "sqlite:///./sentinel.db"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    openai_api_key: str | None = None
    openai_model: str = "gpt-5.6-sol"
    backend_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()

