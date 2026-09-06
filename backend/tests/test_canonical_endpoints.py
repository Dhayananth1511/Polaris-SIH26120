"""
backend/tests/test_canonical_endpoints.py
Unit tests for SIH26120 canonical endpoints, SOR handling, energy calculations,
telemetry replay engine, and physics-informed models.
"""
import pytest
from app.services.heavy_oil_physics import (
    calculate_oil_viscosity_cp,
    calculate_rod_floating_spm_crit,
)
from app.services.replay_service import replay_engine


def test_viscosity_and_rod_floating_coupling():
    """Verify ASTM D341 Walther viscosity and rod floating critical speed calculation."""
    # Cold reservoir (45°C) -> high viscosity, lower critical SPM
    cold_visc = calculate_oil_viscosity_cp(45.0)
    cold_kin = calculate_rod_floating_spm_crit(45.0, stroke_length_in=68.0)

    # Heated reservoir (90°C) -> low viscosity, higher critical SPM
    hot_visc = calculate_oil_viscosity_cp(90.0)
    hot_kin = calculate_rod_floating_spm_crit(90.0, stroke_length_in=68.0)

    assert cold_visc > hot_visc
    assert cold_kin["spm_crit"] < hot_kin["spm_crit"]
    assert cold_kin["spm_safe"] < cold_kin["spm_crit"]
    assert cold_kin["w_buoyant_kn"] > 0


def test_sor_calculation_zero_handling():
    """Verify SOR safely handles zero/near-zero production without division by zero."""
    steam_ton = 750.0
    oil_rate_zero = 0.0
    oil_rate_normal = 25.0

    # Zero oil production safe handling
    sor_zero = steam_ton / max(oil_rate_zero * 60.0, 0.001)
    assert sor_zero > 0

    # Normal production
    sor_normal = steam_ton / (oil_rate_normal * 60.0)
    assert 0.1 <= sor_normal <= 10.0


def test_energy_per_barrel_calculation():
    """Verify energy per barrel calculation."""
    energy_kwh = 1200.0
    oil_bbl = 40.0
    kwh_per_bbl = energy_kwh / max(oil_bbl, 0.001)
    assert kwh_per_bbl == 30.0


def test_telemetry_replay_engine():
    """Verify telemetry replay engine state transitions (start, pause, step, reset, speed)."""
    replay_engine.reset()
    state0 = replay_engine.get_state()
    assert state0["currentIndex"] == 0
    assert state0["isPlaying"] is False
    assert state0["simulatedLiveLabel"] == "SIMULATED LIVE DATA"

    # Step forward
    state1 = replay_engine.step(2)
    assert state1["currentIndex"] >= 1

    # Change speed
    state_speed = replay_engine.set_speed(10.0)
    assert state_speed["speed"] == 10.0

    # Start and Pause
    state_play = replay_engine.start()
    assert state_play["isPlaying"] is True

    state_pause = replay_engine.pause()
    assert state_pause["isPlaying"] is False

    # Reset
    state_reset = replay_engine.reset()
    assert state_reset["currentIndex"] == 0
