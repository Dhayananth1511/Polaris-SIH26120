"""
Polaris AI/ML Engine — Unit & Regression Tests
Tests ASTM D341 Walther calculations, Boberg-Lantz thermal dissipation,
multi-target production, SRP kinematics, dynamometer fault classification, and CSS Pareto optimization.
"""
import pytest
from app.ml.config import WALTHER, RESERVOIR, SRP
from app.ml.data.preprocessor import MLDataPreprocessor
from app.ml.models.css_optimizer import CSSOptimizerModel
from app.ml.models.fault_detector import FaultDetectorModel
from app.ml.models.production_forecaster import ProductionForecasterModel
from app.ml.models.reservoir_thermal import ReservoirThermalModel
from app.ml.models.srp_optimizer import SRPOptimizerModel
from app.ml.pipelines.inference_engine import ml_inference
from app.ml.schemas import (
    CSSOptimizeRequest,
    FaultDetectRequest,
    ProductionForecastRequest,
    ReservoirPredictRequest,
    SRPOptimizeRequest,
)


def test_walther_viscosity_calculation():
    """Verify ASTM D341 Walther viscosity equation behavior for heavy crude."""
    prep = MLDataPreprocessor()
    # At natural temp (48°C), Baghewala crude is viscous (> 2000 cP)
    visc_48c = prep.calculate_walther_viscosity(48.0)
    assert visc_48c > 2000.0

    # At steam temp (200°C), crude drops dramatically (< 50 cP)
    visc_200c = prep.calculate_walther_viscosity(200.0)
    assert visc_200c < 50.0

    # Monotonic decrease with temperature
    assert visc_48c > visc_200c


def test_srp_kinematics_spm_crit():
    """Verify SRP critical velocity and SPM_crit safety cushion calculation."""
    srp_model = SRPOptimizerModel()
    req = SRPOptimizeRequest(
        well_id="BGW-001",
        reservoir_temperature_c=90.0,
        current_spm=6.0,
        stroke_length_in=68.0
    )
    res = srp_model.optimize(req)
    assert res.well_id == "BGW-001"
    assert res.spm_crit_safe <= res.spm_crit_theoretical
    assert len(res.stages) == 4
    assert res.terminal_velocity_m_s > 0.0


def test_reservoir_thermal_prediction():
    """Verify Boberg-Lantz analytical decay trajectory."""
    thermal_model = ReservoirThermalModel()
    res = thermal_model.forecast_trajectory(
        well_id="BGW-001",
        steam_volume_ton=800.0,
        forecast_days=30
    )
    assert res.well_id == "BGW-001"
    assert res.heated_radius_m > 5.0
    assert len(res.forecast) == 30
    # First day must be hotter than day 30
    assert res.forecast[0].temperature_c > res.forecast[-1].temperature_c


def test_css_pareto_optimization():
    """Verify CSS Pareto candidate generation and economic ranking."""
    css_model = CSSOptimizerModel()
    req = CSSOptimizeRequest(
        well_id="BGW-001",
        current_cycle_number=1,
        oil_price_usd_bbl=75.0,
        steam_cost_usd_per_ton=32.0
    )
    res = css_model.optimize(req)
    assert len(res.candidates) == 3
    assert res.recommended_candidate_id in [1, 2, 3]
    # Check positive net economic value
    rec = next(c for c in res.candidates if c.id == res.recommended_candidate_id)
    assert rec.net_economic_value_usd > 0


def test_fault_detector_classification():
    """Verify mechanical fault diagnostics."""
    fault_model = FaultDetectorModel()
    # Simulate rod float signature: very low MPRL, high SPM
    req = FaultDetectRequest(
        well_id="BGW-001",
        spm=7.0,
        pprl_kn=60.0,
        mprl_kn=4.0,
        card_area_kn_in=1000.0,
        vibration_mm_s=3.0,
        motor_power_kw=15.0,
        motor_current_a=25.0
    )
    res = fault_model.detect(req)
    assert res.primary_fault in ["Rod Floating", "Normal Operation", "Impact Loading / Fluid Pound"]
    assert res.mtbf_days_estimate > 0
    assert len(res.recommended_actions) > 0


def test_ml_inference_well_insights():
    """Verify holistic single-well AI audit synthesis."""
    insights = ml_inference.get_well_insights("BGW-001")
    assert insights.well_id == "BGW-001"
    assert insights.spm_actual > 0
    assert insights.spm_crit_safe > 0
    assert insights.forecast_60d_cum_oil_bbl > 0
