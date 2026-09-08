"""
Polaris Backend — Authentication Service
Business logic for login, refresh, logout, change-password.
All security decisions live here — controllers are thin.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.logger import write_audit
from app.config.settings import settings
from app.core.cookies import COOKIE_NAME, set_refresh_cookie, clear_refresh_cookie
from app.core.security import hash_password, verify_password, needs_rehash
from app.core.tokens import (
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
)
from app.db.models import AuditAction, User, UserRole, UserStatus
from app.errors.exceptions import (
    AccountDisabledError,
    AccountLockedError,
    InvalidCredentialsError,
    SessionExpiredError,
    UnauthenticatedError,
    ValidationError,
)
from app.repositories.session_repo import SessionRepository
from app.repositories.user_repo import UserRepository
from app.schemas.auth import LoginResponse, TokenResponse, UserInfo

logger = structlog.get_logger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.session_repo = SessionRepository(db)

    # ── Login ─────────────────────────────────────────────────────────────────

    async def login(
        self,
        *,
        employee_id: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> tuple[str, str, User]:
        """
        Full login flow:
        1. Find user (same error for missing vs wrong password — no enumeration)
        2. Check status
        3. Verify Argon2 hash
        4. Track failed attempts / apply lockout
        5. Create session
        6. Return (access_token, refresh_token_raw, user)
        """
        now = datetime.now(tz=timezone.utc)

        # Step 1: Locate user — never hint whether the ID exists
        user = await self.user_repo.get_by_employee_id(employee_id)

        if user is None or user.deleted_at is not None:
            # Still spend time on a dummy hash to prevent timing attacks
            verify_password("dummy", "$argon2id$v=19$m=65536,t=3,p=4$dummysalt1234567$dummyhash123456789012345678901234")
            await write_audit(
                session=self.db,
                action=AuditAction.LOGIN_FAILED,
                metadata={"reason": "user_not_found", "employee_id": employee_id},
                ip_address=ip_address,
                user_agent=user_agent,
            )
            raise InvalidCredentialsError()

        # Step 2: Status checks
        if user.status == UserStatus.DISABLED:
            await write_audit(
                session=self.db,
                action=AuditAction.LOGIN_FAILED,
                actor_user_id=user.id,
                metadata={"reason": "account_disabled"},
                ip_address=ip_address,
                user_agent=user_agent,
            )
            # Use same generic error — don't reveal that account is disabled
            raise InvalidCredentialsError()

        if user.status == UserStatus.LOCKED:
            if user.locked_until and user.locked_until > now:
                remaining = int((user.locked_until - now).total_seconds() / 60) + 1
                raise AccountLockedError(minutes=remaining)
            else:
                # Lock has expired — auto-unlock
                await self.user_repo.update_status(user.id, UserStatus.ACTIVE)

        # Step 3: Verify password
        password_ok = verify_password(password, user.password_hash)

        if not password_ok:
            attempts = await self.user_repo.increment_failed_attempts(user.id)
            await write_audit(
                session=self.db,
                action=AuditAction.LOGIN_FAILED,
                actor_user_id=user.id,
                metadata={"reason": "wrong_password", "attempts": attempts},
                ip_address=ip_address,
                user_agent=user_agent,
            )

            if attempts >= settings.MAX_LOGIN_ATTEMPTS:
                locked_until = now + timedelta(minutes=settings.LOCK_DURATION_MINUTES)
                await self.user_repo.lock_user(user.id, locked_until)
                await write_audit(
                    session=self.db,
                    action=AuditAction.USER_LOCKED,
                    actor_user_id=user.id,
                    target_user_id=user.id,
                    metadata={"reason": "max_attempts_exceeded", "locked_until": locked_until.isoformat()},
                    ip_address=ip_address,
                    user_agent=user_agent,
                )

            raise InvalidCredentialsError()

        # Step 4: Success — reset counters, create session
        await self.user_repo.reset_failed_attempts(user.id)

        # Rehash if Argon2 parameters have been updated
        if needs_rehash(user.password_hash):
            new_hash = hash_password(password)
            await self.user_repo.update_password(user.id, new_hash)

        refresh_token_raw = generate_refresh_token()
        session = await self.session_repo.create(
            user_id=user.id,
            refresh_token_raw=refresh_token_raw,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        access_token = create_access_token(
            user_id=str(user.id),
            role=user.role.value,
            session_id=str(session.id),
        )

        await write_audit(
            session=self.db,
            action=AuditAction.LOGIN_SUCCESS,
            actor_user_id=user.id,
            metadata={"session_id": str(session.id)},
            ip_address=ip_address,
            user_agent=user_agent,
        )

        logger.info("login_success", user_id=str(user.id), role=user.role.value)
        return access_token, refresh_token_raw, user

    # ── Refresh Token ─────────────────────────────────────────────────────────

    async def refresh(
        self,
        *,
        raw_refresh_token: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> tuple[str, str]:
        """
        Refresh token rotation:
        1. Look up session by hashed token
        2. Check validity (not revoked, not expired)
        3. If revoked → reuse attack detected → revoke entire user's sessions
        4. Rotate: revoke old, create new session
        5. Return new (access_token, refresh_token_raw)
        """
        token_hash = hash_refresh_token(raw_refresh_token)
        session = await self.session_repo.get_by_token_hash(token_hash)

        if session is None:
            raise UnauthenticatedError()

        now = datetime.now(tz=timezone.utc)

        # REUSE DETECTION: if already revoked → compromise detected
        if session.revoked_at is not None:
            logger.warning(
                "refresh_token_reuse_detected",
                user_id=str(session.user_id),
                session_id=str(session.id),
            )
            # Revoke all sessions to limit damage
            await self.session_repo.revoke_all_for_user(session.user_id)
            await write_audit(
                session=self.db,
                action=AuditAction.REFRESH_TOKEN_REUSE,
                actor_user_id=session.user_id,
                metadata={"session_id": str(session.id)},
                ip_address=ip_address,
                user_agent=user_agent,
            )
            raise UnauthenticatedError()

        if session.expires_at <= now:
            raise SessionExpiredError()

        # Validate user is still valid
        user = await self.user_repo.get_by_id(session.user_id)
        if user is None or user.deleted_at is not None or user.status == UserStatus.DISABLED:
            await self.session_repo.revoke(session.id)
            raise UnauthenticatedError()

        # Rotate
        new_raw = generate_refresh_token()
        new_session = await self.session_repo.rotate(
            old_session_id=session.id,
            user_id=user.id,
            new_raw_token=new_raw,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        new_access = create_access_token(
            user_id=str(user.id),
            role=user.role.value,
            session_id=str(new_session.id),
        )

        await write_audit(
            session=self.db,
            action=AuditAction.TOKEN_REFRESH,
            actor_user_id=user.id,
            metadata={"new_session_id": str(new_session.id)},
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return new_access, new_raw

    # ── Logout ────────────────────────────────────────────────────────────────

    async def logout(
        self,
        *,
        current_user: User,
        raw_refresh_token: Optional[str],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        if raw_refresh_token:
            session = await self.session_repo.get_by_raw_token(raw_refresh_token)
            if session and session.user_id == current_user.id:
                await self.session_repo.revoke(session.id)

        await write_audit(
            session=self.db,
            action=AuditAction.LOGOUT,
            actor_user_id=current_user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    async def logout_all(
        self,
        *,
        current_user: User,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> int:
        """Revoke all active sessions. Returns count revoked."""
        count = await self.session_repo.revoke_all_for_user(current_user.id)
        await write_audit(
            session=self.db,
            action=AuditAction.ALL_SESSIONS_REVOKED,
            actor_user_id=current_user.id,
            metadata={"sessions_revoked": count},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return count

    # ── Change Password ───────────────────────────────────────────────────────

    async def change_password(
        self,
        *,
        current_user: User,
        current_password: str,
        new_password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        if not verify_password(current_password, current_user.password_hash):
            raise InvalidCredentialsError()

        new_hash = hash_password(new_password)
        await self.user_repo.update_password(current_user.id, new_hash)

        # Revoke all sessions — user must re-login after password change
        await self.session_repo.revoke_all_for_user(current_user.id)

        await write_audit(
            session=self.db,
            action=AuditAction.PASSWORD_CHANGED,
            actor_user_id=current_user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
