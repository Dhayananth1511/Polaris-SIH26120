#!/usr/bin/env python3
"""
scripts/seed_dataset.py
Loads all 7 Baghewala dataset CSVs into the Neon PostgreSQL database.
Run once: python scripts/seed_dataset.py
"""
import asyncio
import csv
import os
import sys
import uuid
from datetime import datetime, timezone, date as dt_date
from pathlib import Path

# ── Ensure the backend app is importable ──────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config.settings import settings
from app.db.models import (
    Base,
    Well, WellTelemetry, Production, CSSCycle,
    SRPOperation, Alert, FailureEvent,
)

def _resolve_dataset_dir() -> Path:
    candidates = [
        Path(__file__).parent.parent.parent / "database",
        Path(__file__).parent.parent.parent / "database" / "dataset",
        Path(__file__).parent.parent.parent / "database" / "Dataset",
        Path(__file__).parent.parent.parent / "Dataset",
        Path(__file__).parent.parent.parent / "dataset",
        Path(__file__).parent.parent / "database",
    ]
    for p in candidates:
        if p.exists() and (p / "well_master.csv").exists():
            return p
    raise FileNotFoundError(f"Cannot find dataset directory with well_master.csv in candidates: {candidates}")

DATASET_DIR = _resolve_dataset_dir()


def _f(val: str) -> float | None:
    try:
        return float(val) if val not in ("", "NA", "N/A", "None") else None
    except (ValueError, TypeError):
        return None


def _b(val: str) -> bool:
    return str(val).strip() in ("1", "True", "true", "yes")


# ── Load well_master.csv ──────────────────────────────────────────────────────
def load_wells() -> list[Well]:
    rows = []
    with open(DATASET_DIR / "well_master.csv", newline="") as f:
        for r in csv.DictReader(f):
            well_id = r["well_id"].strip()
            # Determine status based on oil_api / pressure heuristics
            status = "Producing"
            rows.append(Well(
                id=well_id,
                field=r["field"].strip(),
                latitude=float(r["latitude"]),
                longitude=float(r["longitude"]),
                well_depth_m=float(r["well_depth_m"]),
                pump_depth_m=float(r["pump_depth_m"]),
                reservoir=r.get("reservoir", "").strip() or None,
                formation=r.get("formation", "").strip() or None,
                oil_api=_f(r.get("oil_api", "")),
                initial_reservoir_pressure_bar=_f(r.get("initial_reservoir_pressure_bar", "")),
                initial_reservoir_temperature_c=_f(r.get("initial_reservoir_temperature_C", "")),
                automation_type=r.get("automation_type", "").strip() or None,
                status=status,
                well_type="CSS + SRP",
                spud_date=None,
            ))
    return rows


# ── Load well_telemetry.csv ───────────────────────────────────────────────────
def load_telemetry() -> list[WellTelemetry]:
    rows = []
    with open(DATASET_DIR / "well_telemetry.csv", newline="") as f:
        for r in csv.DictReader(f):
            rows.append(WellTelemetry(
                timestamp=dt_date.fromisoformat(r["timestamp"].strip()),
                well_id=r["well_id"].strip(),
                css_cycle_id=r.get("css_cycle_id", "").strip() or None,
                phase=r.get("phase", "").strip() or None,
                reservoir_temperature_c=_f(r.get("reservoir_temperature_C", "")),
                wellhead_temperature_c=_f(r.get("wellhead_temperature_C", "")),
                pressure_bar=_f(r.get("pressure_bar", "")),
                flow_rate_bpd=_f(r.get("flow_rate_bpd", "")),
                rpm=_f(r.get("rpm", "")),
                vibration_mm_s=_f(r.get("vibration_mm_s", "")),
                motor_power_kw=_f(r.get("motor_power_kW", "")),
                motor_current_a=_f(r.get("motor_current_A", "")),
            ))
    return rows


# ── Load production.csv ───────────────────────────────────────────────────────
def load_production() -> list[Production]:
    rows = []
    with open(DATASET_DIR / "production.csv", newline="") as f:
        for r in csv.DictReader(f):
            rows.append(Production(
                timestamp=dt_date.fromisoformat(r["timestamp"].strip()),
                well_id=r["well_id"].strip(),
                css_cycle_id=r.get("css_cycle_id", "").strip() or None,
                oil_rate_bpd=_f(r.get("oil_rate_bpd", "")),
                water_rate_bpd=_f(r.get("water_rate_bpd", "")),
                gas_rate_mmscfd=_f(r.get("gas_rate_mmscfd", "")),
                total_fluid_rate_bpd=_f(r.get("total_fluid_rate_bpd", "")),
                water_cut_pct=_f(r.get("water_cut_pct", "")),
                bottomhole_pressure_bar=_f(r.get("bottomhole_pressure_bar", "")),
                wellhead_pressure_bar=_f(r.get("wellhead_pressure_bar", "")),
                cumulative_oil_bbl=_f(r.get("cumulative_oil_bbl", "")),
                steam_consumption_ton=_f(r.get("steam_consumption_ton", "")),
                sor=_f(r.get("SOR", "")),
                energy_consumption_kwh=_f(r.get("energy_consumption_kWh", "")),
            ))
    return rows


# ── Load css_cycles.csv ───────────────────────────────────────────────────────
def load_css_cycles() -> list[CSSCycle]:
    rows = []
    with open(DATASET_DIR / "css_cycles.csv", newline="") as f:
        for r in csv.DictReader(f):
            rows.append(CSSCycle(
                css_cycle_id=r["css_cycle_id"].strip(),
                well_id=r["well_id"].strip(),
                cycle_number=int(r["cycle_number"]),
                steam_volume_ton=_f(r.get("steam_volume_ton", "")),
                steam_injection_rate_ton_hr=_f(r.get("steam_injection_rate_ton_hr", "")),
                steam_injection_pressure_bar=_f(r.get("steam_injection_pressure_bar", "")),
                steam_temperature_c=_f(r.get("steam_temperature_C", "")),
                injection_duration_hr=_f(r.get("injection_duration_hr", "")),
                soak_time_hr=_f(r.get("soak_time_hr", "")),
                production_cutoff=r.get("production_cutoff", "").strip() or None,
                post_steam_temperature_c=_f(r.get("post_steam_temperature_C", "")),
                status="Completed",
            ))
    return rows


# ── Load srp_operations.csv ───────────────────────────────────────────────────
def load_srp() -> list[SRPOperation]:
    rows = []
    with open(DATASET_DIR / "srp_operations.csv", newline="") as f:
        for r in csv.DictReader(f):
            rows.append(SRPOperation(
                timestamp=dt_date.fromisoformat(r["timestamp"].strip()),
                well_id=r["well_id"].strip(),
                css_cycle_id=r.get("css_cycle_id", "").strip() or None,
                spm=_f(r.get("spm", "")),
                stroke_length_in=_f(r.get("stroke_length_in", "")),
                vfd_frequency_hz=_f(r.get("vfd_frequency_Hz", "")),
                rod_load_min_kn=_f(r.get("rod_load_min_kN", "")),
                rod_load_max_kn=_f(r.get("rod_load_max_kN", "")),
                pump_fillage_pct=_f(r.get("pump_fillage_pct", "")),
                pump_efficiency_pct=_f(r.get("pump_efficiency_pct", "")),
                polished_rod_load_kn=_f(r.get("polished_rod_load_kN", "")),
                motor_power_kw=_f(r.get("motor_power_kW", "")),
                reading_type=r.get("reading_type", "").strip() or None,
            ))
    return rows


# ── Load failure_events.csv ───────────────────────────────────────────────────
def load_failures() -> list[FailureEvent]:
    rows = []
    with open(DATASET_DIR / "failure_events.csv", newline="") as f:
        for r in csv.DictReader(f):
            rows.append(FailureEvent(
                event_id=r["event_id"].strip(),
                timestamp=dt_date.fromisoformat(r["timestamp"].strip()),
                well_id=r["well_id"].strip(),
                css_cycle_id=r.get("css_cycle_id", "").strip() or None,
                rod_floating=_b(r.get("rod_floating", "0")),
                rod_failure=_b(r.get("rod_failure", "0")),
                pump_unsetting=_b(r.get("pump_unsetting", "0")),
                impact_loading=_b(r.get("impact_loading", "0")),
                gas_interference=_b(r.get("gas_interference", "0")),
                pump_off_condition=_b(r.get("pump_off_condition", "0")),
                fault_type=r.get("fault_type", "").strip() or None,
                failure_severity=r.get("failure_severity", "").strip() or None,
                maintenance_required=_b(r.get("maintenance_required", "0")),
                downtime_hours=_f(r.get("downtime_hours", "")),
            ))
    return rows


# ── Generate alerts from failure events ───────────────────────────────────────
SEVERITY_MAP = {"low": "LOW", "medium": "MEDIUM", "high": "HIGH", "critical": "CRITICAL"}
FAULT_MESSAGES = {
    "rod_failure":        ("Polished rod failure detected — immediate inspection required", "SRP Mechanical", "HIGH"),
    "pump_unsetting":     ("Pump unseating event — fluid pound may be occurring", "SRP Mechanical", "MEDIUM"),
    "impact_loading":     ("Impact loading on rod string — shock loads detected", "SRP Mechanical", "MEDIUM"),
    "gas_interference":   ("Gas interference in pump barrel — efficiency degraded", "CSS Thermal", "LOW"),
    "pump_off_condition": ("Pump-off condition — fluid level below pump intake", "Reservoir Fluid", "MEDIUM"),
    "rod_floating":       ("Rod floating detected — fluid accumulation above pump", "Reservoir Fluid", "LOW"),
}

def generate_alerts(failures: list[FailureEvent]) -> list[Alert]:
    alerts = []
    for fe in failures:
        sev_str = fe.failure_severity or "low"
        mapped_sev = SEVERITY_MAP.get(sev_str.lower(), "LOW")
        msg, cat, default_sev = FAULT_MESSAGES.get(fe.fault_type or "", (
            f"Equipment fault detected: {fe.fault_type}", "Sensor Hardware", "MEDIUM"
        ))
        alerts.append(Alert(
            id=uuid.uuid4(),
            well_id=fe.well_id,
            message=f"Well {fe.well_id}: {msg}",
            severity=mapped_sev,
            alert_type="Fault Flag",
            category=cat,
            root_cause=f"Fault type: {fe.fault_type}. Downtime: {fe.downtime_hours}h.",
            recommended_action="Review dynamometer card and inspect rod string. Contact field engineer.",
            metric="Fault Detection",
            threshold="0 events",
            actual_value=fe.fault_type,
            acknowledged=False,
            created_at=datetime.now(timezone.utc),
        ))
    return alerts


# ── Main async seeder ─────────────────────────────────────────────────────────
async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("Loading CSVs...")
    wells    = load_wells()
    telemetry= load_telemetry()
    prod     = load_production()
    cycles   = load_css_cycles()
    srp      = load_srp()
    failures = load_failures()
    alerts   = generate_alerts(failures)

    print(f"  Wells:         {len(wells)}")
    print(f"  Telemetry:     {len(telemetry)}")
    print(f"  Production:    {len(prod)}")
    print(f"  CSS Cycles:    {len(cycles)}")
    print(f"  SRP Ops:       {len(srp)}")
    print(f"  Failure Events:{len(failures)}")
    print(f"  Alerts:        {len(alerts)}")

    async with async_session() as session:
        # ── Clear time-series tables first (idempotent re-seed) ──────────────
        from sqlalchemy import delete as sa_delete
        for model in [Alert, FailureEvent, SRPOperation, Production, WellTelemetry, CSSCycle]:
            await session.execute(sa_delete(model))
        await session.flush()

        print("Inserting wells (merge/upsert)...")
        for w in wells:
            await session.merge(w)
        await session.flush()

        print("Inserting CSS cycles...")
        session.add_all(cycles)
        await session.flush()

        print("Inserting telemetry (chunked)...")
        CHUNK = 500
        for i in range(0, len(telemetry), CHUNK):
            session.add_all(telemetry[i:i+CHUNK])
            await session.flush()

        print("Inserting production (chunked)...")
        for i in range(0, len(prod), CHUNK):
            session.add_all(prod[i:i+CHUNK])
            await session.flush()

        print("Inserting SRP operations (chunked)...")
        for i in range(0, len(srp), CHUNK):
            session.add_all(srp[i:i+CHUNK])
            await session.flush()

        print("Inserting failure events...")
        session.add_all(failures)
        await session.flush()

        print("Inserting alerts...")
        session.add_all(alerts)

        await session.commit()

    await engine.dispose()
    print("Seed complete!")


if __name__ == "__main__":
    asyncio.run(seed())

