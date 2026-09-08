"""
Polaris Backend — Bootstrap Admin Script
Run ONCE on first deployment to create the initial ADMIN account.
Reads credentials from environment variables — never hardcoded.

Usage:
    python scripts/bootstrap_admin.py

Prerequisites:
    - DATABASE_URL set in .env
    - BOOTSTRAP_ADMIN_ID, BOOTSTRAP_ADMIN_PASSWORD, BOOTSTRAP_ADMIN_NAME set
    - Alembic migrations already applied: alembic upgrade head
"""
import asyncio
import sys
import os

# Ensure project root is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config.settings import settings
from app.core.security import hash_password
from app.db.models import User, UserRole, UserStatus


async def bootstrap() -> None:
    if not settings.BOOTSTRAP_ADMIN_ID or not settings.BOOTSTRAP_ADMIN_PASSWORD:
        print("[ERROR] BOOTSTRAP_ADMIN_ID and BOOTSTRAP_ADMIN_PASSWORD must be set in .env")
        sys.exit(1)

    if settings.BOOTSTRAP_ADMIN_PASSWORD in ("CHANGE_ME_STRONG_PASSWORD_BEFORE_RUNNING", ""):
        print("[ERROR] Change BOOTSTRAP_ADMIN_PASSWORD from the placeholder before running")
        sys.exit(1)

    if len(settings.BOOTSTRAP_ADMIN_PASSWORD) < 12:
        print("[ERROR] BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters")
        sys.exit(1)

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as db:
        # Check if admin already exists
        result = await db.execute(
            select(User).where(User.employee_id == settings.BOOTSTRAP_ADMIN_ID.upper())
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"[SKIP] Admin '{settings.BOOTSTRAP_ADMIN_ID}' already exists. Bootstrap not needed.")
            await engine.dispose()
            return

        admin = User(
            employee_id=settings.BOOTSTRAP_ADMIN_ID.upper(),
            full_name=settings.BOOTSTRAP_ADMIN_NAME,
            password_hash=hash_password(settings.BOOTSTRAP_ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        )
        db.add(admin)
        await db.commit()
        print(f"[OK] Admin account created: {settings.BOOTSTRAP_ADMIN_ID.upper()}")
        print("[IMPORTANT] Remove BOOTSTRAP_ADMIN_PASSWORD from .env after first login.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(bootstrap())
