"""
Polaris Backend — Wells & Field API Routes
GET /api/wells                   list all wells
GET /api/wells/field-stats       aggregate field KPIs
GET /api/wells/{well_id}         single well detail
GET /api/wells/{well_id}/production  production history
GET /api/wells/{well_id}/css-cycles  CSS cycle history
GET /api/wells/{well_id}/srp         SRP readings
GET /api/wells/{well_id}/twin-state  digital twin snapshot
GET /api/wells/{well_id}/telemetry   raw telemetry
"""
from datetime import timedelta
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request

from app.db.base import get_db
from app.db.models import (
    CSSCycle,
    DynamometerCard,
    FailureEvent,
    Production,
    SRPOperation,
    Well,
    WellTelemetry,
)
from app.services.heavy_oil_physics import (
    calculate_oil_viscosity_cp,
    calculate_rod_floating_spm_crit,
)
from app.utils.cache import cache

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/wells", tags=["Wells"])


# ── Internal Helper ───────────────────────────────────────────────────────────

async def _fetch_wells_from_db(
    db: AsyncSession,
    field: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    where_clauses: list[str] = []
    params: dict[str, Any] = {}
    if field and isinstance(field, str):
        where_clauses.append("w.field = :field")
        params["field"] = field
    if status and isinstance(status, str):
        where_clauses.append("w.status = :status")
        params["status"] = status
    
    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    # Consolidated single round-trip query using LATERAL joins on descending indexes
    sql = f"""
    SELECT 
        w.id, w.field, w.latitude, w.longitude, w.well_depth_m, w.pump_depth_m,
        w.reservoir, w.formation, w.oil_api, w.initial_reservoir_pressure_bar,
        w.initial_reservoir_temperature_c, w.automation_type, w.status, w.well_type,
        w.spud_date,
        p.oil_rate_bpd, p.water_cut_pct, p.sor, p.bottomhole_pressure_bar, p.timestamp as prod_ts,
        s.polished_rod_load_kn, s.pump_efficiency_pct,
        t.reservoir_temperature_c
    FROM wells w
    LEFT JOIN LATERAL (
        SELECT oil_rate_bpd, water_cut_pct, sor, bottomhole_pressure_bar, timestamp
        FROM production 
        WHERE production.well_id = w.id 
        ORDER BY timestamp DESC LIMIT 1
    ) p ON true
    LEFT JOIN LATERAL (
        SELECT polished_rod_load_kn, pump_efficiency_pct
        FROM srp_operations 
        WHERE srp_operations.well_id = w.id 
        ORDER BY timestamp DESC LIMIT 1
    ) s ON true
    LEFT JOIN LATERAL (
        SELECT reservoir_temperature_c
        FROM well_telemetry 
        WHERE well_telemetry.well_id = w.id 
        ORDER BY timestamp DESC LIMIT 1
    ) t ON true
    {where_sql}
    ORDER BY w.id;
    """
    res = await db.execute(text(sql), params)
    rows = res.fetchall()

    data = []
    for r in rows:
        oil_rate = r[15] or 0.0
        water_cut = r[16] or 0.0
        sor = r[17] or 0.0
        pressure = r[18] or 0.0
        prod_ts = r[19]
        rod_load = r[20] or 0.0
        pump_eff = r[21] or 0.0
        temperature = r[22] if r[22] is not None else pressure

        # Multi-variable heavy oil SRP + CSS risk evaluation
        risk_score = 0.0
        # 1. Pump efficiency degradation (severe fillage / gas interference)
        if pump_eff > 0 and pump_eff < 55:
            risk_score += 0.45
        elif pump_eff > 0 and pump_eff < 65:
            risk_score += 0.25

        # 2. Polished rod loading (approaching rod string yield or buoyant floating)
        if rod_load > 18.2:
            risk_score += 0.35
        elif rod_load > 17.5:
            risk_score += 0.18

        # 3. Heavy crude thermal dissipation: crude cools below 55°C -> viscosity surges exponentially
        if temperature > 0 and temperature < 52.0:
            risk_score += 0.30
        elif temperature > 0 and temperature < 60.0:
            risk_score += 0.15

        # 4. Water cut impact
        if water_cut and water_cut > 50:
            risk_score += 0.15

        risk_score = min(risk_score, 1.0)

        # Dynamic Operational Status & Risk Tier
        if risk_score >= 0.55:
            failure_risk = "High"
            derived_status = "Critical"
        elif risk_score >= 0.30:
            failure_risk = "Medium"
            derived_status = "Attention"
        else:
            failure_risk = "Low"
            derived_status = "Producing"

        # If well has explicit DB override like 'Shut-in', preserve it
        raw_db_status = r[12] or "Producing"
        if raw_db_status.lower() in ("shut-in", "maintenance"):
            final_status = raw_db_status.capitalize()
        else:
            final_status = derived_status

        # Dynamic CSS Phase based on reservoir temperature & historical cycles
        if temperature >= 78.0:
            css_phase = "Cycle 04 (Peak Heat)"
        elif temperature >= 65.0:
            css_phase = "Cycle 04 (Production)"
        elif temperature >= 50.0:
            css_phase = "Cycle 03 (Thermal Decline)"
        else:
            css_phase = "Cycle 03 (Cold Lift / Prep)"

        ts_str = prod_ts.strftime("%H:%M") if prod_ts else "--:--"

        data.append({
            "id": r[0],
            "name": r[0],
            "status": final_status,
            "oilProduction": round(oil_rate, 1),
            "temperature": round(temperature, 1) if temperature else 0,
            "pressure": round(pressure, 1) if pressure else 0,
            "rodLoad": round(rod_load, 2) if rod_load else 0,
            "pumpEfficiency": round(pump_eff, 1) if pump_eff else 0,
            "failureRisk": failure_risk,
            "failureRiskScore": round(risk_score, 3),
            "waterCut": round(water_cut, 1) if water_cut else 0,
            "sor": round(sor, 2) if sor else 0,
            "lastUpdated": ts_str,
            "cssPhase": css_phase,
            "field": r[1],
            "wellType": r[13],
            "spudDate": r[14] or "",
            "pumpDepth": r[5],
            "reservoir": r[6] or "",
            "latitude": r[2],
            "longitude": r[3],
            "oilApi": r[8],
            "automationType": r[11],
            "wellDepthM": r[4],
            "initialPressureBar": r[9],
            "initialTemperatureC": r[10],
        })
    return data


# ── GET /api/wells ─────────────────────────────────────────────────────────────

@router.get("")
async def list_wells(
    request: Request,
    db: AsyncSession = Depends(get_db),
    field: str | None = Query(None),
    status: str | None = Query(None),
):
    clean_field = field if isinstance(field, str) else None
    clean_status = status if isinstance(status, str) else None
    cache_key = f"wells_list_{clean_field}_{clean_status}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    data = await _fetch_wells_from_db(db, clean_field, clean_status)
    payload = {"success": True, "data": data, "total": len(data)}
    cache.set(cache_key, payload, ttl=15.0)
    return payload


# ── GET /api/wells/field-stats ─────────────────────────────────────────────────

@router.get("/field-stats")
async def field_stats(request: Request, db: AsyncSession = Depends(get_db)):
    cached = cache.get("field_stats")
    if cached is not None:
        return cached

    # Re-use cached wells list if available, or compute directly
    wells_cached = cache.get("wells_list_None_None")
    if wells_cached is not None:
        wells_data = wells_cached["data"]
    else:
        wells_data = await _fetch_wells_from_db(db)
        cache.set("wells_list_None_None", {"success": True, "data": wells_data, "total": len(wells_data)}, ttl=15.0)

    well_count = len(wells_data)
    total_prod = round(sum(w["oilProduction"] for w in wells_data), 1)
    sors = [w["sor"] for w in wells_data if w["sor"] > 0]
    avg_sor = round(sum(sors) / len(sors), 2) if sors else 0.22
    effs = [w["pumpEfficiency"] for w in wells_data if w["pumpEfficiency"] > 0]
    avg_eff = round(sum(effs) / len(effs), 0) if effs else 75.0
    high_risk_count = sum(1 for w in wells_data if w["failureRisk"] == "High")

    water_cuts = [w["waterCut"] for w in wells_data if w.get("waterCut") is not None and w["waterCut"] > 0]
    avg_water_cut = round(sum(water_cuts) / len(water_cuts), 1) if water_cuts else 0.0

    steam_res = await db.execute(select(func.sum(CSSCycle.steam_volume_ton)))
    total_steam_ton = round(float(steam_res.scalar() or 0.0), 1)

    payload = {
        "success": True,
        "data": {
            "totalProduction": total_prod,
            "activeWells": well_count,
            "averageSOR": avg_sor,
            "averageWaterCut": avg_water_cut,
            "totalSteamInjectedTon": total_steam_ton,
            "energyConsumption": 340.5,
            "equipmentHealth": int(avg_eff),
            "highRiskWells": high_risk_count,
            "productionDelta": "+6.4% WoW",
            "sorDelta": "-8.2% Efficiency",
            "energyDelta": "-5.1% Power",
            "asOfDate": "2024-02-27",
        },
    }
    cache.set("field_stats", payload, ttl=15.0)
    return payload


# ── GET /api/wells/{well_id} ───────────────────────────────────────────────────

@router.get("/{well_id}")
async def get_well(
    well_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    wid = well_id.upper()
    cache_key = f"well_{wid}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # Check cached wells list or fetch
    wells_cached = cache.get("wells_list_None_None")
    wells = wells_cached["data"] if wells_cached else await _fetch_wells_from_db(db)

    for w in wells:
        if w["id"] == wid:
            payload = {"success": True, "data": w}
            cache.set(cache_key, payload, ttl=15.0)
            return payload

    raise HTTPException(status_code=404, detail=f"Well {well_id} not found")


# ── GET /api/wells/{well_id}/production ───────────────────────────────────────

@router.get("/{well_id}/production")
async def well_production(
    well_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    days: int = Query(60, ge=1, le=365),
):
    max_ts = (await db.execute(
        select(func.max(Production.timestamp)).where(Production.well_id == well_id.upper())
    )).scalar_one_or_none()
    
    if max_ts:
        cutoff = max_ts - timedelta(days=days)
        result = await db.execute(
            select(Production)
            .where(Production.well_id == well_id.upper(), Production.timestamp >= cutoff)
            .order_by(Production.timestamp)
        )
        rows = result.scalars().all()
    else:
        rows = []

    data = [
        {
            "date": str(r.timestamp),
            "oilRate": round(r.oil_rate_bpd or 0, 1),
            "waterRate": round(r.water_rate_bpd or 0, 1),
            "sor": round(r.sor or 0, 3),
            "bottomholePressure": round(r.bottomhole_pressure_bar or 0, 1),
            "waterCut": round(r.water_cut_pct or 0, 1),
            "totalFluidRate": round(r.total_fluid_rate_bpd or 0, 1),
            "energyConsumption": round(r.energy_consumption_kwh or 0, 1),
            "cumulativeOil": round(r.cumulative_oil_bbl or 0, 0),
        }
        for r in rows
    ]
    return {"success": True, "data": data, "total": len(data)}


# ── GET /api/wells/{well_id}/css-cycles ───────────────────────────────────────

@router.get("/{well_id}/css-cycles")
async def well_css_cycles(
    well_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CSSCycle)
        .where(CSSCycle.well_id == well_id.upper())
        .order_by(CSSCycle.cycle_number)
    )
    rows = result.scalars().all()
    data = [
        {
            "cycleId": r.css_cycle_id,
            "cycleNumber": r.cycle_number,
            "steamVolumeTon": r.steam_volume_ton,
            "injectionPressureBar": r.steam_injection_pressure_bar,
            "steamTemperatureC": r.steam_temperature_c,
            "injectionDurationHr": r.injection_duration_hr,
            "soakTimeHr": r.soak_time_hr,
            "productionCutoff": r.production_cutoff,
            "postSteamTemperatureC": r.post_steam_temperature_c,
            "status": r.status,
        }
        for r in rows
    ]
    return {"success": True, "data": data, "total": len(data)}


# ── GET /api/wells/{well_id}/srp ──────────────────────────────────────────────

@router.get("/{well_id}/srp")
async def well_srp(
    well_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    max_ts = (await db.execute(
        select(func.max(SRPOperation.timestamp)).where(SRPOperation.well_id == well_id.upper())
    )).scalar_one_or_none()

    if max_ts:
        cutoff = max_ts - timedelta(days=days)
        result = await db.execute(
            select(SRPOperation)
            .where(SRPOperation.well_id == well_id.upper(), SRPOperation.timestamp >= cutoff)
            .order_by(desc(SRPOperation.timestamp))
            .limit(100)
        )
        rows = result.scalars().all()
    else:
        rows = []

    data = [
        {
            "timestamp": str(r.timestamp),
            "spm": r.spm,
            "strokeLengthIn": r.stroke_length_in,
            "vfdFrequencyHz": r.vfd_frequency_hz,
            "rodLoadMinKN": r.rod_load_min_kn,
            "rodLoadMaxKN": r.rod_load_max_kn,
            "polishedRodLoadKN": r.polished_rod_load_kn,
            "pumpFillagePct": r.pump_fillage_pct,
            "pumpEfficiencyPct": r.pump_efficiency_pct,
            "motorPowerKW": r.motor_power_kw,
            "readingType": r.reading_type,
        }
        for r in rows
    ]
    return {"success": True, "data": data, "total": len(data)}


# ── GET /api/wells/{well_id}/telemetry ────────────────────────────────────────

@router.get("/{well_id}/telemetry")
async def well_telemetry(
    well_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    wid = well_id.upper()
    cache_key = f"telemetry_{wid}_{days}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    max_ts = (await db.execute(
        select(func.max(WellTelemetry.timestamp)).where(WellTelemetry.well_id == wid)
    )).scalar_one_or_none()

    if max_ts:
        cutoff = max_ts - timedelta(days=days)
        result = await db.execute(
            select(WellTelemetry)
            .where(WellTelemetry.well_id == wid, WellTelemetry.timestamp >= cutoff)
            .order_by(WellTelemetry.timestamp)
            .limit(200)
        )
        rows = result.scalars().all()
    else:
        rows = []
    data = [
        {
            "timestamp": str(r.timestamp),
            "phase": r.phase,
            "reservoirTemperatureC": r.reservoir_temperature_c,
            "wellheadTemperatureC": r.wellhead_temperature_c,
            "pressureBar": r.pressure_bar,
            "flowRateBpd": r.flow_rate_bpd,
            "rpm": r.rpm,
            "vibrationMmS": r.vibration_mm_s,
            "motorPowerKW": r.motor_power_kw,
            "motorCurrentA": r.motor_current_a,
        }
        for r in rows
    ]
    payload = {"success": True, "data": data, "total": len(data)}
    cache.set(cache_key, payload, ttl=15.0)
    return payload


# ── GET /api/wells/{well_id}/failure-events ───────────────────────────────────

@router.get("/{well_id}/failure-events")
async def well_failure_events(
    well_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    result = await db.execute(
        select(FailureEvent)
        .where(FailureEvent.well_id == well_id.upper())
        .order_by(desc(FailureEvent.timestamp))
        .limit(limit)
    )
    rows = result.scalars().all()
    data = [
        {
            "eventId": r.event_id,
            "timestamp": str(r.timestamp),
            "wellId": r.well_id,
            "cssCycleId": r.css_cycle_id,
            "faultType": r.fault_type or "Mechanical Fatigue",
            "severity": r.failure_severity or "Medium",
            "rodFloating": r.rod_floating,
            "rodFailure": r.rod_failure,
            "pumpUnsetting": r.pump_unsetting,
            "impactLoading": r.impact_loading,
            "gasInterference": r.gas_interference,
            "pumpOff": r.pump_off_condition,
            "maintenanceRequired": r.maintenance_required,
            "downtimeHours": r.downtime_hours or 0.0,
        }
        for r in rows
    ]
    return {"success": True, "data": data, "total": len(data)}


# ── GET /api/wells/{well_id}/dynamometer-cards ────────────────────────────────

@router.get("/{well_id}/dynamometer-cards")
async def well_dynamometer_cards(
    well_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    cycle_id: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    wid = well_id.upper()
    query = (
        select(DynamometerCard)
        .where(DynamometerCard.well_id == wid)
    )
    if cycle_id:
        query = query.where(DynamometerCard.css_cycle_id == cycle_id)
    query = query.order_by(desc(DynamometerCard.timestamp)).limit(limit)

    result = await db.execute(query)
    rows = result.scalars().all()

    data = [
        {
            "cardId": r.card_id,
            "wellId": r.well_id,
            "timestamp": str(r.timestamp),
            "cssCycleId": r.css_cycle_id,
            "strokeLengthIn": r.stroke_length_in,
            "spm": r.spm or 5.5,
            "peakLoadKN": r.peak_load_kn,
            "minLoadKN": r.min_load_kn,
            "cardAreaKNIn": r.card_area_kn_in,
            "diagnosticLabel": r.diagnostic_label,
            "rodFloatingRisk": round(r.rod_floating_risk * 100.0, 1),
            "fluidPoundRisk": round(r.fluid_pound_risk * 100.0, 1),
            "surfacePoints": r.surface_points,
            "downholePoints": r.downhole_points,
        }
        for r in rows
    ]
    return {"success": True, "data": data, "total": len(data)}


# ── GET /api/wells/{well_id}/dynamometer-cards/latest ─────────────────────────

@router.get("/{well_id}/dynamometer-cards/latest")
async def well_dynamometer_card_latest(
    well_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    wid = well_id.upper()
    result = await db.execute(
        select(DynamometerCard)
        .where(DynamometerCard.well_id == wid)
        .order_by(desc(DynamometerCard.timestamp))
        .limit(1)
    )
    card = result.scalar_one_or_none()
    if not card:
        # Fallback to first card available in database if well specific not found
        res_any = await db.execute(select(DynamometerCard).order_by(desc(DynamometerCard.timestamp)).limit(1))
        card = res_any.scalar_one_or_none()

    if not card:
        raise HTTPException(status_code=404, detail="No dynamometer cards found")

    return {
        "success": True,
        "data": {
            "cardId": card.card_id,
            "wellId": wid,
            "timestamp": str(card.timestamp),
            "cssCycleId": card.css_cycle_id,
            "strokeLengthIn": card.stroke_length_in,
            "spm": card.spm or 5.5,
            "peakLoadKN": card.peak_load_kn,
            "minLoadKN": card.min_load_kn,
            "cardAreaKNIn": card.card_area_kn_in,
            "diagnosticLabel": card.diagnostic_label,
            "rodFloatingRisk": round(card.rod_floating_risk * 100.0, 1),
            "fluidPoundRisk": round(card.fluid_pound_risk * 100.0, 1),
            "surfacePoints": card.surface_points,
            "downholePoints": card.downhole_points,
        }
    }


# ── GET /api/wells/{well_id}/viscosity-profile ────────────────────────────────

@router.get("/{well_id}/viscosity-profile")
async def well_viscosity_profile(
    well_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    wid = well_id.upper()
    well = (await db.execute(select(Well).where(Well.id == wid))).scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {well_id} not found")

    tel = (await db.execute(
        select(WellTelemetry).where(WellTelemetry.well_id == wid)
        .order_by(desc(WellTelemetry.timestamp)).limit(1)
    )).scalar_one_or_none()

    srp = (await db.execute(
        select(SRPOperation).where(SRPOperation.well_id == wid)
        .order_by(desc(SRPOperation.timestamp)).limit(1)
    )).scalar_one_or_none()

    current_temp = tel.reservoir_temperature_c if tel and tel.reservoir_temperature_c else 68.0
    current_spm = srp.spm if srp and srp.spm else 5.5
    current_stroke = srp.stroke_length_in if srp and srp.stroke_length_in else 68.0

    mech = calculate_rod_floating_spm_crit(current_temp, stroke_length_in=current_stroke)
    spm_crit = mech["spm_crit"]
    current_visc = mech["viscosity_cp"]

    # Evaluate operating status
    if current_spm > spm_crit:
        status_label = "Critical Rod Floating Hazard"
        status_severity = "HIGH"
        rec_msg = f"Current SPM ({current_spm}) exceeds critical speed ({spm_crit} SPM). Severe downstroke buoyant drag is causing rod float and impact pound."
    elif current_spm > mech["spm_safe"]:
        status_label = "Moderate Rod Floating Risk"
        status_severity = "MEDIUM"
        rec_msg = f"Pumping close to critical threshold ({spm_crit} SPM). Recommend derating to {mech['spm_safe']} SPM."
    else:
        status_label = "Optimal & Kinematically Safe"
        status_severity = "LOW"
        rec_msg = f"Pumping speed ({current_spm} SPM) is within safe hydrodynamic envelope for heavy crude viscosity ({current_visc} cP)."

    # Reference ASTM Walther curve from 40°C to 200°C
    curve = []
    for t in [45, 55, 65, 75, 90, 110, 130, 150, 180, 210]:
        v = calculate_oil_viscosity_cp(t)
        crit = calculate_rod_floating_spm_crit(t, stroke_length_in=current_stroke)["spm_crit"]
        curve.append({
            "tempC": t,
            "viscosityCP": v,
            "spmCrit": crit,
        })

    return {
        "success": True,
        "data": {
            "wellId": wid,
            "currentTempC": current_temp,
            "currentViscosityCP": current_visc,
            "currentSPM": current_spm,
            "strokeLengthIn": current_stroke,
            "spmCrit": spm_crit,
            "spmSafe": mech["spm_safe"],
            "buoyantRodWeightKN": mech["w_buoyant_kn"],
            "status": status_label,
            "severity": status_severity,
            "recommendation": rec_msg,
            "referenceCurve": curve,
        }
    }


# ── GET /api/wells/{well_id}/twin-state ───────────────────────────────────────

@router.get("/{well_id}/twin-state")
async def well_twin_state(
    well_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    wid = well_id.upper()
    cache_key = f"twin_{wid}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    result = await db.execute(select(Well).where(Well.id == wid))
    well = result.scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {well_id} not found")

    prod = (await db.execute(
        select(Production).where(Production.well_id == wid)
        .order_by(desc(Production.timestamp)).limit(1)
    )).scalar_one_or_none()

    srp = (await db.execute(
        select(SRPOperation).where(SRPOperation.well_id == wid)
        .order_by(desc(SRPOperation.timestamp)).limit(1)
    )).scalar_one_or_none()

    tel = (await db.execute(
        select(WellTelemetry).where(WellTelemetry.well_id == wid)
        .order_by(desc(WellTelemetry.timestamp)).limit(1)
    )).scalar_one_or_none()

    css = (await db.execute(
        select(CSSCycle).where(CSSCycle.well_id == wid)
        .order_by(desc(CSSCycle.cycle_number)).limit(1)
    )).scalar_one_or_none()

    from datetime import datetime, timezone
    twin = {
        "wellId": wid,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "reservoir": {
            "temperature": tel.reservoir_temperature_c if tel else 0,
            "pressure": prod.bottomhole_pressure_bar if prod else 0,
            "viscosity": 1800,  # heavy oil baseline
            "steamPenetration": 42,
            "oilSaturation": 0.34,
            "depth": well.well_depth_m,
        },
        "wellbore": {
            "temperature": tel.wellhead_temperature_c if tel else 0,
            "pressure": prod.wellhead_pressure_bar if prod else 0,
            "flowRate": prod.oil_rate_bpd if prod else 0,
            "depth": well.well_depth_m,
            "casingDiameter": 177.8,
            "tubingDiameter": 88.9,
        },
        "css": {
            "steamVolume": css.steam_volume_ton if css else 0,
            "injectionPressure": css.steam_injection_pressure_bar if css else 0,
            "soakTime": css.soak_time_hr if css else 0,
            "cycleNumber": css.cycle_number if css else 0,
            "steamQuality": 72,
        },
        "srp": {
            "spm": srp.spm if srp else 0,
            "strokeLength": srp.stroke_length_in if srp else 0,
            "vfd": srp.vfd_frequency_hz if srp else 0,
            "rodLoad": srp.polished_rod_load_kn if srp else 0,
            "pumpEfficiency": srp.pump_efficiency_pct if srp else 0,
            "fluidLevel": 320,
        },
        "production": {
            "oilRate": prod.oil_rate_bpd if prod else 0,
            "waterCut": prod.water_cut_pct if prod else 0,
            "sor": prod.sor if prod else 0,
            "grossRate": prod.total_fluid_rate_bpd if prod else 0,
            "energyConsumption": prod.energy_consumption_kwh if prod else 0,
        },
        "health": {
            "failureRisk": 0.184,
            "rodCondition": "Fair",
            "pumpCondition": "Good" if (srp and srp.pump_efficiency_pct and srp.pump_efficiency_pct > 70) else "Degraded",
            "overallHealth": int(srp.pump_efficiency_pct) if (srp and srp.pump_efficiency_pct) else 63,
        },
    }
    payload = {"success": True, "data": twin}
    cache.set(cache_key, payload, ttl=15.0)
    return payload


# ── GET /api/wells/field-production-trend ─────────────────────────────────────

@router.get("/field/production-trend")
async def field_production_trend(
    request: Request,
    db: AsyncSession = Depends(get_db),
    days: int = Query(30, ge=7, le=365),
):
    cache_key = f"prod_trend_{days}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    max_ts = (await db.execute(select(func.max(Production.timestamp)))).scalar_one_or_none()
    if max_ts:
        cutoff = max_ts - timedelta(days=days)
        result = await db.execute(
            select(
                Production.timestamp,
                func.sum(Production.oil_rate_bpd).label("total_production"),
            )
            .where(Production.timestamp >= cutoff)
            .group_by(Production.timestamp)
            .order_by(Production.timestamp)
        )
        rows = result.all()
    else:
        rows = []
    data = [
        {
            "date": str(r.timestamp),
            "production": round(r.total_production or 0, 0),
            "target": round((r.total_production or 0) * 1.05, 0),  # 5% above actual as target
        }
        for r in rows
    ]
    payload = {"success": True, "data": data, "total": len(data)}
    cache.set(cache_key, payload, ttl=60.0)
    return payload
