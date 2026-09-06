"""
Polaris AI/ML Multi-Source Dataset Loader
Loads and harmonizes training data from:
  1. Local CSV files in database/ (with automatic lowercase header normalization)
  2. Multi-table joins across telemetry, production, srp_operations, failure_events, and dynamometer_cards
  3. High-fidelity Baghewala physical simulation generator (fallback guarantee)
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional, Tuple
import numpy as np
import pandas as pd

from app.ml.config import RESERVOIR, WALTHER, STEAM, SRP

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[4]  # d:/Polaris-SIH26120
_DB_DIR = _PROJECT_ROOT / "database"

_CSV_TELEMETRY = _DB_DIR / "well_telemetry.csv"
_CSV_PRODUCTION = _DB_DIR / "production.csv"
_CSV_SRP = _DB_DIR / "srp_operations.csv"
_CSV_FAILURE = _DB_DIR / "failure_events.csv"
_CSV_DYNO = _DB_DIR / "dynamometer_cards.csv"


class DataLoader:
    """Loads and harmonizes reservoir, production, SRP, and failure records."""

    def __init__(self, db_dir: Optional[Path] = None):
        self.db_dir = db_dir or _DB_DIR

    def load_raw_csv_datasets(self) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Loads available CSV files, lowercasing all column names."""
        def _read_safe(path: Path) -> pd.DataFrame:
            if path.exists() and path.stat().st_size > 50:
                try:
                    df = pd.read_csv(path, low_memory=False)
                    df.columns = [c.strip().lower() for c in df.columns]
                    if "timestamp" in df.columns:
                        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
                    return df
                except Exception as err:
                    logger.warning("Failed to parse CSV %s: %s", path, err)
            return pd.DataFrame()

        df_tel = _read_safe(_CSV_TELEMETRY)
        df_prod = _read_safe(_CSV_PRODUCTION)
        df_srp = _read_safe(_CSV_SRP)
        df_fail = _read_safe(_CSV_FAILURE)
        df_dyno = _read_safe(_CSV_DYNO)
        return df_tel, df_prod, df_srp, df_fail, df_dyno

    def get_thermal_dataset(self) -> pd.DataFrame:
        """
        Extracts heating/cooling time-series data for Boberg-Lantz thermal modeling.
        """
        df_tel, _, df_srp, _, _ = self.load_raw_csv_datasets()
        if not df_tel.empty and "reservoir_temperature_c" in df_tel.columns and len(df_tel) >= 50:
            df = df_tel.dropna(subset=["reservoir_temperature_c"]).copy()
            if "pressure_bar" not in df.columns:
                df["pressure_bar"] = RESERVOIR.NATURAL_PRESSURE_BAR
            if "vibration_mm_s" not in df.columns:
                df["vibration_mm_s"] = 2.5
            if "motor_power_kw" not in df.columns:
                df["motor_power_kw"] = 14.0

            # Compute physics temperature baseline for residual training
            initial_t = 190.0
            day_series = (df["timestamp"] - df["timestamp"].min()).dt.days if "timestamp" in df.columns else np.arange(len(df))
            decay = np.exp(-0.032 * (day_series % 60))
            df["physics_temperature_c"] = RESERVOIR.NATURAL_TEMPERATURE_C + (initial_t - RESERVOIR.NATURAL_TEMPERATURE_C) * decay
            return df

        # High-fidelity fallback
        logger.info("Generating synthetic Baghewala thermal baseline dataset...")
        rows = []
        np.random.seed(42)
        for well_idx in range(1, 11):
            well_id = f"BGW-{well_idx:03d}"
            steam_vol = np.random.uniform(500, 1600)
            initial_t = min(220.0, RESERVOIR.NATURAL_TEMPERATURE_C + 0.11 * steam_vol + np.random.normal(0, 3.0))
            for day in range(1, 91):
                decay_rate = 0.028 + 0.008 * (1000.0 / steam_vol)
                physics_t = RESERVOIR.NATURAL_TEMPERATURE_C + (initial_t - RESERVOIR.NATURAL_TEMPERATURE_C) * np.exp(-decay_rate * day)
                actual_t = physics_t + np.random.normal(0, 1.8) * np.sin(day / 7.0)
                rows.append({
                    "well_id": well_id,
                    "day": day,
                    "steam_volume_ton": steam_vol,
                    "pressure_bar": max(15.0, RESERVOIR.NATURAL_PRESSURE_BAR + 8.0 * np.exp(-0.04 * day)),
                    "reservoir_temperature_c": round(actual_t, 2),
                    "physics_temperature_c": round(physics_t, 2),
                    "vibration_mm_s": round(max(0.5, 2.0 + 1.5 * (1.0 - actual_t / initial_t) + np.random.normal(0, 0.2)), 2),
                    "motor_power_kw": round(max(5.0, 18.0 - 0.05 * actual_t + np.random.normal(0, 0.5)), 2),
                    "spm": round(np.random.choice([4.5, 5.0, 5.5, 6.0, 6.5]), 1)
                })
        return pd.DataFrame(rows)

    def get_production_dataset(self) -> pd.DataFrame:
        """
        Extracts multi-target production metrics: oil rate, water cut, cumulative oil, SOR.
        Merges production records with telemetry and srp operations on ['well_id', 'timestamp'].
        """
        df_tel, df_prod, df_srp, _, _ = self.load_raw_csv_datasets()
        if not df_prod.empty and "oil_rate_bpd" in df_prod.columns and len(df_prod) >= 50:
            merged = df_prod.copy()

            # Merge with telemetry
            if not df_tel.empty and "timestamp" in df_tel.columns and "well_id" in df_tel.columns:
                tel_sub = df_tel[["well_id", "timestamp", "reservoir_temperature_c", "vibration_mm_s"]].drop_duplicates()
                merged = pd.merge(merged, tel_sub, on=["well_id", "timestamp"], how="left")

            # Merge with srp operations
            if not df_srp.empty and "timestamp" in df_srp.columns and "well_id" in df_srp.columns:
                srp_sub = df_srp[["well_id", "timestamp", "spm", "pump_efficiency_pct", "motor_power_kw"]].drop_duplicates()
                merged = pd.merge(merged, srp_sub, on=["well_id", "timestamp"], how="left")

            # Fill any missing columns with standard Baghewala defaults
            if "reservoir_temperature_c" not in merged.columns or merged["reservoir_temperature_c"].isna().all():
                merged["reservoir_temperature_c"] = 115.0
            else:
                merged["reservoir_temperature_c"] = merged["reservoir_temperature_c"].fillna(115.0)

            if "pressure_bar" not in merged.columns:
                if "bottomhole_pressure_bar" in merged.columns:
                    merged["pressure_bar"] = merged["bottomhole_pressure_bar"].fillna(RESERVOIR.NATURAL_PRESSURE_BAR)
                else:
                    merged["pressure_bar"] = RESERVOIR.NATURAL_PRESSURE_BAR

            if "spm" not in merged.columns:
                merged["spm"] = SRP.DEFAULT_SPM
            else:
                merged["spm"] = merged["spm"].fillna(SRP.DEFAULT_SPM)

            if "pump_efficiency_pct" not in merged.columns:
                merged["pump_efficiency_pct"] = 72.0
            else:
                merged["pump_efficiency_pct"] = merged["pump_efficiency_pct"].fillna(72.0)

            if "steam_volume_ton" not in merged.columns:
                if "steam_consumption_ton" in merged.columns:
                    merged["steam_volume_ton"] = merged["steam_consumption_ton"].fillna(STEAM.DEFAULT_CYCLE_STEAM_VOLUME_TON)
                else:
                    merged["steam_volume_ton"] = STEAM.DEFAULT_CYCLE_STEAM_VOLUME_TON

            if "vibration_mm_s" not in merged.columns:
                merged["vibration_mm_s"] = 2.4
            else:
                merged["vibration_mm_s"] = merged["vibration_mm_s"].fillna(2.4)

            if "motor_power_kw" not in merged.columns:
                if "energy_consumption_kwh" in merged.columns:
                    merged["motor_power_kw"] = (merged["energy_consumption_kwh"] / 24.0).fillna(15.0)
                else:
                    merged["motor_power_kw"] = 15.0
            else:
                merged["motor_power_kw"] = merged["motor_power_kw"].fillna(15.0)

            if "sor" not in merged.columns and "sor" in [c.lower() for c in merged.columns]:
                merged["sor"] = 3.2

            return merged.dropna(subset=["oil_rate_bpd"]).copy()

        # High-fidelity fallback
        logger.info("Generating synthetic Baghewala multi-target production dataset...")
        rows = []
        np.random.seed(42)
        for well_idx in range(1, 15):
            well_id = f"BGW-{well_idx:03d}"
            steam_vol = np.random.uniform(600, 1500)
            cum_oil = 0.0
            for day in range(1, 75):
                temp = RESERVOIR.NATURAL_TEMPERATURE_C + (180.0 - RESERVOIR.NATURAL_TEMPERATURE_C) * np.exp(-0.035 * day)
                temp_k = temp + 273.15
                y = WALTHER.A - WALTHER.B * np.log10(temp_k)
                visc = max(5.0, np.power(10.0, np.power(10.0, y)) - 0.7)

                spm = 6.0 if day < 15 else (5.2 if day < 40 else 4.0)
                pump_eff = max(0.40, 0.85 - 0.00008 * visc)
                q_disp = 0.1166 * (SRP.PLUNGER_DIAMETER_INCH ** 2) * SRP.STROKE_LENGTH_INCH * spm * pump_eff
                oil_rate = max(5.0, (q_disp * 0.45) * (1500.0 / visc) ** 0.22 + np.random.normal(0, 2.0))
                cum_oil += oil_rate
                water_cut = min(88.0, 35.0 + 40.0 * (1.0 - np.exp(-0.04 * day)) + np.random.normal(0, 1.5))
                sor = (steam_vol * 6.2898) / max(10.0, cum_oil)
                energy_kwh = max(8.0, 22.0 + 0.0003 * visc + np.random.normal(0, 1.0))

                rows.append({
                    "well_id": well_id,
                    "day": day,
                    "reservoir_temperature_c": round(temp, 2),
                    "pressure_bar": round(24.0 - 0.08 * day, 2),
                    "spm": spm,
                    "stroke_length_in": SRP.STROKE_LENGTH_INCH,
                    "pump_efficiency_pct": round(pump_eff * 100.0, 1),
                    "steam_volume_ton": round(steam_vol, 1),
                    "vibration_mm_s": round(2.0 + 0.02 * day + np.random.normal(0, 0.1), 2),
                    "motor_power_kw": round(12.0 + 0.05 * day + np.random.normal(0, 0.3), 2),
                    "oil_rate_bpd": round(oil_rate, 2),
                    "water_cut_pct": round(water_cut, 1),
                    "cumulative_oil_bbl": round(cum_oil, 1),
                    "sor": round(max(0.5, min(18.0, sor)), 2),
                    "energy_consumption_kwh": round(energy_kwh, 2)
                })
        return pd.DataFrame(rows)

    def get_fault_dataset(self) -> pd.DataFrame:
        """
        Extracts or generates labeled dynamometer & mechanical fault events.
        Integrates failure events and card morphology where available.
        """
        df_tel, _, df_srp, df_fail, df_dyno = self.load_raw_csv_datasets()

        # If dynamometer points exist, calculate pprl, mprl, area
        if not df_dyno.empty and "position_in" in df_dyno.columns and "load_kn" in df_dyno.columns:
            try:
                grouped = df_dyno.groupby(["well_id", "timestamp"])
                card_summary = grouped.agg(
                    pprl_kn=("load_kn", "max"),
                    mprl_kn=("load_kn", "min"),
                    mean_load=("load_kn", "mean"),
                    stroke_in=("position_in", "max")
                ).reset_index()
                card_summary["card_area_kn_in"] = (card_summary["pprl_kn"] - card_summary["mprl_kn"]) * card_summary["stroke_in"] * 0.72

                # Merge with SRP for SPM and power
                if not df_srp.empty:
                    card_summary = pd.merge(card_summary, df_srp[["well_id", "timestamp", "spm", "motor_power_kw"]], on=["well_id", "timestamp"], how="left")
                # Merge with Telemetry for vibration
                if not df_tel.empty:
                    card_summary = pd.merge(card_summary, df_tel[["well_id", "timestamp", "vibration_mm_s", "motor_current_a"]], on=["well_id", "timestamp"], how="left")

                card_summary["spm"] = card_summary["spm"].fillna(SRP.DEFAULT_SPM)
                card_summary["motor_power_kw"] = card_summary["motor_power_kw"].fillna(15.0)
                card_summary["motor_current_a"] = card_summary["motor_current_a"].fillna(25.0)
                card_summary["vibration_mm_s"] = card_summary["vibration_mm_s"].fillna(2.5)
                card_summary["fluid_level_m"] = 450.0

                # Label assignment based on physical thresholds
                labels = []
                for _, r in card_summary.iterrows():
                    if r["mprl_kn"] < 8.0 and r["spm"] >= 5.5:
                        labels.append("rod_floating")
                    elif r["vibration_mm_s"] > 5.0 or r["pprl_kn"] > 70.0:
                        labels.append("impact_loading")
                    elif r["motor_power_kw"] > 22.0 and r["mprl_kn"] > 25.0:
                        labels.append("pump_unsetting")
                    elif r["card_area_kn_in"] < 900.0:
                        labels.append("gas_interference")
                    else:
                        labels.append("normal_operation")

                card_summary["fault_label"] = labels
                return card_summary
            except Exception as err:
                logger.warning("Dynamometer card processing fallback: %s", err)

        # High-fidelity synthesis fallback
        logger.info("Generating synthetic Baghewala dynamometer fault classification dataset...")
        rows = []
        np.random.seed(101)
        classes = ["normal_operation", "rod_floating", "impact_loading", "pump_unsetting", "gas_interference"]
        weights = [0.45, 0.25, 0.15, 0.08, 0.07]

        for idx in range(800):
            lbl = np.random.choice(classes, p=weights)
            spm = np.random.uniform(3.0, 8.5)
            pprl = np.random.uniform(40.0, 75.0)
            mprl = np.random.uniform(15.0, 30.0)
            card_area = np.random.uniform(1800.0, 3200.0)
            vibration = np.random.uniform(1.2, 4.0)
            power_kw = np.random.uniform(10.0, 22.0)
            current_a = np.random.uniform(18.0, 38.0)
            fluid_level = np.random.uniform(300.0, 800.0)

            if lbl == "rod_floating":
                mprl = np.random.uniform(0.0, 8.0)
                spm = np.random.uniform(6.5, 9.5)
                card_area = np.random.uniform(800.0, 1600.0)
                vibration = np.random.uniform(4.0, 9.5)
            elif lbl == "impact_loading":
                vibration = np.random.uniform(6.0, 18.0)
                pprl = np.random.uniform(70.0, 110.0)
                fluid_level = np.random.uniform(750.0, 1100.0)
            elif lbl == "pump_unsetting":
                mprl = np.random.uniform(25.0, 50.0)
                card_area = np.random.uniform(400.0, 1100.0)
                power_kw = np.random.uniform(24.0, 38.0)
            elif lbl == "gas_interference":
                card_area = np.random.uniform(1200.0, 1900.0)
                pprl = np.random.uniform(35.0, 55.0)

            rows.append({
                "sample_id": f"SMP-{idx:05d}",
                "spm": round(spm, 2),
                "pprl_kn": round(pprl, 2),
                "mprl_kn": round(mprl, 2),
                "card_area_kn_in": round(card_area, 1),
                "vibration_mm_s": round(vibration, 2),
                "motor_power_kw": round(power_kw, 2),
                "motor_current_a": round(current_a, 2),
                "fluid_level_m": round(fluid_level, 1),
                "fault_label": lbl,
            })
        return pd.DataFrame(rows)


data_loader = DataLoader()
