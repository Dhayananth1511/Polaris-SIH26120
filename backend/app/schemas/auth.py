"""
Polaris Backend — Auth Pydantic Schemas
"""
import re
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ── Login ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    employee_id: str = Field(..., min_length=3, max_length=50, examples=["OIL-OP-4102"])
    password: str = Field(..., min_length=1, max_length=256)

    model_config = {"extra": "forbid"}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class UserInfo(BaseModel):
    id: uuid.UUID
    employee_id: str
    full_name: str
    role: str
    status: str

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    success: bool = True
    data: TokenResponse
    user: UserInfo


# ── Change Password ───────────────────────────────────────────────────────────

COMMON_PASSWORDS = {
    "password", "password123", "123456", "admin", "admin123",
    "polaris", "oilindia", "qwerty", "welcome", "changeme",
}

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=256)
    new_password: str = Field(..., min_length=10, max_length=256)
    confirm_password: str = Field(..., min_length=10, max_length=256)

    model_config = {"extra": "forbid"}

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if v.lower() in COMMON_PASSWORDS:
            raise ValueError("Password is too common — choose a stronger password")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v


# ── Current User ──────────────────────────────────────────────────────────────

class MeResponse(BaseModel):
    success: bool = True
    user: UserInfo
