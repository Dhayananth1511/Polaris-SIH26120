"""
Polaris Backend — Admin Service
Business logic for operator lifecycle management.
All operations require ADMIN role (enforced at the route level).
"""
import math
import uuid
from typing import Optional

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.logger import write_audit
from app.core.security import hash_password
from app.db.models import AuditAction, User, UserRole, UserStatus
from app.errors.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.repositories.audit_repo import AuditRepository
from app.repositories.session_repo import SessionRepository
from app.repositories.user_repo import UserRepository
from app.schemas.operator import CreateOperatorRequest, OperatorResponse

logger = structlog.get_logger(__name__)


class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.session_repo = SessionRepository(db)
        self.audit_repo = AuditRepository(db)

    # ── Create Operator ───────────────────────────────────────────────────────

    async def create_operator(
        self,
        *,
        actor: User,
        data: CreateOperatorRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> User:
        # Check for duplicate employee_id
        existing = await self.user_repo.get_by_employee_id(data.employee_id)
        if existing:
            raise ConflictError(f"Employee ID '{data.employee_id}' is already registered")

        # Role is ALWAYS OPERATOR here — client cannot choose
        new_user = await self.user_repo.create(
            employee_id=data.employee_id,
            full_name=data.full_name,
            email=data.email,
            password_hash=hash_password(data.password),
            role=UserRole.OPERATOR,  # ← hardcoded, never from request
            created_by=actor.id,
        )

        await write_audit(
            session=self.db,
            action=AuditAction.USER_CREATED,
            actor_user_id=actor.id,
            target_user_id=new_user.id,
            resource_type="user",
            resource_id=new_user.id,
            metadata={"employee_id": new_user.employee_id, "role": "OPERATOR"},
            ip_address=ip_address,
            user_agent=user_agent,
        )

        logger.info("operator_created", by=str(actor.id), new_user=str(new_user.id))
        return new_user

    # ── List Operators ────────────────────────────────────────────────────────

    async def list_operators(self, page: int = 1, limit: int = 20) -> dict:
        offset = (page - 1) * limit
        operators = await self.user_repo.get_all_operators(offset=offset, limit=limit)
        total = await self.user_repo.count_operators()
        return {
            "data": operators,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": math.ceil(total / limit) if total else 1,
        }

    # ── Get Operator ──────────────────────────────────────────────────────────

    async def get_operator(self, operator_id: uuid.UUID) -> User:
        user = await self.user_repo.get_by_id(operator_id)
        if not user or user.deleted_at is not None:
            raise NotFoundError("Operator")
        # Admin cannot "get" another admin through the operator API (IDOR protection)
        if user.role == UserRole.ADMIN:
            raise ForbiddenError("Cannot access admin accounts through the operator API")
        return user

    # ── Update Status ─────────────────────────────────────────────────────────

    async def update_status(
        self,
        *,
        actor: User,
        operator_id: uuid.UUID,
        new_status: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> User:
        user = await self.get_operator(operator_id)
        status_enum = UserStatus(new_status)

        await self.user_repo.update_status(user.id, status_enum)

        # When disabling, revoke all their sessions immediately
        if status_enum == UserStatus.DISABLED:
            revoked = await self.session_repo.revoke_all_for_user(user.id)
            action = AuditAction.USER_DISABLED
            metadata = {"sessions_revoked": revoked}
        elif status_enum == UserStatus.ACTIVE:
            action = AuditAction.USER_ENABLED
            metadata = {}
        else:
            action = AuditAction.USER_LOCKED
            metadata = {}

        await write_audit(
            session=self.db,
            action=action,
            actor_user_id=actor.id,
            target_user_id=user.id,
            resource_type="user",
            resource_id=user.id,
            metadata=metadata,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return user

    # ── Reset Password ────────────────────────────────────────────────────────

    async def reset_password(
        self,
        *,
        actor: User,
        operator_id: uuid.UUID,
        new_password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        user = await self.get_operator(operator_id)

        new_hash = hash_password(new_password)
        await self.user_repo.update_password(user.id, new_hash)

        # Force re-login after admin password reset
        await self.session_repo.revoke_all_for_user(user.id)

        await write_audit(
            session=self.db,
            action=AuditAction.PASSWORD_RESET,
            actor_user_id=actor.id,
            target_user_id=user.id,
            resource_type="user",
            resource_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    # ── Revoke Sessions ───────────────────────────────────────────────────────

    async def revoke_sessions(
        self,
        *,
        actor: User,
        operator_id: uuid.UUID,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> int:
        user = await self.get_operator(operator_id)
        count = await self.session_repo.revoke_all_for_user(user.id)

        await write_audit(
            session=self.db,
            action=AuditAction.ALL_SESSIONS_REVOKED,
            actor_user_id=actor.id,
            target_user_id=user.id,
            metadata={"sessions_revoked": count},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return count

    # ── Soft Delete ───────────────────────────────────────────────────────────

    async def delete_operator(
        self,
        *,
        actor: User,
        operator_id: uuid.UUID,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        user = await self.get_operator(operator_id)

        await self.session_repo.revoke_all_for_user(user.id)
        await self.user_repo.soft_delete(user.id)

        await write_audit(
            session=self.db,
            action=AuditAction.USER_DELETED,
            actor_user_id=actor.id,
            target_user_id=user.id,
            resource_type="user",
            resource_id=user.id,
            metadata={"employee_id": user.employee_id},
            ip_address=ip_address,
            user_agent=user_agent,
        )

    # ── Audit Logs ────────────────────────────────────────────────────────────

    async def get_audit_logs(
        self,
        page: int = 1,
        limit: int = 50,
        action_filter: Optional[str] = None,
    ) -> list:
        offset = (page - 1) * limit
        return await self.audit_repo.get_all(
            offset=offset,
            limit=limit,
            action_filter=action_filter,
        )

    async def get_operator_audit(
        self,
        operator_id: uuid.UUID,
        page: int = 1,
        limit: int = 50,
    ) -> list:
        await self.get_operator(operator_id)  # validates existence + role
        offset = (page - 1) * limit
        return await self.audit_repo.get_for_user(operator_id, offset=offset, limit=limit)
