"""
Polaris Backend — Alerts API Routes
GET   /api/alerts                  list alerts (filterable)
PATCH /api/alerts/{id}/acknowledge mark alert acknowledged
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.db.models import Alert
from app.utils.cache import cache
from starlette.requests import Request

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/alerts", tags=["Alerts"])


def _alert_to_dict(a: Alert) -> dict:
    ago = ""
    if a.created_at:
        diff = datetime.now(timezone.utc) - a.created_at.replace(tzinfo=timezone.utc)
        total_minutes = int(diff.total_seconds() / 60)
        if total_minutes < 60:
            ago = f"{total_minutes} min ago"
        elif total_minutes < 1440:
            ago = f"{total_minutes // 60} hr ago"
        else:
            ago = f"{total_minutes // 1440} days ago"

    return {
        "id": str(a.id),
        "wellId": a.well_id,
        "wellName": f"Well {a.well_id}",
        "message": a.message,
        "severity": a.severity,
        "alertType": a.alert_type,
        "category": a.category,
        "rootCause": a.root_cause,
        "recommendedAction": a.recommended_action,
        "metric": a.metric,
        "threshold": a.threshold,
        "actual": a.actual_value,
        "timestamp": ago or str(a.created_at),
        "acknowledged": a.acknowledged,
    }


@router.get("")
async def list_alerts(
    request: Request,
    db: AsyncSession = Depends(get_db),
    well_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    page: int = Query(1, ge=1),
):
    cache_key = f"alerts_{well_id}_{severity}_{acknowledged}_{limit}_{page}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    stmt = select(Alert).order_by(desc(Alert.created_at))
    if well_id:
        stmt = stmt.where(Alert.well_id == well_id.upper())
    if severity:
        stmt = stmt.where(Alert.severity == severity.upper())
    if acknowledged is not None:
        stmt = stmt.where(Alert.acknowledged == acknowledged)

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(total_stmt)).scalar_one()

    stmt = stmt.offset((page - 1) * limit).limit(limit)
    result = await db.execute(stmt)
    alerts = result.scalars().all()

    payload = {
        "success": True,
        "data": [_alert_to_dict(a) for a in alerts],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }
    cache.set(cache_key, payload, ttl=10.0)
    return payload


@router.patch("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    try:
        aid = uuid.UUID(alert_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid alert ID")

    result = await db.execute(select(Alert).where(Alert.id == aid))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.acknowledged = True
    alert.acknowledged_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(alert)
    cache.invalidate("alerts_")

    return {"success": True, "data": _alert_to_dict(alert)}
