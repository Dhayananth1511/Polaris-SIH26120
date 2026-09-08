"""
Polaris Backend — Secure Cookie Helpers
Refresh tokens are stored in HttpOnly + Secure cookies — never exposed to JS.
"""
from typing import Literal, cast

from fastapi import Response

from app.config.settings import settings

COOKIE_NAME = "polaris_rt"

SameSiteType = Literal["lax", "none", "strict"]


def _get_samesite() -> SameSiteType:
    raw = str(getattr(settings, "COOKIE_SAMESITE", "lax")).lower()
    if raw in ("lax", "none", "strict"):
        return cast(SameSiteType, raw)
    return "lax"


def set_refresh_cookie(response: Response, token: str) -> None:
    """Write the refresh token into a secure HttpOnly cookie."""
    max_age = settings.REFRESH_TOKEN_EXPIRES_IN * 24 * 60 * 60  # days → seconds
    samesite = _get_samesite()
    # RFC 6265bis: SameSite=None requires Secure=True
    is_secure = True if samesite == "none" else settings.is_production
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=is_secure,
        samesite=samesite,
        max_age=max_age,
        path="/api/auth",                # Scope cookie to auth paths only
    )


def clear_refresh_cookie(response: Response) -> None:
    """Delete the refresh token cookie on logout."""
    samesite = _get_samesite()
    is_secure = True if samesite == "none" else settings.is_production
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/api/auth",
        httponly=True,
        secure=is_secure,
        samesite=samesite,
    )
