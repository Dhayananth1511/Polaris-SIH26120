"""
Unit Tests — Security & Tokens
Verifies Argon2id password hashing and JWT token lifecycle.
"""
import pytest
from datetime import timedelta
from jose import JWTError, jwt

from app.config.settings import settings
from app.core.security import hash_password, verify_password
from app.core.tokens import (
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_refresh_token,
    _utcnow,
)


def test_password_hashing_and_verification():
    password = "SuperSecretPassword123!"
    hashed = hash_password(password)
    
    assert hashed != password
    assert hashed.startswith("$argon2id$")
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False


def test_password_empty_verification_failure():
    password = "MySecurePassword456$"
    hashed = hash_password(password)
    assert verify_password("", hashed) is False
    assert verify_password("other", "") is False


def test_access_token_creation_and_decoding():
    user_id = "123e4567-e89b-12d3-a456-426614174000"
    role = "ADMIN"
    session_id = "987fcdeb-51a2-43f7-9876-543210fedcba"

    token = create_access_token(
        user_id=user_id,
        role=role,
        session_id=session_id,
    )

    assert isinstance(token, str)
    payload = decode_access_token(token)
    assert payload is not None
    assert payload.get("sub") == user_id
    assert payload.get("role") == role
    assert payload.get("sid") == session_id
    assert "exp" in payload


def test_access_token_expired():
    # Construct an expired JWT manually
    now = _utcnow()
    expired_payload = {
        "sub": "user-123",
        "role": "OPERATOR",
        "sid": "session-123",
        "iat": now - timedelta(hours=2),
        "exp": now - timedelta(hours=1),
        "type": "access",
    }
    expired_token = jwt.encode(expired_payload, settings.JWT_ACCESS_SECRET, algorithm="HS256")

    with pytest.raises(JWTError):
        decode_access_token(expired_token)


def test_refresh_token_generation_and_hashing():
    raw_token = generate_refresh_token()
    assert len(raw_token) > 20
    
    hash1 = hash_refresh_token(raw_token)
    assert len(hash1) == 64  # SHA-256 hex string

    # Hash verification
    hash2 = hash_refresh_token(raw_token)
    assert hash1 == hash2

    # Different tokens produce different hashes
    raw_token2 = generate_refresh_token()
    assert raw_token != raw_token2
    assert hash1 != hash_refresh_token(raw_token2)
