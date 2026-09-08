-- =============================================================================
-- POLARIS SIH26120: Baghewala Heavy Oil Well-to-Surface Digital Twin Schema
-- Database: PostgreSQL 15+ / Neon Serverless Postgres
-- Schema specification: 14 Logical Tables with PK/FK, Types, and Indexes
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Wells Master Table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wells (
    id VARCHAR(20) PRIMARY KEY,                         -- e.g. BGW-001
    field VARCHAR(100) NOT NULL DEFAULT 'Baghewala',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    well_depth_m DOUBLE PRECISION NOT NULL,
    pump_depth_m DOUBLE PRECISION NOT NULL,
    reservoir VARCHAR(200) DEFAULT 'Jodhpur Sandstone',
    formation VARCHAR(200) DEFAULT 'Jodhpur Sandstone',
    oil_api DOUBLE PRECISION,
    initial_reservoir_pressure_bar DOUBLE PRECISION,
    initial_reservoir_temperature_c DOUBLE PRECISION,
    automation_type VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'Producing',
    well_type VARCHAR(50) NOT NULL DEFAULT 'CSS + SRP',
    spud_date VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wells_field ON wells(field);
CREATE INDEX IF NOT EXISTS idx_wells_status ON wells(status);

-- ── 2. Reservoir Properties ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservoir_properties (
    id SERIAL PRIMARY KEY,
    well_id VARCHAR(20) NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    permeability_md DOUBLE PRECISION DEFAULT 1200.0,
    porosity_pct DOUBLE PRECISION DEFAULT 28.5,
    net_pay_thickness_m DOUBLE PRECISION DEFAULT 14.2,
    rock_compressibility_1_bar DOUBLE PRECISION DEFAULT 4.5e-5,
    thermal_conductivity_w_m_k DOUBLE PRECISION DEFAULT 2.1,
    volumetric_heat_capacity_kj_m3_k DOUBLE PRECISION DEFAULT 2350.0,
    oil_viscosity_ref_cp DOUBLE PRECISION DEFAULT 12000.0,
    ref_temperature_c DOUBLE PRECISION DEFAULT 42.0,
    asphaltene_content_pct DOUBLE PRECISION DEFAULT 14.8,
    bubble_point_pressure_bar DOUBLE PRECISION DEFAULT 38.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_res_prop_well ON reservoir_properties(well_id);

-- ── 3. Well Telemetry (Live & Historical Stream) ─────────────────────────────
CREATE TABLE IF NOT EXISTS well_telemetry (
    id SERIAL PRIMARY KEY,
    timestamp DATE NOT NULL,
    well_id VARCHAR(20) NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    css_cycle_id VARCHAR(30),
    phase VARCHAR(30),                                  -- injection / soak / production
    reservoir_temperature_c DOUBLE PRECISION,
    wellhead_temperature_c DOUBLE PRECISION,
    pressure_bar DOUBLE PRECISION,
    flow_rate_bpd DOUBLE PRECISION,
    rpm DOUBLE PRECISION,
    vibration_mm_s DOUBLE PRECISION,
    motor_power_kw DOUBLE PRECISION,
    motor_current_a DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS ix_telemetry_well_ts ON well_telemetry(well_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_tel_well_ts_desc ON well_telemetry(well_id, timestamp DESC);

-- ── 4. Production Records ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS production (
    id SERIAL PRIMARY KEY,
    timestamp DATE NOT NULL,
    well_id VARCHAR(20) NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    css_cycle_id VARCHAR(30),
    oil_rate_bpd DOUBLE PRECISION,
    water_rate_bpd DOUBLE PRECISION,
    gas_rate_mmscfd DOUBLE PRECISION,
    total_fluid_rate_bpd DOUBLE PRECISION,
    water_cut_pct DOUBLE PRECISION,
    bottomhole_pressure_bar DOUBLE PRECISION,
    wellhead_pressure_bar DOUBLE PRECISION,
    cumulative_oil_bbl DOUBLE PRECISION,
    steam_consumption_ton DOUBLE PRECISION,
    sor DOUBLE PRECISION,
    energy_consumption_kwh DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS ix_production_well_ts ON production(well_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_prod_well_ts_desc ON production(well_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_prod_ts_desc ON production(timestamp DESC);

-- ── 5. CSS Stimulation Cycles ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS css_cycles (
    css_cycle_id VARCHAR(30) PRIMARY KEY,               -- e.g. BGW-001-C1
    well_id VARCHAR(20) NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    cycle_number INTEGER NOT NULL,
    steam_volume_ton DOUBLE PRECISION,
    steam_injection_rate_ton_hr DOUBLE PRECISION,
    steam_injection_pressure_bar DOUBLE PRECISION,
    steam_temperature_c DOUBLE PRECISION,
    injection_duration_hr DOUBLE PRECISION,
    soak_time_hr DOUBLE PRECISION,
    production_cutoff VARCHAR(20),
    post_steam_temperature_c DOUBLE PRECISION,
    status VARCHAR(20) NOT NULL DEFAULT 'Completed'
);
CREATE INDEX IF NOT EXISTS idx_css_well_cycle_desc ON css_cycles(well_id, cycle_number DESC);

-- ── 6. SRP Operations ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS srp_operations (
    id SERIAL PRIMARY KEY,
    timestamp DATE NOT NULL,
    well_id VARCHAR(20) NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    css_cycle_id VARCHAR(30),
    spm DOUBLE PRECISION,
    stroke_length_in DOUBLE PRECISION,
    vfd_frequency_hz DOUBLE PRECISION,
    rod_load_min_kn DOUBLE PRECISION,
    rod_load_max_kn DOUBLE PRECISION,
    pump_fillage_pct DOUBLE PRECISION,
    pump_efficiency_pct DOUBLE PRECISION,
    polished_rod_load_kn DOUBLE PRECISION,
    motor_power_kw DOUBLE PRECISION,
    reading_type VARCHAR(30) DEFAULT 'automated_daily'
);
CREATE INDEX IF NOT EXISTS ix_srp_well_ts ON srp_operations(well_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_srp_well_ts_desc ON srp_operations(well_id, timestamp DESC);

-- ── 7. Dynamometer Cards ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dynamometer_cards (
    id SERIAL PRIMARY KEY,
    card_id VARCHAR(50) UNIQUE NOT NULL,
    well_id VARCHAR(20) NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    timestamp DATE NOT NULL,
    css_cycle_id VARCHAR(30),
    stroke_length_in DOUBLE PRECISION NOT NULL,
    spm DOUBLE PRECISION,
    peak_load_kn DOUBLE PRECISION NOT NULL,
    min_load_kn DOUBLE PRECISION NOT NULL,
    card_area_kn_in DOUBLE PRECISION NOT NULL,
    diagnostic_label VARCHAR(50) NOT NULL DEFAULT 'Normal',
    rod_floating_risk DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    fluid_pound_risk DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    surface_points JSONB NOT NULL,
    downhole_points JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_dyno_well_ts ON dynamometer_cards(well_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_dyno_well_ts_desc ON dynamometer_cards(well_id, timestamp DESC);

-- ── 8. Failure Events ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS failure_events (
    event_id VARCHAR(20) PRIMARY KEY,                   -- e.g. EVT-00001
    timestamp DATE NOT NULL,
    well_id VARCHAR(20) NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    css_cycle_id VARCHAR(30),
    rod_floating BOOLEAN NOT NULL DEFAULT FALSE,
    rod_failure BOOLEAN NOT NULL DEFAULT FALSE,
    pump_unsetting BOOLEAN NOT NULL DEFAULT FALSE,
    impact_loading BOOLEAN NOT NULL DEFAULT FALSE,
    gas_interference BOOLEAN NOT NULL DEFAULT FALSE,
    pump_off_condition BOOLEAN NOT NULL DEFAULT FALSE,
    fault_type VARCHAR(50),
    failure_severity VARCHAR(20),
    maintenance_required BOOLEAN NOT NULL DEFAULT FALSE,
    downtime_hours DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS idx_failure_well_ts_desc ON failure_events(well_id, timestamp DESC);

-- ── 9. Digital Twin State (Current Virtual Representation) ──────────────────
CREATE TABLE IF NOT EXISTS digital_twin_state (
    well_id VARCHAR(20) PRIMARY KEY REFERENCES wells(id) ON DELETE CASCADE,
    current_status VARCHAR(50) NOT NULL,
    current_css_cycle VARCHAR(30),
    current_phase VARCHAR(30),
    reservoir_temperature_c DOUBLE PRECISION NOT NULL,
    reservoir_pressure_bar DOUBLE PRECISION NOT NULL,
    crude_viscosity_cp DOUBLE PRECISION NOT NULL,
    fluid_mobility_index DOUBLE PRECISION NOT NULL,
    steam_volume_ton DOUBLE PRECISION,
    steam_pressure_bar DOUBLE PRECISION,
    soak_time_hr DOUBLE PRECISION,
    spm DOUBLE PRECISION NOT NULL,
    stroke_length_in DOUBLE PRECISION NOT NULL,
    vfd_frequency_hz DOUBLE PRECISION NOT NULL,
    rod_load_kn DOUBLE PRECISION NOT NULL,
    pump_efficiency_pct DOUBLE PRECISION NOT NULL,
    pump_fillage_pct DOUBLE PRECISION NOT NULL,
    oil_rate_bpd DOUBLE PRECISION NOT NULL,
    water_rate_bpd DOUBLE PRECISION NOT NULL,
    gas_rate_mmscfd DOUBLE PRECISION,
    bottomhole_pressure_bar DOUBLE PRECISION,
    sor DOUBLE PRECISION NOT NULL,
    energy_kwh_per_bbl DOUBLE PRECISION NOT NULL,
    rod_floating_risk_pct DOUBLE PRECISION NOT NULL,
    impact_loading_risk_pct DOUBLE PRECISION NOT NULL,
    pump_unsetting_risk_pct DOUBLE PRECISION NOT NULL,
    rod_failure_risk_pct DOUBLE PRECISION NOT NULL,
    equipment_health_index DOUBLE PRECISION NOT NULL,
    last_telemetry_timestamp TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_twin_state_updated ON digital_twin_state(updated_at DESC);

-- ── 10. Model Predictions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    well_id VARCHAR(20) NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    model_name VARCHAR(100) NOT NULL,
    prediction_type VARCHAR(50) NOT NULL,               -- production, viscosity, failure, thermal
    horizon_days INTEGER DEFAULT 1,
    predicted_value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(30),
    confidence_interval JSONB,
    feature_drivers JSONB,                              -- SHAP top factors
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pred_well_type ON predictions(well_id, prediction_type);

-- ── 11. Optimization Results ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS optimization_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    well_id VARCHAR(20) NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    optimization_type VARCHAR(50) NOT NULL,             -- css, srp, joint
    baseline_params JSONB NOT NULL,
    recommended_params JSONB NOT NULL,
    expected_outcomes JSONB NOT NULL,
    pareto_frontier JSONB,
    convergence_iterations INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_opt_well_type ON optimization_results(well_id, optimization_type);

-- ── 12. Simulation Runs (What-If Scenarios) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS simulation_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    well_id VARCHAR(20) NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    scenario_name VARCHAR(100) NOT NULL,
    css_inputs JSONB NOT NULL,
    srp_inputs JSONB NOT NULL,
    baseline_kpis JSONB NOT NULL,
    simulated_kpis JSONB NOT NULL,
    kpi_deltas JSONB NOT NULL,
    run_by VARCHAR(100) DEFAULT 'Operations Engineer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sim_runs_well ON simulation_runs(well_id, created_at DESC);

-- ── 13. System Alerts ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    well_id VARCHAR(20) NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL,                      -- INFO, WARNING, HIGH, CRITICAL
    alert_type VARCHAR(50),
    category VARCHAR(50),
    root_cause TEXT,
    recommended_action TEXT,
    metric VARCHAR(100),
    threshold VARCHAR(50),
    actual_value VARCHAR(50),
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_by UUID,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_well ON alerts(well_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);

-- ── 14. Engineer Recommendations & Approvals ─────────────────────────────────
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    well_id VARCHAR(20) NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    issue TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    expected_benefit TEXT,
    confidence DOUBLE PRECISION DEFAULT 0.92,
    reason TEXT,
    safety_status VARCHAR(100) DEFAULT 'Within safe operating envelope',
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',     -- Pending, Approved, Rejected
    submitted_by VARCHAR(100) NOT NULL DEFAULT 'AI Optimizer',
    reviewed_by VARCHAR(100),
    comment TEXT,
    setpoints JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_recs_well ON recommendations(well_id, status);
CREATE INDEX IF NOT EXISTS idx_recs_created ON recommendations(created_at DESC);
