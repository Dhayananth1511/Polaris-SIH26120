"""
Polaris AI/ML Engine — Physical Constants & Reservoir Configuration
Field: Oil India Limited (OIL), Baghewala Heavy Oil PML Field, Rajasthan, India
"""
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class WaltherConfig:
    """ASTM D341 Walther Viscosity Equation Coefficients for Baghewala 17-19° API Crude."""
    A: float = 7.043
    B: float = 2.590
    MIN_TEMP_C: float = 10.0
    MAX_TEMP_C: float = 350.0
    MIN_VISCOSITY_CP: float = 4.0
    MAX_VISCOSITY_CP: float = 250_000.0


@dataclass(frozen=True)
class BaghewalaReservoirConfig:
    """Reservoir, fluid, and formation parameters for Baghewala heavy oil."""
    API_GRAVITY: float = 18.0
    OIL_DENSITY_KG_M3: float = 945.0
    NATURAL_TEMPERATURE_C: float = 48.0
    NATURAL_PRESSURE_BAR: float = 18.5
    MIN_WELL_DEPTH_M: float = 850.0
    MAX_WELL_DEPTH_M: float = 1115.0
    NOMINAL_DEPTH_M: float = 950.0
    NET_PAY_THICKNESS_M: float = 14.5
    POROSITY: float = 0.28
    OIL_SATURATION: float = 0.65
    ROCK_HEAT_CAPACITY_KJ_KG_K: float = 1.05
    ROCK_DENSITY_KG_M3: float = 2400.0
    FORMATION_VOLUMETRIC_HEAT_CAPACITY_KJ_M3_K: float = 2350.0
    THERMAL_DIFFUSIVITY_M2_DAY: float = 0.045


@dataclass(frozen=True)
class SteamConfig:
    """Steam injection thermodynamic baseline constants."""
    LATENT_HEAT_KJ_KG: float = 2257.0
    SATURATION_TEMP_AT_30BAR_C: float = 233.9
    DEFAULT_STEAM_QUALITY: float = 0.80
    NOMINAL_INJECTION_RATE_TON_HR: float = 12.0
    DEFAULT_CYCLE_STEAM_VOLUME_TON: float = 800.0
    MIN_STEAM_VOLUME_TON: float = 400.0
    MAX_STEAM_VOLUME_TON: float = 2200.0


@dataclass(frozen=True)
class SRPEquipmentConfig:
    """Sucker Rod Pumping (SRP) kinematic & mechanical parameters."""
    ROD_OD_INCH: float = 0.875       # 7/8" Grade D
    ROD_AREA_M2: float = 0.000388    # pi*(0.022225/2)^2
    ROD_STEEL_DENSITY_KG_M3: float = 7850.0
    TUBING_ID_INCH: float = 2.875     # 2-7/8" Tubing
    PLUNGER_DIAMETER_INCH: float = 1.75
    STROKE_LENGTH_INCH: float = 68.0
    DEFAULT_SPM: float = 5.5
    MIN_SPM: float = 1.5
    MAX_SPM: float = 9.5
    SPM_CRIT_SAFETY_FACTOR: float = 0.90  # 10% safety margin below theoretical float speed
    BUOYANCY_FACTOR: float = 0.8797       # 1 - (oil_density / steel_density) = 1 - (945/7850)


# Directory paths
ML_DIR = Path(__file__).resolve().parent
TRAINED_ARTIFACTS_DIR = ML_DIR / "trained_artifacts"
TRAINED_ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

# Instantiate singleton configs
WALTHER = WaltherConfig()
RESERVOIR = BaghewalaReservoirConfig()
STEAM = SteamConfig()
SRP = SRPEquipmentConfig()
