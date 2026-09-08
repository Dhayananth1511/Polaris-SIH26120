"""
Polaris Backend — Operator Management Schemas (Admin-only)
"""
import re
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.schemas.auth import COMMON_PASSWORDS


# ── Create Operator ───────────────────────────────────────────────────────────

class CreateOperatorRequest(BaseModel):
    employee_id: str = Field(..., min_length=3, max_length=50, examples=["OIL-OP-4102"])
    full_name: str = Field(..., min_length=2, max_length=255)
    email: Optional[str] = Field(default=None, max_length=255)
    password: str = Field(..., min_length=10, max_length=256)

    model_config = {"extra": "forbid"}

    @field_validator("employee_id")
    @classmethod
    def validate_employee_id(cls, v: str) -> str:
        if not re.match(r"^OIL-[A-Z]+-\d+$", v):
            raise ValueError("employee_id must follow format OIL-XX-NNNN (e.g. OIL-OP-4102)")
        return v.upper()

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not re.match(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$", v):
                raise ValueError("Invalid email address")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if v.lower() in COMMON_PASSWORDS:
            raise ValueError("Password is too common")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


# ── Update Status ─────────────────────────────────────────────────────────────

class UpdateStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(ACTIVE|DISABLED|LOCKED)$")
    model_config = {"extra": "forbid"}


# ── Reset Password (admin sets a new one) ─────────────────────────────────────

class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=10, max_length=256)

    model_config = {"extra": "forbid"}

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if v.lower() in COMMON_PASSWORDS:
            raise ValueError("Password is too common")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


# ── Operator Response (never returns password_hash) ───────────────────────────

class OperatorResponse(BaseModel):
    id: uuid.UUID
    employee_id: str
    full_name: str
    email: Optional[str]
    role: str
    status: str
    failed_login_attempts: int
    last_login_at: Optional[datetime]
    created_at: datetime
    created_by: Optional[uuid.UUID]

    model_config = {"from_attributes": True}


class OperatorListItem(BaseModel):
    id: uuid.UUID
    employee_id: str
    full_name: str
    role: str
    status: str
    last_login_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}
