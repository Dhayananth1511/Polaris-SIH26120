"""
Polaris Backend — Auth Routes
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/logout-all
GET  /api/auth/me
POST /api/auth/change-password
"""
from typing import Optional

import structlog
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cookies import COOKIE_NAME, clear_refresh_cookie, set_refresh_cookie
from app.config.settings import settings
from app.db.base import get_db
from app.db.models import User
from app.middleware.authenticate import get_current_user
from app.middleware.rate_limit import limiter
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    MeResponse,
    TokenResponse,
    UserInfo,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = structlog.get_logger(__name__)


def _client_ip(request: Request) -> Optional[str]:
    xff = request.headers.get("X-Forwarded-For")
    return xff.split(",")[0].strip() if xff else request.client.host if request.client else None


def _user_agent(request: Request) -> Optional[str]:
    return request.headers.get("User-Agent")


# ── POST /api/auth/login ──────────────────────────────────────────────────────

@router.post("/login", response_model=None, status_code=200)
@limiter.limit("10/minute")  # Strict: 10 login attempts per IP per minute
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate with employee_id + password.
    Returns short-lived access token in body.
    Sets long-lived refresh token in HttpOnly cookie.
    """
    svc = AuthService(db)
    access_token, refresh_token, user = await svc.login(
        employee_id=body.employee_id,
        password=body.password,
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )

    set_refresh_cookie(response, refresh_token)

    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRES_IN * 60,
        },
        "user": {
            "id": str(user.id),
            "employee_id": user.employee_id,
            "full_name": user.full_name,
            "role": user.role.value,
            "status": user.status.value,
        },
    }


# ── POST /api/auth/refresh ────────────────────────────────────────────────────

@router.post("/refresh", status_code=200)
@limiter.limit("30/minute")
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Rotate refresh token. Old token is invalidated; new token set in cookie.
    If a revoked token is presented, all user sessions are nuked (reuse detection).
    """
    raw = request.cookies.get(COOKIE_NAME)
    if not raw:
        from app.errors.exceptions import UnauthenticatedError
        raise UnauthenticatedError()

    svc = AuthService(db)
    new_access, new_refresh = await svc.refresh(
        raw_refresh_token=raw,
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )

    set_refresh_cookie(response, new_refresh)

    return {
        "success": True,
        "data": {
            "access_token": new_access,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRES_IN * 60,
        },
    }


# ── POST /api/auth/logout ─────────────────────────────────────────────────────

@router.post("/logout", status_code=200)
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    raw = request.cookies.get(COOKIE_NAME)
    svc = AuthService(db)
    await svc.logout(
        current_user=current_user,
        raw_refresh_token=raw,
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    clear_refresh_cookie(response)
    return {"success": True, "message": "Logged out successfully"}


# ── POST /api/auth/logout-all ─────────────────────────────────────────────────

@router.post("/logout-all", status_code=200)
async def logout_all(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    count = await svc.logout_all(
        current_user=current_user,
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    clear_refresh_cookie(response)
    return {"success": True, "message": f"Revoked {count} active sessions"}


# ── GET /api/auth/me ──────────────────────────────────────────────────────────

@router.get("/me", response_model=MeResponse)
async def me(current_user: User = Depends(get_current_user)):
    return {
        "success": True,
        "user": {
            "id": current_user.id,
            "employee_id": current_user.employee_id,
            "full_name": current_user.full_name,
            "role": current_user.role.value,
            "status": current_user.status.value,
        },
    }


# ── POST /api/auth/change-password ────────────────────────────────────────────

@router.post("/change-password", status_code=200)
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    response: Response,
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    await svc.change_password(
        current_user=current_user,
        current_password=body.current_password,
        new_password=body.new_password,
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )
    clear_refresh_cookie(response)
    return {"success": True, "message": "Password changed. Please log in again."}
