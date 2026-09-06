"""
Polaris Backend — AI / ML Intelligence API Routes
==================================================
GET  /api/ai/forecast/{well_id}         XGBoost production forecast
GET  /api/ai/anomaly-scan/{well_id}     Isolation Forest scan of recent telemetry
POST /api/ai/anomaly-detect             Score a single telemetry reading
GET  /api/ai/explain/{well_id}          SHAP feature importance for latest reading
GET  /api/ai/failure-risk/{well_id}     Bayesian failure probability with CI
GET  /api/ai/piml-twin/{well_id}        Physics-Informed ML digital twin state
GET  /api/ai/status                     Model readiness / training status
"""
from datetime import timedelta
from typing import Any, Dict, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.db.models import (
    FailureEvent,
    Production,
    SRPOperation,
    Well,
    WellTelemetry,
)
from app.services.ml_engine import ml_engine
from app.services.piml_twin import piml_twin

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/ai", tags=["AI / ML Intelligence"])


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _latest_telemetry(wid: str, db: AsyncSession) -> Optional[Any]:
    res = await db.execute(
        select(WellTelemetry)
        .where(WellTelemetry.well_id == wid)
        .order_by(desc(WellTelemetry.timestamp))
        .limit(1)
    )
    return res.scalar_one_or_none()


async def _latest_srp(wid: str, db: AsyncSession) -> Optional[Any]:
    res = await db.execute(
        select(SRPOperation)
        .where(SRPOperation.well_id == wid)
        .order_by(desc(SRPOperation.timestamp))
        .limit(1)
    )
    return res.scalar_one_or_none()


async def _latest_prod(wid: str, db: AsyncSession) -> Optional[Any]:
    res = await db.execute(
        select(Production)
        .where(Production.well_id == wid)
        .order_by(desc(Production.timestamp))
        .limit(1)
    )
    return res.scalar_one_or_none()


def _tel_to_features(tel: Any, srp: Any = None) -> Dict[str, float]:
    """Extract ML feature dict from ORM telemetry (+ optional SRP) objects."""
    return {
        "reservoir_temperature_c": float(tel.reservoir_temperature_c or 68.0),
        "wellhead_temperature_c":  float(tel.wellhead_temperature_c or 52.0),
        "pressure_bar":            float(tel.pressure_bar or 18.5),
        "flow_rate_bpd":           float(tel.flow_rate_bpd or 28.5),
        "motor_power_kw":          float(tel.motor_power_kw or 22.4),
        "motor_current_a":         float(tel.motor_current_a or 38.2),
        "vibration_mm_s":          float(tel.vibration_mm_s or 2.8),
        "spm":                     float(srp.spm if srp and srp.spm else 5.5),
        "pump_efficiency_pct":     float(srp.pump_efficiency_pct if srp and srp.pump_efficiency_pct else 65.0),
    }


# ── GET /api/ai/status ─────────────────────────────────────────────────────────

@router.get("/status")
async def ai_status():
    """Check whether ML models are trained and ready."""
    return {
        "success": True,
        "data": {
            "mlEngineReady":  ml_engine._ready,
            "pimlTwinReady":  piml_twin._ready,
            "xgboostModel":   hasattr(ml_engine, "_prod_model"),
            "isolationForest": hasattr(ml_engine, "_anomaly_model"),
            "shapExplainer":  hasattr(ml_engine, "_shap_explainer"),
            "pimlResidual":   hasattr(piml_twin, "_residual_model"),
        }
    }


# ── GET /api/ai/forecast/{well_id} ────────────────────────────────────────────

@router.get("/forecast/{well_id}")
async def ai_forecast(
    well_id: str,
    days: int = Query(14, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
):
    """
    XGBoost production forecast for the next `days` days with 90% PI.
    Features sourced from latest telemetry reading in DB.
    """
    wid = well_id.upper()

    # Verify well exists
    well = (await db.execute(select(Well).where(Well.id == wid))).scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {well_id} not found")

    tel = await _latest_telemetry(wid, db)
    srp = await _latest_srp(wid, db)

    if tel:
        features = _tel_to_features(tel, srp)
    else:
        # Fallback with reservoir defaults
        features = {
            "reservoir_temperature_c": 68.0,
            "wellhead_temperature_c":  52.0,
            "pressure_bar":            18.5,
            "flow_rate_bpd":           28.5,
            "motor_power_kw":          22.4,
            "motor_current_a":         38.2,
            "vibration_mm_s":          2.8,
        }

    result = ml_engine.forecast_production(wid, features, horizon_days=days)
    result["wellId"] = wid

    return {"success": True, "data": result}


# ── GET /api/ai/anomaly-scan/{well_id} ────────────────────────────────────────

@router.get("/anomaly-scan/{well_id}")
async def ai_anomaly_scan(
    well_id: str,
    days: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """
    Scan the last `days` of telemetry for anomalies using Isolation Forest.
    Returns ranked list of anomalous readings.
    """
    wid = well_id.upper()

    well = (await db.execute(select(Well).where(Well.id == wid))).scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {well_id} not found")

    max_ts = (await db.execute(
        select(func.max(WellTelemetry.timestamp)).where(WellTelemetry.well_id == wid)
    )).scalar_one_or_none()

    rows = []
    if max_ts:
        cutoff = max_ts - timedelta(days=days)
        result = await db.execute(
            select(WellTelemetry)
            .where(WellTelemetry.well_id == wid, WellTelemetry.timestamp >= cutoff)
            .order_by(WellTelemetry.timestamp)
            .limit(200)
        )
        tel_rows = result.scalars().all()
        rows = [
            {
                "timestamp":               str(r.timestamp),
                "reservoir_temperature_c": r.reservoir_temperature_c or 68.0,
                "vibration_mm_s":          r.vibration_mm_s or 2.8,
                "motor_power_kw":          r.motor_power_kw or 22.4,
                "motor_current_a":         r.motor_current_a or 38.2,
                "pressure_bar":            r.pressure_bar or 18.5,
                "flow_rate_bpd":           r.flow_rate_bpd or 28.5,
            }
            for r in tel_rows
        ]

    scan_result = ml_engine.scan_well_anomalies(rows)
    scan_result["wellId"] = wid

    return {"success": True, "data": scan_result}


# ── POST /api/ai/anomaly-detect ───────────────────────────────────────────────

class AnomalyDetectRequest(BaseModel):
    well_id: str
    reservoir_temperature_c: float = 68.0
    vibration_mm_s: float = 2.8
    motor_power_kw: float = 22.4
    motor_current_a: float = 38.2
    pressure_bar: float = 18.5
    flow_rate_bpd: float = 28.5


@router.post("/anomaly-detect")
async def ai_anomaly_detect(req: AnomalyDetectRequest):
    """Score a single telemetry reading for anomaly probability."""
    features = {
        "reservoir_temperature_c": req.reservoir_temperature_c,
        "vibration_mm_s":          req.vibration_mm_s,
        "motor_power_kw":          req.motor_power_kw,
        "motor_current_a":         req.motor_current_a,
        "pressure_bar":            req.pressure_bar,
        "flow_rate_bpd":           req.flow_rate_bpd,
    }
    result = ml_engine.score_anomaly(features)
    result["wellId"] = req.well_id.upper()
    return {"success": True, "data": result}


# ── GET /api/ai/explain/{well_id} ─────────────────────────────────────────────

@router.get("/explain/{well_id}")
async def ai_explain(
    well_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    SHAP feature importance for the well's latest telemetry reading.
    Returns per-feature SHAP values and contribution percentages.
    """
    wid = well_id.upper()

    well = (await db.execute(select(Well).where(Well.id == wid))).scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {well_id} not found")

    tel = await _latest_telemetry(wid, db)
    srp = await _latest_srp(wid, db)

    features = _tel_to_features(tel, srp) if tel else {
        "reservoir_temperature_c": 68.0,
        "wellhead_temperature_c":  52.0,
        "pressure_bar":            18.5,
        "flow_rate_bpd":           28.5,
        "motor_power_kw":          22.4,
        "motor_current_a":         38.2,
        "vibration_mm_s":          2.8,
    }

    result = ml_engine.explain_prediction(wid, features)
    return {"success": True, "data": result}


# ── GET /api/ai/failure-risk/{well_id} ───────────────────────────────────────

@router.get("/failure-risk/{well_id}")
async def ai_failure_risk(
    well_id: str,
    observation_days: int = Query(30, ge=7, le=90),
    db: AsyncSession = Depends(get_db),
):
    """
    Bayesian Beta-Binomial failure risk estimate with 90% credible interval.
    Counts actual failure events in the observation window.
    """
    wid = well_id.upper()

    well = (await db.execute(select(Well).where(Well.id == wid))).scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {well_id} not found")

    max_ts = (await db.execute(
        select(func.max(FailureEvent.timestamp)).where(FailureEvent.well_id == wid)
    )).scalar_one_or_none()

    recent_failures = 0
    if max_ts:
        cutoff = max_ts - timedelta(days=observation_days)
        count_res = await db.execute(
            select(func.count()).select_from(FailureEvent)
            .where(FailureEvent.well_id == wid, FailureEvent.timestamp >= cutoff)
        )
        recent_failures = int(count_res.scalar_one() or 0)

    result = ml_engine.bayesian_failure_risk(
        well_id=wid,
        recent_failures=recent_failures,
        observation_days=observation_days,
    )

    # Also fetch latest prod data to enrich response
    prod = await _latest_prod(wid, db)
    if prod:
        result["latestWaterCut"] = round(float(prod.water_cut_pct or 0), 1)
        result["latestSOR"]      = round(float(prod.sor or 0), 2)

    return {"success": True, "data": result}


# ── GET /api/ai/piml-twin/{well_id} ───────────────────────────────────────────

@router.get("/piml-twin/{well_id}")
async def ai_piml_twin(
    well_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Physics-Informed ML digital twin: returns physics baseline AND
    PIML corrected prediction side-by-side for transparency.
    """
    wid = well_id.upper()

    well = (await db.execute(select(Well).where(Well.id == wid))).scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {well_id} not found")

    tel  = await _latest_telemetry(wid, db)
    srp  = await _latest_srp(wid, db)
    prod = await _latest_prod(wid, db)

    # Gather inputs
    reservoir_temp = float(tel.reservoir_temperature_c if tel and tel.reservoir_temperature_c else 68.0)
    pressure       = float(prod.bottomhole_pressure_bar if prod and prod.bottomhole_pressure_bar else 18.5)
    spm_val        = float(srp.spm if srp and srp.spm else 5.5)
    pump_eff       = float(srp.pump_efficiency_pct if srp and srp.pump_efficiency_pct else 65.0)
    stroke         = float(srp.stroke_length_in if srp and srp.stroke_length_in else 68.0)
    vibration      = float(tel.vibration_mm_s if tel and tel.vibration_mm_s else 2.8)
    motor_power    = float(tel.motor_power_kw if tel and tel.motor_power_kw else 22.4)
    actual_bpd     = float(prod.oil_rate_bpd if prod and prod.oil_rate_bpd else 0.0)

    # Estimate steam volume from latest CSS (stored in wells table init temp)
    steam_vol = float(well.initial_reservoir_temperature_c * 4.0) if well.initial_reservoir_temperature_c else 750.0

    result = piml_twin.predict(
        well_id=wid,
        reservoir_temp_c=reservoir_temp,
        pressure_bar=pressure,
        spm=spm_val,
        pump_efficiency_pct=pump_eff,
        steam_volume_ton=steam_vol,
        vibration_mm_s=vibration,
        motor_power_kw=motor_power,
        stroke_length_in=stroke,
    )

    # Add actual for comparison if available
    if actual_bpd > 0:
        result["actualBpd"]         = round(actual_bpd, 1)
        result["physicsErrorPct"]   = round(abs(result["physicsBpd"] - actual_bpd) / max(actual_bpd, 1) * 100, 1)
        result["pimlErrorPct"]      = round(abs(result["pimlBpd"] - actual_bpd) / max(actual_bpd, 1) * 100, 1)
    else:
        result["actualBpd"]         = None
        result["physicsErrorPct"]   = None
        result["pimlErrorPct"]      = None

    return {"success": True, "data": result}
