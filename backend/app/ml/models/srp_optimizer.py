"""
Polaris AI/ML — Viscosity-Adaptive SRP Kinematics & Rod Float Optimizer
Calculates terminal rod fall velocity, critical SPM thresholds, and 4-stage VFD operational schedules.
"""
from __future__ import annotations

import logging
import math
from typing import List

from app.ml.config import RESERVOIR, SRP, WALTHER
from app.ml.data.preprocessor import MLDataPreprocessor
from app.ml.schemas import PumpingStage, SRPOptimizeRequest, SRPOptimizeResponse

logger = logging.getLogger(__name__)


class SRPOptimizerModel:
    """Computes hydrodynamic rod kinematics to prevent rod float, buckling, and tubing wear."""

    def __init__(self):
        self.preprocessor = MLDataPreprocessor()

    def optimize(self, req: SRPOptimizeRequest) -> SRPOptimizeResponse:
        """Calculates critical pumping parameters and recommends VFD setpoints."""
        temp_c = req.reservoir_temperature_c
        visc_cp = float(self.preprocessor.calculate_walther_viscosity(temp_c))
        depth_m = req.well_depth_m or RESERVOIR.NOMINAL_DEPTH_M
        stroke_in = req.stroke_length_in or SRP.STROKE_LENGTH_INCH
        stroke_m = stroke_in * 0.0254
        current_spm = req.current_spm or SRP.DEFAULT_SPM
        rod_od = req.rod_od_inch or SRP.ROD_OD_INCH
        tubing_id = req.tubing_id_inch or SRP.TUBING_ID_INCH

        # 1. Annular viscous drag coefficient C_drag (N.s / m^2)
        c_drag = self.preprocessor.calculate_annular_drag_coefficient(visc_cp, rod_od, tubing_id)

        # 2. Buoyant rod weight per meter (N/m)
        g = 9.80665
        w_rod_buoyant = SRP.ROD_AREA_M2 * SRP.ROD_STEEL_DENSITY_KG_M3 * g * SRP.BUOYANCY_FACTOR

        # 3. Critical terminal fall velocity v_crit (m/s)
        # v_crit = w_rod_buoyant / c_drag
        v_crit = max(0.05, min(3.5, w_rod_buoyant / max(1e-4, c_drag)))

        # 4. Critical theoretical SPM (harmonic peak velocity = pi * S * SPM / 60)
        # SPM_crit = (60 * v_crit) / (pi * stroke_m)
        spm_crit_theoretical = (60.0 * v_crit) / (math.pi * max(0.5, stroke_m))
        spm_crit_safe = spm_crit_theoretical * SRP.SPM_CRIT_SAFETY_FACTOR

        # Clamping to mechanical limits
        spm_crit_safe = max(SRP.MIN_SPM, min(SRP.MAX_SPM, spm_crit_safe))
        spm_crit_theoretical = max(SRP.MIN_SPM, min(14.0, spm_crit_theoretical))

        # 5. Rod floating risk score (%)
        if current_spm <= spm_crit_safe:
            float_risk_pct = max(2.0, (current_spm / spm_crit_safe) * 20.0)
        elif current_spm <= spm_crit_theoretical:
            float_risk_pct = 30.0 + ((current_spm - spm_crit_safe) / (spm_crit_theoretical - spm_crit_safe)) * 40.0
        else:
            float_risk_pct = min(99.0, 75.0 + (current_spm - spm_crit_theoretical) * 15.0)

        # 6. Recommended SPM & VFD Frequency
        recommended_spm = min(current_spm, spm_crit_safe) if current_spm > spm_crit_safe else min(spm_crit_safe, current_spm + 0.5)
        recommended_spm = round(max(SRP.MIN_SPM, min(SRP.MAX_SPM, recommended_spm)), 1)
        recommended_vfd_hz = round(max(15.0, min(60.0, (recommended_spm / SRP.DEFAULT_SPM) * 50.0)), 1)

        # 7. Post-CSS 4-Stage Operational Pumping Schedule
        stages: List[PumpingStage] = [
            PumpingStage(
                stage_number=1,
                stage_name="Peak Hot Flush",
                day_range="Days 1–14",
                temperature_range_c="> 140°C",
                viscosity_range_cp="10–60 cP",
                spm_recommended=6.8,
                vfd_hz_recommended=52.0,
                rod_float_risk_level="Low (< 10%)",
                operational_notes="Maximum fluid mobility. Pump at upper capacity to capture high-deliverability window."
            ),
            PumpingStage(
                stage_number=2,
                stage_name="Thermal Transition",
                day_range="Days 15–35",
                temperature_range_c="85–140°C",
                viscosity_range_cp="60–350 cP",
                spm_recommended=5.2,
                vfd_hz_recommended=44.0,
                rod_float_risk_level="Moderate (~25%)",
                operational_notes="Gradual viscosity buildup. Ramp down VFD to prevent excessive rod string tension cycles."
            ),
            PumpingStage(
                stage_number=3,
                stage_name="Viscous Build-up",
                day_range="Days 36–55",
                temperature_range_c="55–85°C",
                viscosity_range_cp="350–2,800 cP",
                spm_recommended=3.8,
                vfd_hz_recommended=34.0,
                rod_float_risk_level="High (50–75%)",
                operational_notes="SPM_crit safety cushion strictly enforced. Monitor downhole dynamometer for load delay."
            ),
            PumpingStage(
                stage_number=4,
                stage_name="Quasi-Steady Baseline",
                day_range="Days 56+",
                temperature_range_c="< 55°C",
                viscosity_range_cp="> 2,800 cP",
                spm_recommended=2.4,
                vfd_hz_recommended=24.0,
                rod_float_risk_level="Critical (> 80%)",
                operational_notes="Near-native crude viscosity. Maintain low SPM crawl speed or trigger subsequent CSS injection cycle."
            ),
        ]

        return SRPOptimizeResponse(
            well_id=req.well_id,
            current_temperature_c=round(temp_c, 1),
            walther_viscosity_cp=round(visc_cp, 1),
            terminal_velocity_m_s=round(v_crit, 3),
            spm_crit_theoretical=round(spm_crit_theoretical, 2),
            spm_crit_safe=round(spm_crit_safe, 2),
            current_spm=round(current_spm, 2),
            rod_floating_risk_pct=round(float_risk_pct, 1),
            recommended_spm=recommended_spm,
            recommended_vfd_hz=recommended_vfd_hz,
            stages=stages
        )
