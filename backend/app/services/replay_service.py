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

        # CSS Cycles data cache: cycle_id -> dict
        self._css_cycles_by_id: Dict[str, Dict[str, Any]] = {}
        # Telemetry data cache: well_id -> list of rows
        self._telemetry_by_well: Dict[str, List[Dict[str, Any]]] = {}
        self._load_telemetry_csv()

    def _load_telemetry_csv(self):
        dataset_dir = _find_dataset_dir()

        # 1. Load CSS Cycles metadata
        cycles_file = dataset_dir / "css_cycles.csv"
        if cycles_file.exists():
            try:
                with open(cycles_file, newline="", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        cid = (row.get("css_cycle_id") or "").strip().upper()
                        if not cid:
                            continue
                        self._css_cycles_by_id[cid] = {
                            "css_cycle_id": cid,
                            "well_id": (row.get("well_id") or "").strip().upper(),
                            "cycle_number": int(row.get("cycle_number") or 1),
                            "steam_volume_ton": float(row.get("steam_volume_ton") or 1200.0),
                            "steam_injection_rate_ton_hr": float(row.get("steam_injection_rate_ton_hr") or 4.0),
                            "steam_injection_pressure_bar": float(row.get("steam_injection_pressure_bar") or 75.0),
                            "steam_temperature_c": float(row.get("steam_temperature_C") or row.get("steam_temperature_c") or 220.0),
                            "injection_duration_hr": float(row.get("injection_duration_hr") or 336.0),
                            "soak_time_hr": float(row.get("soak_time_hr") or 144.0),
                            "production_cutoff": row.get("production_cutoff", ""),
                            "post_steam_temperature_c": float(row.get("post_steam_temperature_C") or row.get("post_steam_temperature_c") or 175.0),
                        }
            except Exception as err:
                logger.error("Failed to load CSS cycles CSV: %s", err)

        # 2. Load Telemetry Rows
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

                    # Case-insensitive column helper
                    def get_col(keys: List[str], default="0"):
                        for k in keys:
                            if k in row and row[k] is not None and str(row[k]).strip() != "":
                                return row[k]
                        return default

                    res_temp = float(get_col(["reservoir_temperature_C", "reservoir_temperature_c", "reservoir_temp_c"], "68.0"))
                    wh_temp = float(get_col(["wellhead_temperature_C", "wellhead_temperature_c", "wellhead_temp_c"], "52.0"))
                    press = float(get_col(["pressure_bar", "pressure"], "18.5"))
                    flow = float(get_col(["flow_rate_bpd", "flow_rate"], "28.5"))
                    rpm_val = float(get_col(["rpm", "spm"], "5.5"))
                    vib = float(get_col(["vibration_mm_s"], "2.8"))
                    mot_kw = float(get_col(["motor_power_kW", "motor_power_kw"], "22.4"))
                    mot_a = float(get_col(["motor_current_A", "motor_current_a"], "38.2"))
                    cycle_id = str(get_col(["css_cycle_id", "cycle_id"], "")).strip().upper()
                    phase_str = str(get_col(["phase"], "production")).strip().lower()

                    parsed = {
                        "telemetry_id": row.get("telemetry_id"),
                        "well_id": wid,
                        "timestamp": row.get("timestamp"),
                        "css_cycle_id": cycle_id,
                        "phase": phase_str,
                        "reservoir_temperature_c": res_temp,
                        "wellhead_temperature_c": wh_temp,
                        "pressure_bar": press,
                        "flow_rate_bpd": flow,
                        "rpm": rpm_val,
                        "vibration_mm_s": vib,
                        "motor_power_kw": mot_kw,
                        "motor_current_a": mot_a,
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

            # Cycle & Phase metadata
            cycle_id = current_row.get("css_cycle_id") or ""
            cycle_meta = self._css_cycles_by_id.get(cycle_id, {})
            if not cycle_meta and "-C" in cycle_id:
                try:
                    c_num = int(cycle_id.split("-C")[-1])
                except Exception:
                    c_num = 1
            else:
                c_num = cycle_meta.get("cycle_number", 1)

            phase = current_row.get("phase", "production").lower()
            steam_vol = cycle_meta.get("steam_volume_ton", 1250.0)
            steam_press = cycle_meta.get("steam_injection_pressure_bar", 75.0)
            soak_hr = cycle_meta.get("soak_time_hr", 144.0)
            steam_temp = cycle_meta.get("steam_temperature_c", 225.0)

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
                "cycleId": cycle_id,
                "cycleNumber": c_num,
                "phase": phase,
                "steamVolumeTon": steam_vol,
                "steamPressureBar": steam_press,
                "steamTemperatureC": steam_temp,
                "soakTimeHr": soak_hr,
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
                "motorCurrentA": current_row.get("motor_current_a", 0.0),
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

        # Compute full dynamic readings for ALL monitored wells in the field at current frame
        all_wells_readings = {}
        total_field_prod = 0.0
        total_motor_kw = 0.0
        field_effs = []
        for wid, wrows in self._telemetry_by_well.items():
            if not wrows:
                continue
            idx = min(self.current_index, len(wrows) - 1)
            row = wrows[idx]
            w_temp = float(row.get("reservoir_temperature_c") or 65.0)
            w_flow = float(row.get("flow_rate_bpd") or 20.0)
            w_press = float(row.get("pressure_bar") or 15.0)
            w_spm = float(row.get("rpm") or 5.5)
            w_vib = float(row.get("vibration_mm_s") or 2.5)
            w_mot_kw = float(row.get("motor_power_kw") or 20.0)

            w_visc = calculate_oil_viscosity_cp(w_temp)
            w_kin = calculate_rod_floating_spm_crit(w_temp, stroke_length_in=68.0)
            w_spm_crit = w_kin["spm_crit"]
            w_spm_safe = w_kin["spm_safe"]

            # Dynamic rod load physics approximation: buoyant string + head lift + fluid viscous drag
            viscous_drag_factor = min(7.5, (w_visc / 1000.0) * 1.1)
            rod_load_kn = round(10.2 + (w_flow * 0.11) + (w_spm * 0.42) + viscous_drag_factor, 2)

            # Dynamic pump efficiency: influenced by viscous resistance and spm filling
            pump_eff_pct = round(max(38.0, min(92.0, 76.0 - (w_visc / 320.0) + (w_spm * 1.4))), 1)

            # Heavy oil multi-variable failure risk score
            risk_score = 0.0
            if pump_eff_pct < 55.0:
                risk_score += 0.40
            elif pump_eff_pct < 65.0:
                risk_score += 0.22

            if rod_load_kn > 18.2:
                risk_score += 0.35
            elif rod_load_kn > 17.2:
                risk_score += 0.18

            if w_temp < 52.0:
                risk_score += 0.30
            elif w_temp < 60.0:
                risk_score += 0.15

            if w_spm >= w_spm_crit:
                risk_score += 0.40

            risk_score = min(1.0, risk_score)
            if risk_score >= 0.55:
                risk_tier = "High"
                status_tier = "Critical"
            elif risk_score >= 0.30:
                risk_tier = "Medium"
                status_tier = "Attention"
            else:
                risk_tier = "Low"
                status_tier = "Producing"

            if w_temp >= 78.0:
                css_phase = "Cycle 04 (Peak Heat)"
            elif w_temp >= 65.0:
                css_phase = "Cycle 04 (Production)"
            elif w_temp >= 50.0:
                css_phase = "Cycle 03 (Thermal Decline)"
            else:
                css_phase = "Cycle 03 (Cold Lift / Prep)"

            total_field_prod += w_flow
            total_motor_kw += w_mot_kw
            field_effs.append(pump_eff_pct)

            all_wells_readings[wid] = {
                "id": wid,
                "name": wid,
                "oilProduction": round(w_flow, 1),
                "temperature": round(w_temp, 1),
                "pressure": round(w_press, 1),
                "rodLoad": rod_load_kn,
                "pumpEfficiency": pump_eff_pct,
                "spm": round(w_spm, 2),
                "viscosityCP": round(w_visc, 1),
                "spmCrit": round(w_spm_crit, 2),
                "spmSafe": round(w_spm_safe, 2),
                "failureRisk": risk_tier,
                "failureRiskScore": round(risk_score, 3),
                "status": status_tier,
                "cssPhase": css_phase,
                "vibrationMmS": w_vib,
                "motorPowerKW": w_mot_kw,
                "timestamp": row.get("timestamp", ""),
            }

        avg_eff = round(sum(field_effs) / max(len(field_effs), 1), 1) if field_effs else 68.0

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
            "allWellsReadings": all_wells_readings,
            "fieldSummary": {
                "totalWells": len(self._telemetry_by_well),
                "totalProduction": round(total_field_prod, 1),
                "avgPressureBar": avg_p,
                "avgFlowRateBpd": avg_f,
                "avgSpm": avg_spm,
                "avgPumpEfficiency": avg_eff,
                "totalPowerKW": round(total_motor_kw, 1),
            },
        }


replay_engine = TelemetryReplayEngine()
