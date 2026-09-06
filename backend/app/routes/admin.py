"""
Polaris Backend — Admin Routes
All routes require authenticate() + authorize(ADMIN).
Operators CANNOT access any endpoint in this file.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.db.models import User, UserRole
from app.middleware.authorize import require_role
from app.schemas.operator import (
    CreateOperatorRequest,
    OperatorListItem,
    OperatorResponse,
    ResetPasswordRequest,
    UpdateStatusRequest,
)
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["Admin"])

# All admin routes require ADMIN role — declared once here
AdminAuth = Depends(require_role(UserRole.ADMIN))


def _ip(request: Request) -> Optional[str]:
    xff = request.headers.get("X-Forwarded-For")
    return xff.split(",")[0].strip() if xff else (request.client.host if request.client else None)


def _ua(request: Request) -> Optional[str]:
    return request.headers.get("User-Agent")


# ── POST /api/admin/operators ─────────────────────────────────────────────────

@router.post("/operators", status_code=201)
async def create_operator(
    request: Request,
    body: CreateOperatorRequest,
    actor: User = AdminAuth,
    db: AsyncSession = Depends(get_db),
):
    """Admin creates a new OPERATOR account. Role is NEVER taken from request body."""
    svc = AdminService(db)
    user = await svc.create_operator(
        actor=actor, data=body, ip_address=_ip(request), user_agent=_ua(request)
    )
    return {
        "success": True,
        "data": {
            "id": str(user.id),
            "employee_id": user.employee_id,
            "full_name": user.full_name,
            "role": user.role.value,
            "status": user.status.value,
        },
    }


# ── GET /api/admin/operators ──────────────────────────────────────────────────

@router.get("/operators", status_code=200)
async def list_operators(
    request: Request,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    actor: User = AdminAuth,
    db: AsyncSession = Depends(get_db),
):
    svc = AdminService(db)
    result = await svc.list_operators(page=page, limit=limit)
    return {
        "success": True,
        "data": [
            {
                "id": str(u.id),
                "employee_id": u.employee_id,
                "full_name": u.full_name,
                "role": u.role.value,
                "status": u.status.value,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
                "created_at": u.created_at.isoformat(),
            }
            for u in result["data"]
        ],
        "total": result["total"],
        "page": result["page"],
        "limit": result["limit"],
        "pages": result["pages"],
    }


# ── GET /api/admin/operators/:id ──────────────────────────────────────────────

@router.get("/operators/{operator_id}", status_code=200)
async def get_operator(
    operator_id: uuid.UUID,
    actor: User = AdminAuth,
    db: AsyncSession = Depends(get_db),
):
    svc = AdminService(db)
    u = await svc.get_operator(operator_id)
    return {
        "success": True,
        "data": {
            "id": str(u.id),
            "employee_id": u.employee_id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role.value,
            "status": u.status.value,
            "failed_login_attempts": u.failed_login_attempts,
            "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            "created_at": u.created_at.isoformat(),
            "created_by": str(u.created_by) if u.created_by else None,
        },
    }


# ── PATCH /api/admin/operators/:id/status ─────────────────────────────────────

@router.patch("/operators/{operator_id}/status", status_code=200)
async def update_operator_status(
    request: Request,
    operator_id: uuid.UUID,
    body: UpdateStatusRequest,
    actor: User = AdminAuth,
    db: AsyncSession = Depends(get_db),
):
    svc = AdminService(db)
    await svc.update_status(
        actor=actor,
        operator_id=operator_id,
        new_status=body.status,
        ip_address=_ip(request),
        user_agent=_ua(request),
    )
    return {"success": True, "message": f"Operator status updated to {body.status}"}


# ── POST /api/admin/operators/:id/reset-password ──────────────────────────────

@router.post("/operators/{operator_id}/reset-password", status_code=200)
async def reset_operator_password(
    request: Request,
    operator_id: uuid.UUID,
    body: ResetPasswordRequest,
    actor: User = AdminAuth,
    db: AsyncSession = Depends(get_db),
):
    svc = AdminService(db)
    await svc.reset_password(
        actor=actor,
        operator_id=operator_id,
        new_password=body.new_password,
        ip_address=_ip(request),
        user_agent=_ua(request),
    )
    return {"success": True, "message": "Password reset. Operator must re-login."}


# ── POST /api/admin/operators/:id/revoke-sessions ─────────────────────────────

@router.post("/operators/{operator_id}/revoke-sessions", status_code=200)
async def revoke_operator_sessions(
    request: Request,
    operator_id: uuid.UUID,
    actor: User = AdminAuth,
    db: AsyncSession = Depends(get_db),
):
    svc = AdminService(db)
    count = await svc.revoke_sessions(
        actor=actor,
        operator_id=operator_id,
        ip_address=_ip(request),
        user_agent=_ua(request),
    )
    return {"success": True, "message": f"Revoked {count} active sessions"}


# ── DELETE /api/admin/operators/:id ──────────────────────────────────────────

@router.delete("/operators/{operator_id}", status_code=200)
async def delete_operator(
    request: Request,
    operator_id: uuid.UUID,
    actor: User = AdminAuth,
    db: AsyncSession = Depends(get_db),
):
    svc = AdminService(db)
    await svc.delete_operator(
        actor=actor,
        operator_id=operator_id,
        ip_address=_ip(request),
        user_agent=_ua(request),
    )
    return {"success": True, "message": "Operator deactivated"}


# ── GET /api/admin/audit-logs ─────────────────────────────────────────────────

@router.get("/audit-logs", status_code=200)
async def get_audit_logs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    action: Optional[str] = Query(default=None),
    actor: User = AdminAuth,
    db: AsyncSession = Depends(get_db),
):
    svc = AdminService(db)
    logs = await svc.get_audit_logs(page=page, limit=limit, action_filter=action)
    return {
        "success": True,
        "data": [
            {
                "id": str(log.id),
                "action": log.action,
                "actor_user_id": str(log.actor_user_id) if log.actor_user_id else None,
                "target_user_id": str(log.target_user_id) if log.target_user_id else None,
                "metadata": log.metadata_,
                "ip_address": log.ip_address,
                "timestamp": log.timestamp.isoformat(),
            }
            for log in logs
        ],
    }


# ── GET /api/admin/operators/:id/audit ───────────────────────────────────────

@router.get("/operators/{operator_id}/audit", status_code=200)
async def get_operator_audit(
    operator_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    actor: User = AdminAuth,
    db: AsyncSession = Depends(get_db),
):
    svc = AdminService(db)
    logs = await svc.get_operator_audit(operator_id, page=page, limit=limit)
    return {
        "success": True,
        "data": [
            {
                "id": str(log.id),
                "action": log.action,
                "metadata": log.metadata_,
                "ip_address": log.ip_address,
                "timestamp": log.timestamp.isoformat(),
            }
            for log in logs
        ],
    }
