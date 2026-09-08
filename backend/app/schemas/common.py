"""
Polaris Backend — Shared Pydantic Schemas
"""
import uuid
from typing import Any, Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    data: List[T]
    total: int
    page: int
    limit: int
    pages: int
