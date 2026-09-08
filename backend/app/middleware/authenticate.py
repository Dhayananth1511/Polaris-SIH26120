"""
Polaris Backend — Authentication Middleware
Extracts and validates JWT access tokens from the Authorization header.
Answers: "Who are you?"
"""
import uuid
from typing import Optional

import structlog
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tokens import decode_access_token
from app.db.base import get_db
from app.db.models import User, UserStatus
from app.errors.exceptions import (
    AccountDisabledError,
    AccountLockedError,
    UnauthenticatedError,
)
from app.repositories.user_repo import UserRepository

logger = structlog.get_logger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency: validates access token, returns the authenticated User.
    Raises UnauthenticatedError if token is missing, invalid, or expired.
    """
    if not credentials:
        raise UnauthenticatedError()

    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError:
        raise UnauthenticatedError()

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise UnauthenticatedError()

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise UnauthenticatedError()

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)

    if user is None or user.deleted_at is not None:
        raise UnauthenticatedError()

    if user.status == UserStatus.DISABLED:
        raise AccountDisabledError()

    # LOCKED status with future locked_until is still actively locked
    from datetime import datetime, timezone
    if user.status == UserStatus.LOCKED:
        if user.locked_until and user.locked_until > datetime.now(tz=timezone.utc):
            raise AccountLockedError()

    return user


# ── Optional auth (for endpoints that work both authenticated and not) ────────
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not credentials:
        return None
    try:
        return await get_current_user(credentials=credentials, db=db)
    except Exception:
        return None
