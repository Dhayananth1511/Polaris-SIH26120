"""
Polaris Backend — Audit Log Repository
Append-only reads and writes. Delete is intentionally not exposed here.
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLog


class AuditRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_for_user(
        self,
        user_id: uuid.UUID,
        offset: int = 0,
        limit: int = 50,
    ) -> list[AuditLog]:
        result = await self.db.execute(
            select(AuditLog)
            .where(
                (AuditLog.actor_user_id == user_id)
                | (AuditLog.target_user_id == user_id)
            )
            .order_by(AuditLog.timestamp.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_all(
        self,
        offset: int = 0,
        limit: int = 50,
        action_filter: Optional[str] = None,
    ) -> list[AuditLog]:
        q = select(AuditLog).order_by(AuditLog.timestamp.desc())
        if action_filter:
            q = q.where(AuditLog.action == action_filter)
        result = await self.db.execute(q.offset(offset).limit(limit))
        return list(result.scalars().all())
