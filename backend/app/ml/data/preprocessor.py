"""
Polaris AI/ML Data Preprocessor & Feature Engineering
Implements:
  - Walther ASTM D341 heavy oil viscosity transformations
  - Kinematic Stokes & annular viscous drag coefficients
  - Dynamometer card morphological descriptors
  - Time-decay exponential kernels for cyclic steam heat transfer
"""
from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from app.ml.config import RESERVOIR, WALTHER, SRP, STEAM


class MLDataPreprocessor:
    """Feature engineering, transformations, and morphological extraction."""

    @staticmethod
    def calculate_walther_viscosity(temp_c: float | np.ndarray) -> float | np.ndarray:
        """
        Computes dynamic viscosity in centipoise (cP) via ASTM D341 Walther formula:
        log10(log10(v + 0.7)) = A - B * log10(T_kelvin)
        """
        if isinstance(temp_c, (int, float)):
            clamped_c = max(WALTHER.MIN_TEMP_C, min(WALTHER.MAX_TEMP_C, float(temp_c)))
            tk = clamped_c + 273.15
            y = WALTHER.A - WALTHER.B * math.log10(tk)
            y = max(-0.2, min(0.85, y))
            visc = math.pow(10.0, math.pow(10.0, y)) - 0.7
            return max(WALTHER.MIN_VISCOSITY_CP, min(WALTHER.MAX_VISCOSITY_CP, visc))

        clamped_c = np.clip(temp_c, WALTHER.MIN_TEMP_C, WALTHER.MAX_TEMP_C)
        tk = clamped_c + 273.15
        y = WALTHER.A - WALTHER.B * np.log10(tk)
        y = np.clip(y, -0.2, 0.85)
        visc = np.power(10.0, np.power(10.0, y)) - 0.7
        return np.clip(visc, WALTHER.MIN_VISCOSITY_CP, WALTHER.MAX_VISCOSITY_CP)

    @staticmethod
    def calculate_annular_drag_coefficient(viscosity_cp: float, rod_od_inch: float = 0.875, tubing_id_inch: float = 2.875) -> float:
        """
        Calculates viscous drag coefficient per meter of rod string:
        C_drag = 2 * pi * mu / ln(D_tubing / D_rod)
        mu in Pa.s = viscosity_cp * 0.001
        """
        mu_pa_s = max(0.001, viscosity_cp * 0.001)
        r_ratio = max(1.1, tubing_id_inch / rod_od_inch)
        c_drag = (2.0 * math.pi * mu_pa_s) / math.log(r_ratio)
        return c_drag

    @staticmethod
    def compute_dyno_card_features(pprl_kn: float, mprl_kn: float, card_area_kn_in: float, stroke_in: float = 68.0) -> Dict[str, float]:
        """Derives morphological card indicators for pump diagnostics."""
        load_range = max(1.0, pprl_kn - mprl_kn)
        theoretical_box_area = pprl_kn * stroke_in
        fullness_ratio = max(0.01, min(1.0, card_area_kn_in / max(1.0, theoretical_box_area)))
        load_ratio = mprl_kn / max(1.0, pprl_kn)
        return {
            "load_range_kn": load_range,
            "card_fullness_ratio": fullness_ratio,
            "load_ratio": load_ratio
        }

    def extract_thermal_matrices(self, df: pd.DataFrame) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """Extracts engineered feature matrix X and residual target y."""
        data = df.copy()
        if "walther_viscosity" not in data.columns:
            data["walther_viscosity"] = data["reservoir_temperature_c"].apply(self.calculate_walther_viscosity)

        feature_cols = [
            "reservoir_temperature_c",
            "pressure_bar",
            "vibration_mm_s",
            "motor_power_kw",
            "walther_viscosity"
        ]
        for col in feature_cols:
            if col not in data.columns:
                data[col] = 0.0

        X = data[feature_cols].values.astype(np.float32)
        y = None
        if "physics_temperature_c" in data.columns and "reservoir_temperature_c" in data.columns:
            y = (data["reservoir_temperature_c"] - data["physics_temperature_c"]).values.astype(np.float32)
        return X, y

    def extract_production_matrices(self, df: pd.DataFrame) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """Extracts feature matrix X and multi-targets y."""
        data = df.copy()
        if "walther_viscosity" not in data.columns:
            data["walther_viscosity"] = data["reservoir_temperature_c"].apply(self.calculate_walther_viscosity)

        feature_cols = [
            "reservoir_temperature_c",
            "pressure_bar",
            "spm",
            "pump_efficiency_pct",
            "steam_volume_ton",
            "vibration_mm_s",
            "motor_power_kw",
            "walther_viscosity"
        ]
        for col in feature_cols:
            if col not in data.columns:
                data[col] = 0.0

        X = data[feature_cols].values.astype(np.float32)
        target_cols = ["oil_rate_bpd", "water_cut_pct", "cumulative_oil_bbl", "sor"]
        y = data[target_cols].values.astype(np.float32) if all(c in data.columns for c in target_cols) else None
        return X, y

    def extract_fault_matrices(self, df: pd.DataFrame) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """Extracts feature matrix X and label vector y."""
        data = df.copy()
        feature_cols = [
            "spm",
            "pprl_kn",
            "mprl_kn",
            "card_area_kn_in",
            "vibration_mm_s",
            "motor_power_kw",
            "motor_current_a",
            "fluid_level_m"
        ]
        for col in feature_cols:
            if col not in data.columns:
                data[col] = 0.0

        X = data[feature_cols].values.astype(np.float32)
        y = data["fault_label"].values if "fault_label" in data.columns else None
        return X, y
