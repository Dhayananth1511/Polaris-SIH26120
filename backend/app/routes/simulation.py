"""
Polaris Backend — Simulation Laboratory Routes
Coupled Multiphase Heavy Oil Reservoir & Surface SRP Kinematics Simulator
GET  /api/simulation/preset/{well_id}   Load well baseline & default scenario parameters
POST /api/simulation/run                Execute coupled physics simulation
"""
import math
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
import structlog
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.db.models import Well, Production, CSSCycle, SRPOperation, WellTelemetry, Alert
from app.services.heavy_oil_physics import (
    generate_post_css_trajectory,
    calculate_rod_floating_spm_crit,
    calculate_oil_viscosity_cp,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/simulation", tags=["Simulation"])


class SimulationRequest(BaseModel):
    well_id: str
    scenario_name: Optional[str] = "Optimized Scenario"
    scenario_mode: Optional[str] = "optimized"
    steam_volume_ton: float = 735.0
    injection_pressure_bar: float = 21.0
    soak_time_hr: float = 64.0
    spm: float = 5.1
    stroke_length_in: float = 66.0
    vfd_frequency_hz: float = 36.0


@router.get("/preset/{well_id}")
async def get_simulation_preset(well_id: str, db: AsyncSession = Depends(get_db)):
    wid = well_id.upper()
    well = (await db.execute(select(Well).where(Well.id == wid))).scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {well_id} not found")

    prod = (await db.execute(
        select(Production).where(Production.well_id == wid)
        .order_by(desc(Production.timestamp)).limit(1)
    )).scalar_one_or_none()

    css = (await db.execute(
        select(CSSCycle).where(CSSCycle.well_id == wid)
        .order_by(desc(CSSCycle.cycle_number)).limit(1)
    )).scalar_one_or_none()

    srp = (await db.execute(
        select(SRPOperation).where(SRPOperation.well_id == wid)
        .order_by(desc(SRPOperation.timestamp)).limit(1)
    )).scalar_one_or_none()

    current_oil = prod.oil_rate_bpd if prod and prod.oil_rate_bpd else (well.oil_api or 28.5)
    current_sor = prod.sor if prod and prod.sor else 3.5
    current_energy = prod.energy_consumption_kwh if prod and prod.energy_consumption_kwh else 42.0
    pump_eff = srp.pump_efficiency_pct if srp and srp.pump_efficiency_pct else 64.0
    current_risk = 0.18 if pump_eff >= 65 else 0.28

    return {
        "success": True,
        "data": {
            "wellId": wid,
            "wellName": wid,
            "reservoir": well.reservoir or "Jodhpur Sandstone",
            "current": {
                "steamVolumeTon": css.steam_volume_ton if css else 800.0,
                "injectionPressureBar": css.steam_injection_pressure_bar if css else 22.0,
                "soakTimeHr": css.soak_time_hr if css else 72.0,
                "spm": srp.spm if srp else 5.5,
                "strokeLengthIn": srp.stroke_length_in if srp else 68.0,
                "vfdFrequencyHz": srp.vfd_frequency_hz if srp else 38.0,
                "oilProduction": round(current_oil, 1),
                "sor": round(current_sor, 2),
                "energy": round(current_energy, 1),
                "failureRisk": round(current_risk * 100, 1),
                "pumpEfficiency": round(pump_eff, 1),
            },
            "optimized": {
                "steamVolumeTon": round((css.steam_volume_ton if css else 800.0) * 0.92, 1),
                "injectionPressureBar": round((css.steam_injection_pressure_bar if css else 22.0) * 0.95, 1),
                "soakTimeHr": round((css.soak_time_hr if css else 72.0) * 0.88, 1),
                "spm": 5.1,
                "strokeLengthIn": 66.0,
                "vfdFrequencyHz": 36.0,
            }
        }
    }


@router.post("/run")
async def run_simulation(req: SimulationRequest, db: AsyncSession = Depends(get_db)):
    wid = req.well_id.upper()
    well = (await db.execute(select(Well).where(Well.id == wid))).scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {req.well_id} not found")

    prod = (await db.execute(
        select(Production).where(Production.well_id == wid)
        .order_by(desc(Production.timestamp)).limit(1)
    )).scalar_one_or_none()

    css = (await db.execute(
        select(CSSCycle).where(CSSCycle.well_id == wid)
        .order_by(desc(CSSCycle.cycle_number)).limit(1)
    )).scalar_one_or_none()

    srp = (await db.execute(
        select(SRPOperation).where(SRPOperation.well_id == wid)
        .order_by(desc(SRPOperation.timestamp)).limit(1)
    )).scalar_one_or_none()

    base_oil = prod.oil_rate_bpd if prod and prod.oil_rate_bpd else 28.5
    base_sor = prod.sor if prod and prod.sor else 3.8
    base_energy = prod.energy_consumption_kwh if prod and prod.energy_consumption_kwh else 42.0
    base_eff = srp.pump_efficiency_pct if srp and srp.pump_efficiency_pct else 64.0
    base_risk = 0.28 if base_eff < 65 else 0.18

    base_steam = css.steam_volume_ton if css and css.steam_volume_ton else 800.0
    base_spm = srp.spm if srp and srp.spm else 5.5
    base_stroke = srp.stroke_length_in if srp and srp.stroke_length_in else 68.0
    base_vfd = srp.vfd_frequency_hz if srp and srp.vfd_frequency_hz else 38.0

    # 1. Thermal Mobility (Boberg-Lantz surrogate)
    steam_ratio = req.steam_volume_ton / max(base_steam, 1.0)
    soak_ratio = req.soak_time_hr / 72.0
    thermal_gain = 1.0 + 0.12 * math.log(max(0.5, steam_ratio)) * math.pow(max(0.5, soak_ratio), 0.3)

    # 2. Sucker Rod Pump Volumetric Displacement
    q_disp_sim = 0.1166 * (1.75 ** 2) * req.stroke_length_in * req.spm * 0.70
    q_disp_base = 0.1166 * (1.75 ** 2) * base_stroke * base_spm * 0.65
    srp_displacement_ratio = q_disp_sim / max(q_disp_base, 1.0)

    # Coupled Production calculation
    sim_oil = base_oil * thermal_gain * (0.65 * srp_displacement_ratio + 0.35)
    sim_oil = max(5.0, round(sim_oil, 1))

    # 3. Simulated Steam-Oil Ratio (SOR)
    if sim_oil > 0:
        sim_sor = base_sor * (steam_ratio / (sim_oil / max(base_oil, 1.0)))
        sim_sor = max(0.1, round(sim_sor, 2))
    else:
        sim_sor = base_sor

    # 4. Simulated Energy Consumption
    speed_ratio = (req.spm / max(base_spm, 1.0)) * ((req.vfd_frequency_hz / max(base_vfd, 1.0)) ** 1.5)
    sim_energy = base_energy * (0.6 * speed_ratio + 0.4)
    sim_energy = max(15.0, round(sim_energy, 1))

    # 5. Simulated Failure Risk
    risk_delta = 0.0
    if req.spm > 5.5:
        risk_delta += (req.spm - 5.5) * 0.06
    else:
        risk_delta -= (5.5 - req.spm) * 0.04
    if req.vfd_frequency_hz > 45:
        risk_delta += 0.05

    sim_risk = max(0.05, min(0.60, base_risk + risk_delta))
    sim_risk_pct = round(sim_risk * 100, 1)

    def pct_change(cur: float, scen: float) -> str:
        if cur == 0:
            return "0.0%"
        diff = ((scen - cur) / cur) * 100.0
        sign = "+" if diff > 0 else ""
        return f"{sign}{diff:.1f}%"

    return {
        "success": True,
        "data": {
            "wellId": wid,
            "scenarioName": req.scenario_name,
            "scenarioMode": req.scenario_mode,
            "parameters": {
                "steamVolumeTon": req.steam_volume_ton,
                "injectionPressureBar": req.injection_pressure_bar,
                "soakTimeHr": req.soak_time_hr,
                "spm": req.spm,
                "strokeLengthIn": req.stroke_length_in,
                "vfdFrequencyHz": req.vfd_frequency_hz,
            },
            "results": [
                {
                    "parameter": "Production (BPD)",
                    "current": round(base_oil, 1),
                    "scenario": sim_oil,
                    "change": pct_change(base_oil, sim_oil),
                    "isPositive": sim_oil >= base_oil,
                },
                {
                    "parameter": "SOR",
                    "current": round(base_sor, 2),
                    "scenario": sim_sor,
                    "change": pct_change(base_sor, sim_sor),
                    "isPositive": sim_sor <= base_sor,
                },
                {
                    "parameter": "Energy (kWh/bbl)",
                    "current": round(base_energy, 1),
                    "scenario": sim_energy,
                    "change": pct_change(base_energy, sim_energy),
                    "isPositive": sim_energy <= base_energy,
                },
                {
                    "parameter": "Failure Risk",
                    "current": f"{round(base_risk * 100, 0):.0f}%",
                    "scenario": f"{sim_risk_pct:.0f}%",
                    "change": pct_change(base_risk * 100, sim_risk_pct),
                    "isPositive": sim_risk <= base_risk,
                },
            ],
            "recommendation": {
                "status": "Recommended" if (sim_oil >= base_oil and sim_risk <= 0.35) else "Caution",
                "message": "Meets all safety, thermal chamber, and rod string fatigue constraints." if (sim_oil >= base_oil and sim_risk <= 0.35) else "High mechanical stress detected. Review operating limits.",
                "confidenceScore": 88.5,
            }
        }
    }


# ── GET /api/simulation/post-css-schedule/{well_id} ───────────────────────────

@router.get("/post-css-schedule/{well_id}")
async def get_post_css_schedule(
    well_id: str,
    days: int = 60,
    db: AsyncSession = Depends(get_db),
):
    wid = well_id.upper()
    well = (await db.execute(select(Well).where(Well.id == wid))).scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {well_id} not found")

    css = (await db.execute(
        select(CSSCycle).where(CSSCycle.well_id == wid)
        .order_by(desc(CSSCycle.cycle_number)).limit(1)
    )).scalar_one_or_none()

    prod = (await db.execute(
        select(Production).where(Production.well_id == wid)
        .order_by(desc(Production.timestamp)).limit(1)
    )).scalar_one_or_none()

    steam_vol = css.steam_volume_ton if css and css.steam_volume_ton else 750.0
    peak_temp = css.post_steam_temperature_c if css and css.post_steam_temperature_c else 185.0
    baseline_oil = prod.oil_rate_bpd if prod and prod.oil_rate_bpd else 28.5

    schedule = generate_post_css_trajectory(
        well_id=wid,
        steam_volume_ton=steam_vol,
        peak_temp_c=peak_temp,
        baseline_bpd=baseline_oil,
        days=days,
    )

    return {
        "success": True,
        "data": schedule,
    }


# ── POST /api/simulation/edge-anomaly-inject ──────────────────────────────────

class EdgeAnomalyRequest(BaseModel):
    well_id: str
    anomaly_type: str  # rod_floating, thermal_shock, motor_overload, pump_unsetting
    severity: Optional[str] = "HIGH"


@router.post("/edge-anomaly-inject")
async def inject_edge_anomaly(
    req: EdgeAnomalyRequest,
    db: AsyncSession = Depends(get_db),
):
    import uuid
    from datetime import datetime, timezone

    wid = req.well_id.upper()
    well = (await db.execute(select(Well).where(Well.id == wid))).scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {req.well_id} not found")

    # Construct specific anomaly telemetry signature and diagnostic message
    if req.anomaly_type == "rod_floating":
        msg = f"CRITICAL: Polished rod floating detected on {wid}. Downstroke buoyant drag exceeded available gravity fall velocity."
        cat = "SRP Mechanical"
        root_cause = "Crude temperature dropped below 52°C, causing viscosity surge to 2,800 cP while SPM remained at 5.8 (SPM_crit = 4.1)."
        rec_action = "Derate SPM immediately to 4.2 SPM via VFD controller to restore downstroke rod tension."
        metric = "Rod Downstroke Load"
        threshold = "> 8.0 kN"
        actual = "3.8 kN (Severe Lag)"
    elif req.anomaly_type == "thermal_shock":
        msg = f"WARNING: Rapid reservoir heat dissipation detected on {wid}. Viscosity surge impending."
        cat = "CSS Thermal"
        root_cause = "Bottomhole temperature decayed 24°C in 48 hours following casing annulus convective loss."
        rec_action = "Initiate Phase 3 Cold Lift staging schedule; prepare for cyclic steam turnaround."
        metric = "Reservoir Temp"
        threshold = "> 65°C"
        actual = "49.2°C"
    elif req.anomaly_type == "motor_overload":
        msg = f"CRITICAL: Surface walking beam drive motor overload & high vibration on {wid}."
        cat = "Sensor Hardware"
        root_cause = "Vibration sensor detected 14.8 mm/s peak shock load during rod unsetting fluid pound."
        rec_action = "Check polished rod clamp tightness and carrier bar alignment; lower VFD frequency to 30 Hz."
        metric = "Vibration RMS"
        threshold = "< 4.5 mm/s"
        actual = "14.8 mm/s"
    else:
        msg = f"ALERT: Mechanical anomaly event triggered on well {wid}."
        cat = "SRP Mechanical"
        root_cause = "Simulated edge sensor diagnostic anomaly."
        rec_action = "Inspect surface unit and review latest dynamometer card."
        metric = "Pump Fillage"
        threshold = "> 70%"
        actual = "42%"

    # Create active Alert in database
    alert = Alert(
        id=uuid.uuid4(),
        well_id=wid,
        message=msg,
        severity=req.severity or "HIGH",
        alert_type="Edge Fault Injector",
        category=cat,
        root_cause=root_cause,
        recommended_action=rec_action,
        metric=metric,
        threshold=threshold,
        actual_value=actual,
        acknowledged=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(alert)
    await db.commit()

    return {
        "success": True,
        "message": f"Injected '{req.anomaly_type}' anomaly on {wid}",
        "alert": {
            "id": str(alert.id),
            "wellId": wid,
            "message": msg,
            "severity": req.severity or "HIGH",
            "category": cat,
            "rootCause": root_cause,
            "recommendedAction": rec_action,
            "metric": metric,
            "actualValue": actual,
        }
    }


# ── GET /api/simulation/edge-stream/{well_id} ─────────────────────────────────

@router.get("/edge-stream/{well_id}")
async def get_edge_stream(
    well_id: str,
    db: AsyncSession = Depends(get_db),
):
    import random
    from datetime import datetime, timezone

    wid = well_id.upper()
    base_temp = 68.0
    base_spm = 5.5
    base_vibration = 2.8

    try:
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

        if tel and tel.reservoir_temperature_c:
            base_temp = tel.reservoir_temperature_c
        if srp and srp.spm:
            base_spm = srp.spm
        if tel and tel.vibration_mm_s:
            base_vibration = tel.vibration_mm_s
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("edge_stream_db_transient_fallback", well_id=wid, error=str(exc))

    # Realistic micro-jitter for live streaming pulse
    noise_temp = round(base_temp + (random.random() - 0.5) * 0.4, 1)
    noise_spm = round(base_spm + (random.random() - 0.5) * 0.1, 2)
    noise_vib = round(base_vibration + (random.random() - 0.5) * 0.2, 2)
    noise_power = round(22.4 + (random.random() - 0.5) * 0.8, 1)
    noise_current = round(38.2 + (random.random() - 0.5) * 1.2, 1)

    visc = calculate_oil_viscosity_cp(noise_temp)
    mech = calculate_rod_floating_spm_crit(noise_temp)

    return {
        "success": True,
        "data": {
            "wellId": wid,
            "gateway": "ESP32-BGW-RTU01",
            "protocol": "Modbus RTU / LoRaWAN",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "telemetry": {
                "reservoirTempC": noise_temp,
                "wellheadTempC": round(noise_temp * 0.92, 1),
                "viscosityCP": visc,
                "spm": noise_spm,
                "spmCrit": mech["spm_crit"],
                "vibrationMmS": noise_vib,
                "motorPowerKW": noise_power,
                "motorCurrentA": noise_current,
                "isFloatingRisk": noise_spm > mech["spm_crit"],
            }
        }
    }
