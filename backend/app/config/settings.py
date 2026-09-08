"""
Polaris Backend — Application Settings
Loaded from .env via pydantic-settings.
"""
from typing import List, Literal
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────────────────
    APP_NAME: str = "Polaris API"
    NODE_ENV: str = "development"
    PORT: int = 8000

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str) -> str:
        if isinstance(v, str):
            # Cloud hosts (Render, Supabase, Neon) provide postgres:// or postgresql://
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
                v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # ── JWT ──────────────────────────────────────────────────────────────────
    JWT_ACCESS_SECRET: str
    JWT_REFRESH_SECRET: str
    ACCESS_TOKEN_EXPIRES_IN: int = 15   # minutes
    REFRESH_TOKEN_EXPIRES_IN: int = 7   # days

    # ── CORS ─────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: str = "http://localhost:5173"
    COOKIE_SAMESITE: Literal["lax", "none", "strict"] = "lax"

    # ── Brute-force Protection ───────────────────────────────────────────────
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCK_DURATION_MINUTES: int = 15

    # ── Bootstrap Admin ──────────────────────────────────────────────────────
    BOOTSTRAP_ADMIN_ID: str = ""
    BOOTSTRAP_ADMIN_PASSWORD: str = ""
    BOOTSTRAP_ADMIN_NAME: str = "System Administrator"

    # ── Derived Properties ───────────────────────────────────────────────────
    @property
    def is_production(self) -> bool:
        return self.NODE_ENV == "production"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()
