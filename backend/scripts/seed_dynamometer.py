#!/usr/bin/env python3
"""
scripts/seed_dynamometer.py
Loads all 38,400 rows from database/dynamometer_cards.csv into the PostgreSQL
dynamometer_cards table with automated shape analysis and fault diagnostics.
"""
import asyncio
import csv
import json
import math
from datetime import date as dt_date
from pathlib import Path
import sys

# Ensure backend app is importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select

from app.config.settings import settings
from app.db.models import Base, DynamometerCard, Well


def find_csv() -> Path:
    candidates = [
        Path(__file__).parent.parent.parent / "database" / "dynamometer_cards.csv",
        Path(__file__).parent.parent / "database" / "dynamometer_cards.csv",
    ]
    for c in candidates:
        if c.exists():
            return c
    raise FileNotFoundError("Could not find dynamometer_cards.csv")


def find_failures_csv() -> Path | None:
    candidates = [
        Path(__file__).parent.parent.parent / "database" / "failure_events.csv",
        Path(__file__).parent.parent / "database" / "failure_events.csv",
    ]
    for c in candidates:
        if c.exists():
            return c
    return None


def calculate_card_area(positions: list[float], loads: list[float]) -> float:
    """Computes card area (work done per stroke) using polygon formula."""
    area = 0.0
    n = len(positions)
    for i in range(n):
        j = (i + 1) % n
        area += positions[i] * loads[j] - positions[j] * loads[i]
    return abs(area) / 2.0


def derive_downhole_card(positions: list[float], loads: list[float], stroke_len: float) -> list[dict]:
    """
    Derives downhole pump dyno card using modified Gibbs damping transform.
    Rod stretch delta = (Load - MeanLoad) * StretchCoeff
    """
    mean_load = sum(loads) / max(len(loads), 1)
    downhole = []
    # Baghewala typical rod stretch factor for 850m 7/8" rod string is ~0.8 in / kN
    stretch_coeff = 0.72

    for pos, ld in zip(positions, loads):
        dh_pos = pos - (ld - mean_load) * stretch_coeff
        dh_pos = max(0.0, min(stroke_len * 0.96, dh_pos))
        # Downhole fluid load has square pump response
        dh_load = ld * 0.92 if ld >= mean_load else ld * 0.85
        downhole.append({
            "position": round(dh_pos, 2),
            "load": round(dh_load, 2),
        })
    return downhole


def process_cards():
    csv_path = find_csv()
    print(f"Reading {csv_path}...")

    # Read failure events to correlate ground truth labels
    failures_map = {}
    fail_csv = find_failures_csv()
    if fail_csv:
        with open(fail_csv, mode="r", encoding="utf-8") as ff:
            for row in csv.DictReader(ff):
                key = (row["well_id"].strip(), str(row["timestamp"]).strip())
                failures_map[key] = {
                    "rod_floating": row.get("rod_floating", "0") in ("1", "True", "true"),
                    "rod_failure": row.get("rod_failure", "0") in ("1", "True", "true"),
                    "pump_unsetting": row.get("pump_unsetting", "0") in ("1", "True", "true"),
                    "impact_loading": row.get("impact_loading", "0") in ("1", "True", "true"),
                    "gas_interference": row.get("gas_interference", "0") in ("1", "True", "true"),
                    "fault_type": str(row.get("fault_type", "")).strip(),
                }

    # Group CSV rows by (well_id, timestamp, css_cycle_id)
    from collections import defaultdict
    grouped = defaultdict(list)
    with open(csv_path, mode="r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            key = (r["well_id"].strip(), r["timestamp"].strip(), r.get("css_cycle_id", "").strip())
            grouped[key].append({
                "position_in": float(r["position_in"]),
                "load_kN": float(r["load_kN"]),
            })

    print(f"Aggregating {len(grouped)} dyno cards (200 stroke points each)...")
    cards_to_insert = []

    for (wid, ts_str, cycle_id), points in grouped.items():
        ts = dt_date.fromisoformat(ts_str)
        positions = [p["position_in"] for p in points]
        loads = [p["load_kN"] for p in points]

        peak_load = round(float(max(loads)), 2)
        min_load = round(float(min(loads)), 2)
        stroke_len = round(float(max(positions) - min(positions)), 1)
        card_area = round(calculate_card_area(positions, loads), 1)

        # Check ground truth failure event or kinematic shape detection
        fail_info = failures_map.get((wid, ts_str))
        
        diag_label = "Normal Operation"
        rod_float_risk = 0.08
        fluid_pound_risk = 0.05

        if fail_info:
            if fail_info["rod_floating"]:
                diag_label = "Rod Floating Detected"
                rod_float_risk = 0.88
            elif fail_info["impact_loading"]:
                diag_label = "Fluid Pound / Impact Loading"
                fluid_pound_risk = 0.92
            elif fail_info["gas_interference"]:
                diag_label = "Gas Interference"
            elif fail_info["pump_unsetting"]:
                diag_label = "Pump Unsetting Risk"
            elif fail_info["fault_type"]:
                diag_label = fail_info["fault_type"]
        else:
            # Kinematic heuristic on card shape:
            mid_idx = len(loads) // 2
            downstroke_min = min(loads[mid_idx:]) if mid_idx < len(loads) else min_load
            if downstroke_min < 7.5 and peak_load > 18.0:
                diag_label = "Moderate Rod Floating Risk"
                rod_float_risk = 0.65
            elif peak_load > 21.0:
                diag_label = "High Mechanical Stress"
                fluid_pound_risk = 0.55

        # Surface points array
        surface_pts = [
            {"position": round(float(p), 2), "load": round(float(l), 2)}
            for p, l in zip(positions, loads)
        ]
        # Downhole points
        downhole_pts = derive_downhole_card(positions, loads, stroke_len)

        card_id = f"{wid}-{ts.strftime('%Y%m%d')}"

        cards_to_insert.append({
            "card_id": card_id,
            "well_id": wid,
            "timestamp": ts,
            "css_cycle_id": cycle_id if cycle_id else None,
            "stroke_length_in": stroke_len if stroke_len > 0 else 68.0,
            "spm": 5.5,
            "peak_load_kn": peak_load,
            "min_load_kn": min_load,
            "card_area_kn_in": card_area,
            "diagnostic_label": diag_label,
            "rod_floating_risk": rod_float_risk,
            "fluid_pound_risk": fluid_pound_risk,
            "surface_points": surface_pts,
            "downhole_points": downhole_pts,
        })

    return cards_to_insert


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("Ensuring dynamometer_cards table exists...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    cards = process_cards()
    print(f"Inserting {len(cards)} dynamometer cards into PostgreSQL...")

    async with async_session() as session:
        # Check existing count
        res = await session.execute(select(DynamometerCard.id).limit(1))
        if res.first() is not None:
            print("Existing cards detected. Truncating dynamometer_cards table...")
            await session.execute(text("TRUNCATE TABLE dynamometer_cards RESTART IDENTITY CASCADE;"))
            await session.commit()

        # Batch insert
        batch_size = 50
        for i in range(0, len(cards), batch_size):
            batch = cards[i:i + batch_size]
            objects = [DynamometerCard(**c) for c in batch]
            session.add_all(objects)
            await session.commit()
            print(f"  Inserted {min(i + batch_size, len(cards))}/{len(cards)} cards...")

    await engine.dispose()
    print("Dynamometer card seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
