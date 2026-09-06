"""
Polaris Backend — Engineering Approvals & Recommendations API
GET  /api/approvals                 List all recommendations & approvals
POST /api/approvals                 Create new approval request (from Simulation Lab)
POST /api/approvals/{id}/status     Approve or Reject recommendation with comments
"""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.db.models import OptimizationApproval, Well
from app.utils.cache import cache

router = APIRouter(prefix="/approvals", tags=["Approvals"])


class CreateApprovalRequest(BaseModel):
    well_id: str
    recommendation: str
    impact: str
    submitted_by: Optional[str] = "Simulation Lab (Engineer)"
    comment: Optional[str] = None
    setpoints: Optional[dict] = None


class UpdateApprovalStatusRequest(BaseModel):
    status: str  # Approved, Rejected, Pending
    comment: Optional[str] = None
    reviewed_by: Optional[str] = "Field Operations Engineer"


# Initial seed templates for Baghewala wells BGW-001 - BGW-008
SEED_RECOMMENDATIONS = [
    {
        "well_id": "BGW-001",
        "recommendation": "Reduce SPM to 5.1 & VFD to 36 Hz",
        "impact": "+14% Net Oil Rate, -8% Rod Tension",
        "status": "Pending",
        "submitted_by": "AI Optimizer (XGBoost Engine)",
        "comment": "Looks good. Within operating limits. -- Field Engineer",
        "setpoints": {"spm": 5.1, "vfd": 36, "stroke": 66, "steamVol": 735},
    },
    {
        "well_id": "BGW-002",
        "recommendation": "Adjust steam volume to 750 t",
        "impact": "-8.2% SOR Efficiency",
        "status": "Approved",
        "submitted_by": "CSS Cycle Optimizer",
        "comment": "Approved by Field Manager - Vikram Nair",
        "setpoints": {"steamVol": 750, "pressure": 21, "soak": 68},
    },
    {
        "well_id": "BGW-007",
        "recommendation": "Emergency SPM derating to 4.8 & soak extension",
        "impact": "-18% Polished Rod Stress, +11% Rate",
        "status": "Pending",
        "submitted_by": "Predictive Failure Diagnostics",
        "comment": "High rod load detected. Immediate mechanical derate recommended.",
        "setpoints": {"spm": 4.8, "stroke": 64, "vfd": 34},
    },
    {
        "well_id": "BGW-003",
        "recommendation": "Optimize VFD frequency to 38 Hz",
        "impact": "-7.1% Motor Power Consumption",
        "status": "Rejected",
        "submitted_by": "SRP Optimizer",
        "comment": "Motor drive current fluctuation exceeds field tolerance threshold.",
        "setpoints": {"vfd": 38, "spm": 5.4},
    },
    {
        "well_id": "BGW-005",
        "recommendation": "Adjust injection pressure to 21 bar",
        "impact": "+9.4% Net Oil Production",
        "status": "Approved",
        "submitted_by": "Joint CSS+SRP Optimizer",
        "comment": "Approved by Lead Engineer Rajan Sharma",
        "setpoints": {"pressure": 21, "steamVol": 780},
    },
    {
        "well_id": "BGW-004",
        "recommendation": "Post-steam soak extension to 72h",
        "impact": "+12.1% Thermal Chamber Sweep",
        "status": "Pending",
        "submitted_by": "Thermal Reservoir Simulator",
        "comment": "Awaiting thermal pressure balance confirmation.",
        "setpoints": {"soak": 72, "steamVol": 720},
    },
    {
        "well_id": "BGW-006",
        "recommendation": "Tune stroke length to 64 in",
        "impact": "-6.5% Gearbox Torque Overload",
        "status": "Approved",
        "submitted_by": "SRP Kinematic Analyzer",
        "comment": "Approved and scheduled for surface unit adjustment.",
        "setpoints": {"stroke": 64, "spm": 5.2},
    },
    {
        "well_id": "BGW-008",
        "recommendation": "Cycle #04 steam enthalpy optimization",
        "impact": "+10.3% Net Oil Rate",
        "status": "Pending",
        "submitted_by": "CSS Cycle Planner",
        "comment": "Recommended prior to Cycle 4 injection commencement.",
        "setpoints": {"steamVol": 740, "pressure": 22, "soak": 64},
    },
]


@router.get("")
async def list_approvals(
    status: Optional[str] = None,
    well_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"approvals_{status}_{well_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # Check if approvals exist in table; if not, auto-seed
    count_stmt = select(OptimizationApproval)
    existing = (await db.execute(count_stmt)).scalars().all()

    if not existing:
        for seed in SEED_RECOMMENDATIONS:
            appr = OptimizationApproval(
                well_id=seed["well_id"],
                recommendation=seed["recommendation"],
                impact=seed["impact"],
                status=seed["status"],
                submitted_by=seed["submitted_by"],
                comment=seed["comment"],
                setpoints=seed["setpoints"],
            )
            db.add(appr)
        await db.commit()
        existing = (await db.execute(select(OptimizationApproval))).scalars().all()

    query = select(OptimizationApproval).order_by(desc(OptimizationApproval.created_at))
    if status and status.upper() != "ALL":
        query = query.where(OptimizationApproval.status.ilike(status))
    if well_id:
        query = query.where(OptimizationApproval.well_id == well_id.upper())

    results = (await db.execute(query)).scalars().all()

    data = [
        {
            "id": str(r.id),
            "date": r.created_at.strftime("%d %b %H:%M") if r.created_at else "Today",
            "wellId": r.well_id,
            "recommendation": r.recommendation,
            "impact": r.impact,
            "status": r.status,
            "submittedBy": r.submitted_by,
            "comment": r.comment or "",
            "setpoints": r.setpoints or {},
            "reviewedBy": r.reviewed_by,
            "createdAt": r.created_at.isoformat() if r.created_at else None,
        }
        for r in results
    ]

    payload = {
        "success": True,
        "data": data,
        "total": len(data),
        "counts": {
            "pending": sum(1 for r in results if r.status == "Pending"),
            "approved": sum(1 for r in results if r.status == "Approved"),
            "rejected": sum(1 for r in results if r.status == "Rejected"),
        }
    }
    cache.set(cache_key, payload, ttl=15.0)
    return payload


@router.post("")
async def create_approval(
    req: CreateApprovalRequest,
    db: AsyncSession = Depends(get_db),
):
    wid = req.well_id.upper()
    well = (await db.execute(select(Well).where(Well.id == wid))).scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {req.well_id} not found")

    item = OptimizationApproval(
        well_id=wid,
        recommendation=req.recommendation,
        impact=req.impact,
        status="Pending",
        submitted_by=req.submitted_by or "Simulation Lab",
        comment=req.comment,
        setpoints=req.setpoints,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    cache.invalidate()  # Invalidate cache so changes appear immediately

    return {
        "success": True,
        "data": {
            "id": str(item.id),
            "wellId": item.well_id,
            "status": item.status,
            "message": "Optimization setpoint submitted to Engineering Approvals queue."
        }
    }


@router.post("/{approval_id}/status")
async def update_approval_status(
    approval_id: str,
    req: UpdateApprovalStatusRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        uid = uuid.UUID(approval_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid approval UUID format")

    item = (await db.execute(
        select(OptimizationApproval).where(OptimizationApproval.id == uid)
    )).scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Approval item not found")

    item.status = req.status.capitalize()
    if req.comment:
        item.comment = req.comment
    if req.reviewed_by:
        item.reviewed_by = req.reviewed_by
    item.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(item)
    cache.invalidate()  # Invalidate cache so changes appear immediately

    return {
        "success": True,
        "message": f"Approval #{approval_id} updated to {item.status}",
        "data": {
            "id": str(item.id),
            "wellId": item.well_id,
            "status": item.status,
            "comment": item.comment,
            "reviewedBy": item.reviewed_by,
        }
    }
