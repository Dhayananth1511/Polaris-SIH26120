"""
Polaris Backend — Session Repository
Manages refresh token sessions. Tokens are stored as SHA-256 hashes — never raw.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Session
from app.core.tokens import hash_refresh_token, refresh_token_expiry


class SessionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        *,
        user_id: uuid.UUID,
        refresh_token_raw: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Session:
        """Store a new session with the hashed refresh token."""
        session = Session(
            user_id=user_id,
            refresh_token_hash=hash_refresh_token(refresh_token_raw),
            expires_at=refresh_token_expiry(),
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(session)
        await self.db.flush()
        return session

    async def get_by_token_hash(self, token_hash: str) -> Optional[Session]:
        result = await self.db.execute(
            select(Session).where(Session.refresh_token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def get_by_raw_token(self, raw_token: str) -> Optional[Session]:
        return await self.get_by_token_hash(hash_refresh_token(raw_token))

    async def get_by_id(self, session_id: uuid.UUID) -> Optional[Session]:
        result = await self.db.execute(
            select(Session).where(Session.id == session_id)
        )
        return result.scalar_one_or_none()

    async def revoke(self, session_id: uuid.UUID) -> None:
        """Revoke a single session by marking revoked_at."""
        await self.db.execute(
            update(Session)
            .where(Session.id == session_id)
            .values(revoked_at=datetime.now(tz=timezone.utc))
        )

    async def revoke_all_for_user(self, user_id: uuid.UUID) -> int:
        """Revoke all active sessions for a user. Returns count revoked."""
        result = await self.db.execute(
            update(Session)
            .where(Session.user_id == user_id, Session.revoked_at.is_(None))
            .values(revoked_at=datetime.now(tz=timezone.utc))
        )
        return result.rowcount

    async def touch(self, session_id: uuid.UUID) -> None:
        """Update last_used_at timestamp on each use."""
        await self.db.execute(
            update(Session)
            .where(Session.id == session_id)
            .values(last_used_at=datetime.now(tz=timezone.utc))
        )

    async def rotate(
        self,
        old_session_id: uuid.UUID,
        user_id: uuid.UUID,
        new_raw_token: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Session:
        """
        Refresh-token rotation: revoke old session, create new one.
        This is the core of replay-attack prevention.
        """
        await self.revoke(old_session_id)
        return await self.create(
            user_id=user_id,
            refresh_token_raw=new_raw_token,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    async def get_active_sessions(self, user_id: uuid.UUID) -> list[Session]:
        now = datetime.now(tz=timezone.utc)
        result = await self.db.execute(
            select(Session).where(
                Session.user_id == user_id,
                Session.revoked_at.is_(None),
                Session.expires_at > now,
            )
        )
        return list(result.scalars().all())
