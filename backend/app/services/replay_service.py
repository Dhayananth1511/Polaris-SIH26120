"""
backend/app/services/replay_service.py
Telemetry Replay Engine for Heavy Oil Wellbore Digital Twin (SIH26120 Section 29)
Replays rows from well_telemetry.csv, advancing virtual operational time,
calculating real-time coupled viscosity, kinematics, and failure risks.
"""
from __future__ import annotations

import csv
import logging
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.services.heavy_oil_physics import (
    calculate_oil_viscosity_cp,
    calculate_rod_floating_spm_crit,
)

logger = logging.getLogger(__name__)


def _find_dataset_dir() -> Path:
    candidates = [
        Path(__file__).resolve().parent.parent.parent.parent / "database",
        Path(__file__).resolve().parent.parent.parent / "database",
        Path(__file__).resolve().parent / "database",
    ]
    for p in candidates:
        if p.exists() and (p / "well_telemetry.csv").exists():
            return p
    return candidates[0]


class TelemetryReplayEngine:
    """Manages telemetry playback for live simulated digital twin state."""

    def __init__(self):
        self._lock = threading.Lock()
        self.is_playing: bool = False
        self.speed: float = 1.0  # 1x, 5x, 10x, 50x
        self.active_well_id: str = "BGW-001"
        self.current_index: int = 0
        self.last_tick: float = time.time()

        # Telemetry data cache: well_id -> list of rows
        self._telemetry_by_well: Dict[str, List[Dict[str, Any]]] = {}
        self._load_telemetry_csv()

    def _load_telemetry_csv(self):
        dataset_dir = _find_dataset_dir()
        tel_file = dataset_dir / "well_telemetry.csv"
        if not tel_file.exists():
            logger.warning("Telemetry file not found at %s", tel_file)
            return

        try:
            with open(tel_file, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    wid = row.get("well_id", "").strip().upper()
                    if not wid:
                        continue
                    if wid not in self._telemetry_by_well:
                        self._telemetry_by_well[wid] = []

                    parsed = {
                        "telemetry_id": row.get("telemetry_id"),
                        "well_id": wid,
                        "timestamp": row.get("timestamp"),
                        "phase": row.get("phase", "Production"),
                        "reservoir_temperature_c": float(row.get("reservoir_temperature_c") or 68.0),
                        "wellhead_temperature_c": float(row.get("wellhead_temperature_c") or 52.0),
                        "pressure_bar": float(row.get("pressure_bar") or 18.5),
                        "flow_rate_bpd": float(row.get("flow_rate_bpd") or 28.5),
                        "rpm": float(row.get("rpm") or 5.5),
                        "vibration_mm_s": float(row.get("vibration_mm_s") or 2.8),
                        "motor_power_kw": float(row.get("motor_power_kw") or 22.4),
                        "motor_current_a": float(row.get("motor_current_a") or 38.2),
                    }
                    self._telemetry_by_well[wid].append(parsed)

            for wid in self._telemetry_by_well:
                self._telemetry_by_well[wid].sort(key=lambda x: x["timestamp"] or "")
            logger.info("Loaded telemetry for wells: %s", list(self._telemetry_by_well.keys()))
        except Exception as err:
            logger.error("Failed to load telemetry CSV: %s", err)

    def set_well(self, well_id: str) -> bool:
        with self._lock:
            wid = well_id.upper()
            if wid == "ALL" or wid in self._telemetry_by_well:
                self.active_well_id = wid
                # Preserve current_index so all wells remain in time-sync!
                return True
            return False

    def seek(self, frame_index: int) -> Dict[str, Any]:
        with self._lock:
            sample_rows = self._telemetry_by_well.get("BGW-001", [])
            total = len(sample_rows) or 400
            self.current_index = max(0, min(frame_index, total - 1))
            self.last_tick = time.time()
            return self._get_state_internal()

    def start(self, speed: Optional[float] = None) -> Dict[str, Any]:
        with self._lock:
            self.is_playing = True
            if speed:
                self.speed = float(speed)
            self.last_tick = time.time()
            return self._get_state_internal()

    def pause(self) -> Dict[str, Any]:
        with self._lock:
            self.is_playing = False
            return self._get_state_internal()

    def reset(self) -> Dict[str, Any]:
        with self._lock:
            self.current_index = 0
            self.is_playing = False
            self.last_tick = time.time()
            return self._get_state_internal()

    def step(self, steps: int = 1) -> Dict[str, Any]:
        with self._lock:
            sample_rows = self._telemetry_by_well.get("BGW-001", [])
            total = len(sample_rows) or 400
            self.current_index = (self.current_index + steps) % total
            self.last_tick = time.time()
            return self._get_state_internal()

    def set_speed(self, speed: float) -> Dict[str, Any]:
        with self._lock:
            self.speed = max(0.5, float(speed))
            return self._get_state_internal()

    def get_state(self) -> Dict[str, Any]:
        with self._lock:
            # If playing, auto-advance index based on elapsed time and speed
            if self.is_playing:
                now = time.time()
                elapsed = now - self.last_tick
                step_interval = max(0.2, 2.0 / self.speed)
                if elapsed >= step_interval:
                    steps_to_advance = int(elapsed / step_interval)
                    sample_rows = self._telemetry_by_well.get("BGW-001", [])
                    total = len(sample_rows) or 400
                    self.current_index = (self.current_index + steps_to_advance) % total
                    self.last_tick = now

            return self._get_state_internal()

    def _get_state_internal(self) -> Dict[str, Any]:
        target_well = "BGW-001" if self.active_well_id == "ALL" else self.active_well_id
        rows = self._telemetry_by_well.get(target_well, [])
        total = len(rows) or 400
        current_row = rows[self.current_index] if (rows and self.current_index < len(rows)) else None

        # Compute field-wide summary at current frame
        field_pressures = []
        field_flows = []
        field_spms = []
        for wid, wrows in self._telemetry_by_well.items():
            if self.current_index < len(wrows):
                r = wrows[self.current_index]
                field_pressures.append(r.get("pressure_bar", 0.0))
                field_flows.append(r.get("flow_rate_bpd", 0.0))
                field_spms.append(r.get("rpm", 5.5))

        if current_row:
            temp_c = current_row["reservoir_temperature_c"]
            visc_cp = calculate_oil_viscosity_cp(temp_c)
            kinematics = calculate_rod_floating_spm_crit(temp_c, stroke_length_in=68.0)
            spm = current_row.get("rpm", 5.5)
            spm_crit = kinematics["spm_crit"]

            # Rod float risk percentage
            if spm >= spm_crit:
                rod_floating_risk = min(100.0, 75.0 + (spm - spm_crit) * 15.0)
                risk_status = "CRITICAL"
            elif spm >= kinematics["spm_safe"]:
                rod_floating_risk = 40.0 + ((spm - kinematics["spm_safe"]) / max(0.1, spm_crit - kinematics["spm_safe"])) * 35.0
                risk_status = "MEDIUM"
            else:
                rod_floating_risk = max(5.0, (spm / max(0.1, kinematics["spm_safe"])) * 35.0)
                risk_status = "LOW"

            coupled_state = {
                "temperatureC": temp_c,
                "wellheadTempC": current_row["wellhead_temperature_c"],
                "pressureBar": current_row["pressure_bar"],
                "flowRateBpd": current_row["flow_rate_bpd"],
                "viscosityCP": visc_cp,
                "fluidMobility": round(1000.0 / max(visc_cp, 1.0), 3),
                "spm": spm,
                "spmCrit": spm_crit,
                "spmSafe": kinematics["spm_safe"],
                "rodFloatingRisk": round(rod_floating_risk, 1),
                "rodFloatingStatus": risk_status,
                "vibrationMmS": current_row["vibration_mm_s"],
                "motorPowerKW": current_row["motor_power_kw"],
                "timestamp": current_row["timestamp"],
            }
        else:
            coupled_state = {
                "temperatureC": 68.0,
                "wellheadTempC": 52.0,
                "pressureBar": 18.5,
                "flowRateBpd": 28.5,
                "viscosityCP": 1250.0,
                "fluidMobility": 0.8,
                "spm": 5.5,
                "spmCrit": 5.8,
                "spmSafe": 4.9,
                "rodFloatingRisk": 18.5,
                "rodFloatingStatus": "LOW",
                "vibrationMmS": 2.8,
                "motorPowerKW": 22.4,
                "timestamp": datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            }

        avg_p = round(sum(field_pressures) / max(len(field_pressures), 1), 2) if field_pressures else 18.5
        avg_f = round(sum(field_flows) / max(len(field_flows), 1), 2) if field_flows else 28.5
        avg_spm = round(sum(field_spms) / max(len(field_spms), 1), 2) if field_spms else 5.5

        return {
            "isPlaying": self.is_playing,
            "speed": self.speed,
            "activeWellId": self.active_well_id,
            "isFieldSync": self.active_well_id == "ALL",
            "availableWells": sorted(list(self._telemetry_by_well.keys())),
            "currentIndex": self.current_index,
            "totalFrames": total,
            "simulatedLiveLabel": "SIMULATED LIVE DATA",
            "prototypeDisclaimer": "Prototype Mode — Synthetic/Simulated Data",
            "decisionSupportNotice": "AI recommendations are decision-support outputs and require engineer validation before operational use.",
            "currentReading": coupled_state,
            "fieldSummary": {
                "totalWells": len(self._telemetry_by_well),
                "avgPressureBar": avg_p,
                "avgFlowRateBpd": avg_f,
                "avgSpm": avg_spm,
            },
        }


replay_engine = TelemetryReplayEngine()
