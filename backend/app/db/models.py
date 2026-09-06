"""
Polaris Backend — SQLAlchemy ORM Models
Tables: users, sessions, audit_logs, wells, well_telemetry,
        css_cycles, srp_operations, alerts, failure_events
"""
import enum
import uuid
from datetime import datetime, date

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# ── Enums ─────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"


class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    DISABLED = "DISABLED"
    LOCKED = "LOCKED"


class AuditAction(str, enum.Enum):
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    LOGOUT_ALL = "LOGOUT_ALL"
    PASSWORD_CHANGED = "PASSWORD_CHANGED"
    PASSWORD_RESET = "PASSWORD_RESET"
    USER_CREATED = "USER_CREATED"
    USER_DISABLED = "USER_DISABLED"
    USER_ENABLED = "USER_ENABLED"
    USER_LOCKED = "USER_LOCKED"
    USER_UNLOCKED = "USER_UNLOCKED"
    USER_DELETED = "USER_DELETED"
    ROLE_CHANGED = "ROLE_CHANGED"
    SESSION_REVOKED = "SESSION_REVOKED"
    ALL_SESSIONS_REVOKED = "ALL_SESSIONS_REVOKED"
    ACCESS_CHANGED = "ACCESS_CHANGED"
    TOKEN_REFRESH = "TOKEN_REFRESH"
    REFRESH_TOKEN_REUSE = "REFRESH_TOKEN_REUSE"


# ── User ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    employee_id: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True, index=True
    )
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole, name="userrole"), nullable=False)
    status: Mapped[UserStatus] = mapped_column(
        SAEnum(UserStatus, name="userstatus"),
        nullable=False,
        default=UserStatus.ACTIVE,
    )
    failed_login_attempts: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    password_changed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    sessions: Mapped[list["Session"]] = relationship(
        "Session",
        back_populates="user",
        foreign_keys="Session.user_id",
        cascade="all, delete-orphan",
    )

    @property
    def is_active(self) -> bool:
        return self.status == UserStatus.ACTIVE and self.deleted_at is None

    def __repr__(self) -> str:
        return f"<User {self.employee_id} [{self.role}]>"


# ── Session ───────────────────────────────────────────────────────────────────

class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    refresh_token_hash: Mapped[str] = mapped_column(
        Text, nullable=False, unique=True
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(
        "User", back_populates="sessions", foreign_keys=[user_id]
    )

    @property
    def is_valid(self) -> bool:
        from datetime import timezone
        return (
            self.revoked_at is None
            and self.expires_at > datetime.now(tz=timezone.utc)
        )

    def __repr__(self) -> str:
        return f"<Session {self.id} user={self.user_id}>"


# ── Audit Log ─────────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    target_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    resource_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    resource_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    # Stored as 'metadata' column but mapped as metadata_ to avoid Python builtin clash
    metadata_: Mapped[dict | None] = mapped_column(
        "metadata", JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    __table_args__ = (
        Index("ix_audit_logs_actor_timestamp", "actor_user_id", "timestamp"),
        Index("ix_audit_logs_target_timestamp", "target_user_id", "timestamp"),
    )

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} by={self.actor_user_id}>"


# ═══════════════════════════════════════════════════════════════════════════════
# Field Operations Models (Baghewala Dataset)
# ═══════════════════════════════════════════════════════════════════════════════

# Well status / Alert severity are plain strings in DB (no PG enum type)
# kept as Python constants for reference
WELL_STATUS_PRODUCING = "Producing"
WELL_STATUS_ATTENTION = "Attention"
WELL_STATUS_CRITICAL  = "Critical"
WELL_STATUS_SHUT_IN   = "Shut-in"


# ── Well Master ───────────────────────────────────────────────────────────────

class Well(Base):
    __tablename__ = "wells"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)   # e.g. BGW-001
    field: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    well_depth_m: Mapped[float] = mapped_column(Float, nullable=False)
    pump_depth_m: Mapped[float] = mapped_column(Float, nullable=False)
    reservoir: Mapped[str] = mapped_column(String(200), nullable=True)
    formation: Mapped[str] = mapped_column(String(200), nullable=True)
    oil_api: Mapped[float | None] = mapped_column(Float, nullable=True)
    initial_reservoir_pressure_bar: Mapped[float | None] = mapped_column(Float, nullable=True)
    initial_reservoir_temperature_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    automation_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Derived / computed status (plain string — Producing/Attention/Critical/Shut-in)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Producing")
    well_type: Mapped[str] = mapped_column(String(50), nullable=False, default="CSS + SRP")
    spud_date: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    telemetry: Mapped[list["WellTelemetry"]] = relationship(
        "WellTelemetry", back_populates="well", cascade="all, delete-orphan"
    )
    css_cycles: Mapped[list["CSSCycle"]] = relationship(
        "CSSCycle", back_populates="well", cascade="all, delete-orphan"
    )
    srp_operations: Mapped[list["SRPOperation"]] = relationship(
        "SRPOperation", back_populates="well", cascade="all, delete-orphan"
    )
    alerts: Mapped[list["Alert"]] = relationship(
        "Alert", back_populates="well"
    )
    failure_events: Mapped[list["FailureEvent"]] = relationship(
        "FailureEvent", back_populates="well", cascade="all, delete-orphan"
    )
    production: Mapped[list["Production"]] = relationship(
        "Production", back_populates="well", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Well {self.id} [{self.status}]>"


# ── Well Telemetry ─────────────────────────────────────────────────────────────

class WellTelemetry(Base):
    __tablename__ = "well_telemetry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    well_id: Mapped[str] = mapped_column(
        String(20), ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    css_cycle_id: Mapped[str | None] = mapped_column(String(30), nullable=True)
    phase: Mapped[str | None] = mapped_column(String(30), nullable=True)   # injection / soak / production
    reservoir_temperature_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    wellhead_temperature_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    pressure_bar: Mapped[float | None] = mapped_column(Float, nullable=True)
    flow_rate_bpd: Mapped[float | None] = mapped_column(Float, nullable=True)
    rpm: Mapped[float | None] = mapped_column(Float, nullable=True)
    vibration_mm_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    motor_power_kw: Mapped[float | None] = mapped_column(Float, nullable=True)
    motor_current_a: Mapped[float | None] = mapped_column(Float, nullable=True)

    well: Mapped["Well"] = relationship("Well", back_populates="telemetry")

    __table_args__ = (
        Index("ix_telemetry_well_ts", "well_id", "timestamp"),
        Index("idx_tel_well_ts_desc", "well_id", timestamp.desc()),
    )


# ── Production ────────────────────────────────────────────────────────────────

class Production(Base):
    __tablename__ = "production"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    well_id: Mapped[str] = mapped_column(
        String(20), ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    css_cycle_id: Mapped[str | None] = mapped_column(String(30), nullable=True)
    oil_rate_bpd: Mapped[float | None] = mapped_column(Float, nullable=True)
    water_rate_bpd: Mapped[float | None] = mapped_column(Float, nullable=True)
    gas_rate_mmscfd: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_fluid_rate_bpd: Mapped[float | None] = mapped_column(Float, nullable=True)
    water_cut_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    bottomhole_pressure_bar: Mapped[float | None] = mapped_column(Float, nullable=True)
    wellhead_pressure_bar: Mapped[float | None] = mapped_column(Float, nullable=True)
    cumulative_oil_bbl: Mapped[float | None] = mapped_column(Float, nullable=True)
    steam_consumption_ton: Mapped[float | None] = mapped_column(Float, nullable=True)
    sor: Mapped[float | None] = mapped_column(Float, nullable=True)
    energy_consumption_kwh: Mapped[float | None] = mapped_column(Float, nullable=True)

    well: Mapped["Well"] = relationship("Well", back_populates="production")

    __table_args__ = (
        Index("ix_production_well_ts", "well_id", "timestamp"),
        Index("idx_prod_well_ts_desc", "well_id", timestamp.desc()),
        Index("idx_prod_ts_desc", timestamp.desc()),
    )


# ── CSS Cycle ─────────────────────────────────────────────────────────────────

class CSSCycle(Base):
    __tablename__ = "css_cycles"

    css_cycle_id: Mapped[str] = mapped_column(String(30), primary_key=True)  # BGW-001-C1
    well_id: Mapped[str] = mapped_column(
        String(20), ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cycle_number: Mapped[int] = mapped_column(Integer, nullable=False)
    steam_volume_ton: Mapped[float | None] = mapped_column(Float, nullable=True)
    steam_injection_rate_ton_hr: Mapped[float | None] = mapped_column(Float, nullable=True)
    steam_injection_pressure_bar: Mapped[float | None] = mapped_column(Float, nullable=True)
    steam_temperature_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    injection_duration_hr: Mapped[float | None] = mapped_column(Float, nullable=True)
    soak_time_hr: Mapped[float | None] = mapped_column(Float, nullable=True)
    production_cutoff: Mapped[str | None] = mapped_column(String(20), nullable=True)
    post_steam_temperature_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Completed")

    well: Mapped["Well"] = relationship("Well", back_populates="css_cycles")

    __table_args__ = (
        Index("idx_css_well_cycle_desc", "well_id", cycle_number.desc()),
    )

    def __repr__(self) -> str:
        return f"<CSSCycle {self.css_cycle_id}>"


# ── SRP Operation ─────────────────────────────────────────────────────────────

class SRPOperation(Base):
    __tablename__ = "srp_operations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    well_id: Mapped[str] = mapped_column(
        String(20), ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    css_cycle_id: Mapped[str | None] = mapped_column(String(30), nullable=True)
    spm: Mapped[float | None] = mapped_column(Float, nullable=True)
    stroke_length_in: Mapped[float | None] = mapped_column(Float, nullable=True)
    vfd_frequency_hz: Mapped[float | None] = mapped_column(Float, nullable=True)
    rod_load_min_kn: Mapped[float | None] = mapped_column(Float, nullable=True)
    rod_load_max_kn: Mapped[float | None] = mapped_column(Float, nullable=True)
    pump_fillage_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    pump_efficiency_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    polished_rod_load_kn: Mapped[float | None] = mapped_column(Float, nullable=True)
    motor_power_kw: Mapped[float | None] = mapped_column(Float, nullable=True)
    reading_type: Mapped[str | None] = mapped_column(String(30), nullable=True)

    well: Mapped["Well"] = relationship("Well", back_populates="srp_operations")

    __table_args__ = (
        Index("ix_srp_well_ts", "well_id", "timestamp"),
        Index("idx_srp_well_ts_desc", "well_id", timestamp.desc()),
    )


# ── Alert ─────────────────────────────────────────────────────────────────────

class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    well_id: Mapped[str] = mapped_column(
        String(20), ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    alert_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    root_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommended_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    metric: Mapped[str | None] = mapped_column(String(100), nullable=True)
    threshold: Mapped[str | None] = mapped_column(String(50), nullable=True)
    actual_value: Mapped[str | None] = mapped_column(String(50), nullable=True)
    acknowledged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    acknowledged_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    well: Mapped["Well"] = relationship("Well", back_populates="alerts")

    def __repr__(self) -> str:
        return f"<Alert {self.severity} well={self.well_id}>"


# ── Failure Event ─────────────────────────────────────────────────────────────

class FailureEvent(Base):
    __tablename__ = "failure_events"

    event_id: Mapped[str] = mapped_column(String(20), primary_key=True)  # EVT-00001
    timestamp: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    well_id: Mapped[str] = mapped_column(
        String(20), ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    css_cycle_id: Mapped[str | None] = mapped_column(String(30), nullable=True)
    rod_floating: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    rod_failure: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    pump_unsetting: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    impact_loading: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    gas_interference: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    pump_off_condition: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    fault_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    failure_severity: Mapped[str | None] = mapped_column(String(20), nullable=True)
    maintenance_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    downtime_hours: Mapped[float | None] = mapped_column(Float, nullable=True)

    well: Mapped["Well"] = relationship("Well", back_populates="failure_events")

    __table_args__ = (
        Index("idx_failure_well_ts_desc", "well_id", timestamp.desc()),
    )

    def __repr__(self) -> str:
        return f"<FailureEvent {self.event_id} well={self.well_id}>"


# ── Optimization Approval ────────────────────────────────────────────────────

class OptimizationApproval(Base):
    __tablename__ = "optimization_approvals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    well_id: Mapped[str] = mapped_column(
        String(20), ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    impact: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Pending")
    submitted_by: Mapped[str] = mapped_column(String(100), nullable=False, default="AI Optimizer")
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    setpoints: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )
    reviewed_by: Mapped[str | None] = mapped_column(String(100), nullable=True)

    well: Mapped["Well"] = relationship("Well")

    def __repr__(self) -> str:
        return f"<OptimizationApproval {self.well_id} [{self.status}]>"

