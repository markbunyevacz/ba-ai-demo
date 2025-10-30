"""Application settings using Pydantic."""
from functools import lru_cache
from typing import List

from pydantic import AnyHttpUrl, BaseSettings, Field


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "BA AI Demo API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False

    # Paths
    PUBLIC_DIR: str = "public"

    # CORS
    CORS_ORIGINS: List[str] = Field(default_factory=lambda: ["*"])

    # Database (placeholder for future use)
    DATABASE_URL: str = "postgresql+psycopg2://ba_ai:development@postgres:5432/ba_ai"

    # Message Queue
    RABBITMQ_URL: str = Field(default="amqp://guest:guest@rabbitmq:5672/")

    # AI Providers
    ANTHROPIC_API_KEY: str | None = None
    OPENROUTER_API_KEY: str | None = None
    DEFAULT_MODEL_PROVIDER: str = "anthropic"

    # Jira OAuth
    JIRA_BASE_URL: str = "https://your-domain.atlassian.net"
    JIRA_CLIENT_ID: str | None = None
    JIRA_CLIENT_SECRET: str | None = None
    JIRA_CALLBACK_URL: str = "http://localhost:5000/api/jira/callback"
    JIRA_AUTH_URL: str = "https://auth.atlassian.com/authorize"
    JIRA_TOKEN_URL: str = "https://auth.atlassian.com/oauth/token"

    # Monitoring
    PROMETHEUS_METRICS_ENABLED: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()


settings = get_settings()
