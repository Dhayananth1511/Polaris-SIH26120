"""Add field operations tables

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-06
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── wells ──────────────────────────────────────────────────────────────────
    op.create_table(
        "wells",
        sa.Column("id", sa.String(20), primary_key=True),
        sa.Column("field", sa.String(100), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("well_depth_m", sa.Float(), nullable=False),
        sa.Column("pump_depth_m", sa.Float(), nullable=False),
        sa.Column("reservoir", sa.String(200), nullable=True),
        sa.Column("formation", sa.String(200), nullable=True),
        sa.Column("oil_api", sa.Float(), nullable=True),
        sa.Column("initial_reservoir_pressure_bar", sa.Float(), nullable=True),
        sa.Column("initial_reservoir_temperature_c", sa.Float(), nullable=True),
        sa.Column("automation_type", sa.String(50), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="Producing"),
        sa.Column("well_type", sa.String(50), nullable=False, server_default="CSS + SRP"),
        sa.Column("spud_date", sa.String(30), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_wells_field", "wells", ["field"])

    # ── well_telemetry ─────────────────────────────────────────────────────────
    op.create_table(
        "well_telemetry",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("timestamp", sa.Date(), nullable=False),
        sa.Column("well_id", sa.String(20), sa.ForeignKey("wells.id", ondelete="CASCADE"), nullable=False),
        sa.Column("css_cycle_id", sa.String(30), nullable=True),
        sa.Column("phase", sa.String(30), nullable=True),
        sa.Column("reservoir_temperature_c", sa.Float(), nullable=True),
        sa.Column("wellhead_temperature_c", sa.Float(), nullable=True),
        sa.Column("pressure_bar", sa.Float(), nullable=True),
        sa.Column("flow_rate_bpd", sa.Float(), nullable=True),
        sa.Column("rpm", sa.Float(), nullable=True),
        sa.Column("vibration_mm_s", sa.Float(), nullable=True),
        sa.Column("motor_power_kw", sa.Float(), nullable=True),
        sa.Column("motor_current_a", sa.Float(), nullable=True),
    )
    op.create_index("ix_telemetry_well_ts", "well_telemetry", ["well_id", "timestamp"])

    # ── production ─────────────────────────────────────────────────────────────
    op.create_table(
        "production",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("timestamp", sa.Date(), nullable=False),
        sa.Column("well_id", sa.String(20), sa.ForeignKey("wells.id", ondelete="CASCADE"), nullable=False),
        sa.Column("css_cycle_id", sa.String(30), nullable=True),
        sa.Column("oil_rate_bpd", sa.Float(), nullable=True),
        sa.Column("water_rate_bpd", sa.Float(), nullable=True),
        sa.Column("gas_rate_mmscfd", sa.Float(), nullable=True),
        sa.Column("total_fluid_rate_bpd", sa.Float(), nullable=True),
        sa.Column("water_cut_pct", sa.Float(), nullable=True),
        sa.Column("bottomhole_pressure_bar", sa.Float(), nullable=True),
        sa.Column("wellhead_pressure_bar", sa.Float(), nullable=True),
        sa.Column("cumulative_oil_bbl", sa.Float(), nullable=True),
        sa.Column("steam_consumption_ton", sa.Float(), nullable=True),
        sa.Column("sor", sa.Float(), nullable=True),
        sa.Column("energy_consumption_kwh", sa.Float(), nullable=True),
    )
    op.create_index("ix_production_well_ts", "production", ["well_id", "timestamp"])

    # ── css_cycles ─────────────────────────────────────────────────────────────
    op.create_table(
        "css_cycles",
        sa.Column("css_cycle_id", sa.String(30), primary_key=True),
        sa.Column("well_id", sa.String(20), sa.ForeignKey("wells.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cycle_number", sa.Integer(), nullable=False),
        sa.Column("steam_volume_ton", sa.Float(), nullable=True),
        sa.Column("steam_injection_rate_ton_hr", sa.Float(), nullable=True),
        sa.Column("steam_injection_pressure_bar", sa.Float(), nullable=True),
        sa.Column("steam_temperature_c", sa.Float(), nullable=True),
        sa.Column("injection_duration_hr", sa.Float(), nullable=True),
        sa.Column("soak_time_hr", sa.Float(), nullable=True),
        sa.Column("production_cutoff", sa.String(20), nullable=True),
        sa.Column("post_steam_temperature_c", sa.Float(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="Completed"),
    )
    op.create_index("ix_css_cycles_well_id", "css_cycles", ["well_id"])

    # ── srp_operations ─────────────────────────────────────────────────────────
    op.create_table(
        "srp_operations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("timestamp", sa.Date(), nullable=False),
        sa.Column("well_id", sa.String(20), sa.ForeignKey("wells.id", ondelete="CASCADE"), nullable=False),
        sa.Column("css_cycle_id", sa.String(30), nullable=True),
        sa.Column("spm", sa.Float(), nullable=True),
        sa.Column("stroke_length_in", sa.Float(), nullable=True),
        sa.Column("vfd_frequency_hz", sa.Float(), nullable=True),
        sa.Column("rod_load_min_kn", sa.Float(), nullable=True),
        sa.Column("rod_load_max_kn", sa.Float(), nullable=True),
        sa.Column("pump_fillage_pct", sa.Float(), nullable=True),
        sa.Column("pump_efficiency_pct", sa.Float(), nullable=True),
        sa.Column("polished_rod_load_kn", sa.Float(), nullable=True),
        sa.Column("motor_power_kw", sa.Float(), nullable=True),
        sa.Column("reading_type", sa.String(30), nullable=True),
    )
    op.create_index("ix_srp_well_ts", "srp_operations", ["well_id", "timestamp"])

    # ── alerts ─────────────────────────────────────────────────────────────────
    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("well_id", sa.String(20), sa.ForeignKey("wells.id", ondelete="CASCADE"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("alert_type", sa.String(50), nullable=True),
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("root_cause", sa.Text(), nullable=True),
        sa.Column("recommended_action", sa.Text(), nullable=True),
        sa.Column("metric", sa.String(100), nullable=True),
        sa.Column("threshold", sa.String(50), nullable=True),
        sa.Column("actual_value", sa.String(50), nullable=True),
        sa.Column("acknowledged", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("acknowledged_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_alerts_well_id", "alerts", ["well_id"])
    op.create_index("ix_alerts_created_at", "alerts", ["created_at"])

    # ── failure_events ─────────────────────────────────────────────────────────
    op.create_table(
        "failure_events",
        sa.Column("event_id", sa.String(20), primary_key=True),
        sa.Column("timestamp", sa.Date(), nullable=False),
        sa.Column("well_id", sa.String(20), sa.ForeignKey("wells.id", ondelete="CASCADE"), nullable=False),
        sa.Column("css_cycle_id", sa.String(30), nullable=True),
        sa.Column("rod_floating", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("rod_failure", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("pump_unsetting", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("impact_loading", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("gas_interference", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("pump_off_condition", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("fault_type", sa.String(50), nullable=True),
        sa.Column("failure_severity", sa.String(20), nullable=True),
        sa.Column("maintenance_required", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("downtime_hours", sa.Float(), nullable=True),
    )
    op.create_index("ix_failure_events_well_id", "failure_events", ["well_id"])


def downgrade() -> None:
    for tbl in ["failure_events", "alerts", "srp_operations",
                "css_cycles", "production", "well_telemetry", "wells"]:
        op.drop_table(tbl)