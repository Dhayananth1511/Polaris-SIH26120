"""
Polaris Backend — Async SQLAlchemy Engine & Session Factory
"""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config.settings import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,  # Disabled verbose stdout SQL logging to prevent I/O blocking
    pool_pre_ping=True,  # Test connection liveness before checking out of pool
    pool_size=10,        # Sane pool size for Neon's PgBouncer pooler
    max_overflow=10,
    pool_recycle=120,    # Recycle connections every 2 min before Neon idle timeout drops them
    pool_timeout=30,     # Allow up to 30s during cold starts / bursts
    connect_args={
        "statement_cache_size": 0,          # Required for PgBouncer transaction pooling (Neon)
        "prepared_statement_cache_size": 0, # Ensure asyncpg does not cache prepared statements
        "timeout": 30,                      # Asyncpg connection timeout in seconds
        "command_timeout": 60,              # Query timeout in seconds
    },
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
