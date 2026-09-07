"""
Polaris AI/ML Engine — Pydantic v2 Schemas for ML Inputs & Outputs
"""
from datetime import date, datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── Reservoir Thermal Model Schemas ──────────────────────────────────────────

class ReservoirPredictRequest(BaseModel):
    well_id: str = Field(..., description="Well identifier (e.g. BGW-001)")
    steam_volume_ton: float = Field(800.0, ge=100.0, le=3000.0, description="Injected steam volume (metric tons)")
    injection_temp_c: float = Field(235.0, ge=150.0, le=320.0, description="Steam injection temperature (°C)")
    soak_time_hr: float = Field(72.0, ge=12.0, le=300.0, description="Steam soak duration (hours)")
    forecast_days: int = Field(60, ge=1, le=180, description="Forecast horizon in days")


class DailyThermalPoint(BaseModel):
    day: int
    date: Optional[str] = None
    temperature_c: float
    physics_temperature_c: float
    residual_correction_c: float
    viscosity_cp: float
    thermal_stage: str


class ReservoirPredictResponse(BaseModel):
    well_id: str
    peak_temperature_c: float
    heated_radius_m: float
    heat_injected_mmbtu: float
    cooling_half_life_days: float
    forecast: List[DailyThermalPoint]


# ── Production Forecaster Schemas ────────────────────────────────────────────

class ProductionForecastRequest(BaseModel):
    well_id: str
    reservoir_temperature_c: float = Field(120.0, ge=20.0, le=300.0)
    pressure_bar: float = Field(22.0, ge=5.0, le=100.0)
    spm: float = Field(5.5, ge=1.0, le=12.0)
    stroke_length_in: float = Field(68.0, ge=30.0, le=120.0)
    pump_efficiency_pct: float = Field(75.0, ge=10.0, le=100.0)
    steam_volume_ton: float = Field(800.0, ge=100.0, le=3000.0)
    vibration_mm_s: float = Field(2.5, ge=0.1, le=25.0)
    motor_power_kw: float = Field(14.0, ge=1.0, le=75.0)
    horizon_days: int = Field(60, ge=7, le=120)


class DailyProductionPoint(BaseModel):
    day: int
    oil_rate_bpd: float
    water_cut_pct: float
    cumulative_oil_bbl: float
    daily_sor: float
    ci90_lower: float
    ci90_upper: float


class ProductionForecastResponse(BaseModel):
    well_id: str
    initial_oil_bpd: float
    cumulative_60d_oil_bbl: float
    average_sor: float
    expected_water_cut_pct: float
    viscosity_cp: float
    feature_importance: Dict[str, float] = {}
    forecast: List[DailyProductionPoint]


# ── SRP Kinematic Optimizer Schemas ──────────────────────────────────────────

class SRPOptimizeRequest(BaseModel):
    well_id: str
    reservoir_temperature_c: float = Field(..., ge=20.0, le=300.0)
    well_depth_m: Optional[float] = Field(950.0, ge=500.0, le=1500.0)
    stroke_length_in: Optional[float] = Field(68.0, ge=30.0, le=120.0)
    current_spm: Optional[float] = Field(5.5, ge=1.0, le=12.0)
    rod_od_inch: Optional[float] = Field(0.875, description="7/8-inch rod standard")
    tubing_id_inch: Optional[float] = Field(2.875, description="2-7/8-inch tubing")


class PumpingStage(BaseModel):
    stage_number: int
    stage_name: str
    day_range: str
    temperature_range_c: str
    viscosity_range_cp: str
    spm_recommended: float
    vfd_hz_recommended: float
    rod_float_risk_level: str
    operational_notes: str


class SRPOptimizeResponse(BaseModel):
    well_id: str
    current_temperature_c: float
    walther_viscosity_cp: float
    terminal_velocity_m_s: float
    spm_crit_theoretical: float
    spm_crit_safe: float
    current_spm: float
    rod_floating_risk_pct: float
    recommended_spm: float
    recommended_vfd_hz: float
    stages: List[PumpingStage]


# ── Fault Detector Schemas ───────────────────────────────────────────────────

class FaultDetectRequest(BaseModel):
    well_id: str
    spm: float = Field(5.5, ge=1.0, le=12.0)
    pprl_kn: float = Field(55.0, ge=5.0, le=200.0, description="Peak Polished Rod Load (kN)")
    mprl_kn: float = Field(18.0, ge=0.0, le=100.0, description="Minimum Polished Rod Load (kN)")
    card_area_kn_in: float = Field(2100.0, ge=100.0, le=8000.0)
    vibration_mm_s: float = Field(3.2, ge=0.1, le=30.0)
    motor_power_kw: float = Field(15.5, ge=1.0, le=80.0)
    motor_current_a: float = Field(26.0, ge=2.0, le=120.0)
    fluid_level_m: Optional[float] = Field(450.0, ge=50.0, le=1200.0)
    reservoir_temperature_c: Optional[float] = Field(75.0, ge=20.0, le=280.0)


class FaultProbabilities(BaseModel):
    rod_floating: float
    impact_loading: float
    pump_unsetting: float
    gas_interference: float
    normal_operation: float


class FaultDetectResponse(BaseModel):
    well_id: str
    primary_fault: str
    confidence_pct: float
    severity: str
    probabilities: FaultProbabilities
    mtbf_days_estimate: float
    recommended_actions: List[str]


# ── CSS Cycle Optimizer Schemas ──────────────────────────────────────────────

class CSSOptimizeRequest(BaseModel):
    well_id: str
    current_cycle_number: int = Field(1, ge=1, le=10)
    steam_cost_usd_per_ton: float = Field(32.0, ge=10.0, le=100.0)
    oil_price_usd_bbl: float = Field(75.0, ge=30.0, le=150.0)
    min_steam_volume_ton: float = Field(500.0, ge=300.0, le=1500.0)
    max_steam_volume_ton: float = Field(1600.0, ge=800.0, le=2500.0)


class ParetoCandidate(BaseModel):
    id: int
    name: str
    steam_volume_ton: float
    injection_pressure_bar: float
    soak_time_hr: float
    predicted_cumulative_oil_bbl: float
    predicted_sor: float
    estimated_steam_cost_usd: float
    estimated_revenue_usd: float
    net_economic_value_usd: float
    tradeoff_summary: str


class CSSOptimizeResponse(BaseModel):
    well_id: str
    cycle_number: int
    recommended_candidate_id: int
    candidates: List[ParetoCandidate]
    explanation: str


# ── Model Status & Metrics Schemas ───────────────────────────────────────────

class SingleModelMetric(BaseModel):
    status: str
    sample_count: int
    metrics: Dict[str, float]
    last_trained: Optional[str] = None
    artifact_path: Optional[str] = None


class ModelStatusResponse(BaseModel):
    models: Dict[str, SingleModelMetric]
    overall_system_status: str
    trained_artifacts_directory: str


# ── Well Aggregate Insights Schemas ──────────────────────────────────────────

class WellInsightsResponse(BaseModel):
    well_id: str
    reservoir_temperature_c: float
    viscosity_cp: float
    thermal_phase: str
    spm_actual: float
    spm_crit_safe: float
    rod_float_risk_pct: float
    forecast_60d_cum_oil_bbl: float
    forecast_sor: float
    fault_diagnosis: str
    fault_confidence_pct: float
    recommended_css_volume_ton: float
    recommended_spm: float
    alerts_count: int
