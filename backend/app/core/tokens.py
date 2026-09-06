"""
Polaris Backend — JWT Token Management
Access tokens: short-lived (15 min), carries user_id + role + session_id.
Refresh tokens: opaque random bytes, stored as SHA-256 hash in DB.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config.settings import settings


# ── Helpers ──────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


# ── Access Token ─────────────────────────────────────────────────────────────

def create_access_token(user_id: str, role: str, session_id: str) -> str:
    """Sign a short-lived JWT access token."""
    now = _utcnow()
    payload = {
        "sub": user_id,
        "role": role,
        "sid": session_id,
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRES_IN),
        "type": "access",
    }
    return jwt.encode(payload, settings.JWT_ACCESS_SECRET, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    """
    Decode and validate an access JWT.
    Raises jose.JWTError if invalid / expired.
    """
    payload = jwt.decode(token, settings.JWT_ACCESS_SECRET, algorithms=["HS256"])
    if payload.get("type") != "access":
        raise JWTError("Wrong token type")
    return payload


# ── Refresh Token ─────────────────────────────────────────────────────────────

def generate_refresh_token() -> str:
    """
    Generate a cryptographically random refresh token (opaque string).
    NEVER store this raw value — always store the hash.
    """
    return secrets.token_urlsafe(64)


def hash_refresh_token(raw: str) -> str:
    """SHA-256 hash of the raw refresh token for secure DB storage."""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def refresh_token_expiry() -> datetime:
    return _utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRES_IN)
