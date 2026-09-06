"""
Polaris Backend — SQLAlchemy ORM Models
Tables: users, sessions, audit_logs
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
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
