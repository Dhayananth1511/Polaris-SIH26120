"""
Polaris Backend — User Repository
All DB access for the users table goes through here.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User, UserRole, UserStatus


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.id == user_id, User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_by_employee_id(self, employee_id: str) -> Optional[User]:
        """Case-insensitive lookup for login. Does NOT filter deleted users on purpose
        (so we can check if someone is trying to use a deactivated account)."""
        result = await self.db.execute(
            select(User).where(User.employee_id == employee_id.upper())
        )
        return result.scalar_one_or_none()

    async def get_all_operators(self, offset: int = 0, limit: int = 20):
        result = await self.db.execute(
            select(User)
            .where(User.role == UserRole.OPERATOR, User.deleted_at.is_(None))
            .order_by(User.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return result.scalars().all()

    async def count_operators(self) -> int:
        from sqlalchemy import func, select
        result = await self.db.execute(
            select(func.count()).select_from(User).where(
                User.role == UserRole.OPERATOR, User.deleted_at.is_(None)
            )
        )
        return result.scalar_one()

    async def create(
        self,
        *,
        employee_id: str,
        full_name: str,
        password_hash: str,
        role: UserRole,
        email: Optional[str] = None,
        created_by: Optional[uuid.UUID] = None,
    ) -> User:
        user = User(
            employee_id=employee_id.upper(),
            full_name=full_name,
            email=email,
            password_hash=password_hash,
            role=role,
            created_by=created_by,
        )
        self.db.add(user)
        await self.db.flush()
        return user

    async def update_status(self, user_id: uuid.UUID, status: UserStatus) -> None:
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(status=status, updated_at=datetime.now(tz=timezone.utc))
        )

    async def increment_failed_attempts(self, user_id: uuid.UUID) -> int:
        """Increment failed_login_attempts and return the new count."""
        user = await self.get_by_id(user_id)
        if user:
            user.failed_login_attempts += 1
            await self.db.flush()
            return user.failed_login_attempts
        return 0

    async def reset_failed_attempts(self, user_id: uuid.UUID) -> None:
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(
                failed_login_attempts=0,
                locked_until=None,
                status=UserStatus.ACTIVE,
                last_login_at=datetime.now(tz=timezone.utc),
            )
        )

    async def lock_user(self, user_id: uuid.UUID, locked_until: datetime) -> None:
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(status=UserStatus.LOCKED, locked_until=locked_until)
        )

    async def update_password(
        self, user_id: uuid.UUID, password_hash: str
    ) -> None:
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(
                password_hash=password_hash,
                password_changed_at=datetime.now(tz=timezone.utc),
                updated_at=datetime.now(tz=timezone.utc),
            )
        )

    async def soft_delete(self, user_id: uuid.UUID) -> None:
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(
                deleted_at=datetime.now(tz=timezone.utc),
                status=UserStatus.DISABLED,
            )
        )
