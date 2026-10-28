"""Centralised application settings loaded from environment / .env file."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Restaurant Ordering API"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ordering"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    # Business day boundaries for the manager's "today" figures
    RESTAURANT_TZ: str = "Europe/Tirane"

    # Demo only: lets the landing page open any table's menu without the tablet link.
    # Never enable in production – it hands out every table's device key.
    DEMO_MODE: bool = False

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
