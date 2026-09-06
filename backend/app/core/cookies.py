"""
Polaris Backend — Secure Cookie Helpers
Refresh tokens are stored in HttpOnly + Secure cookies — never exposed to JS.
"""
from datetime import datetime, timezone, timedelta

from fastapi import Response

from app.config.settings import settings

COOKIE_NAME = "polaris_rt"


def set_refresh_cookie(response: Response, token: str) -> None:
    """Write the refresh token into a secure HttpOnly cookie."""
    max_age = settings.REFRESH_TOKEN_EXPIRES_IN * 24 * 60 * 60  # days → seconds
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.is_production,   # Secure flag only in HTTPS prod
        samesite="lax",                  # Lax: safe for same-site navigation
        max_age=max_age,
        path="/api/auth",                # Scope cookie to auth paths only
    )


def clear_refresh_cookie(response: Response) -> None:
    """Delete the refresh token cookie on logout."""
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/api/auth",
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
    )
