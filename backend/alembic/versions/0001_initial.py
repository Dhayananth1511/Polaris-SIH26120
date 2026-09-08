"""Initial schema — users, sessions, audit_logs

Revision ID: 0001
Revises:
Create Date: 2026-09-06
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Enums ─────────────────────────────────────────────────────────────────
    op.execute("DO $$ BEGIN CREATE TYPE userrole AS ENUM ('ADMIN', 'OPERATOR'); EXCEPTION WHEN duplicate_object THEN null; END $$;")
    op.execute("DO $$ BEGIN CREATE TYPE userstatus AS ENUM ('ACTIVE', 'DISABLED', 'LOCKED'); EXCEPTION WHEN duplicate_object THEN null; END $$;")

    userrole = postgresql.ENUM("ADMIN", "OPERATOR", name="userrole", create_type=False)
    userstatus = postgresql.ENUM("ACTIVE", "DISABLED", "LOCKED", name="userstatus", create_type=False)

    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("employee_id", sa.String(50), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("password_hash", sa.Text, nullable=False),
        sa.Column("role", userrole, nullable=False),
        sa.Column("status", userstatus, nullable=False, server_default="ACTIVE"),
        sa.Column("failed_login_attempts", sa.Integer, nullable=False, server_default="0"),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_unique_constraint("uq_users_employee_id", "users", ["employee_id"])
    op.create_unique_constraint("uq_users_email", "users", ["email"])
    op.create_index("ix_users_employee_id", "users", ["employee_id"])
    op.create_index("ix_users_email", "users", ["email"])

    # ── sessions ──────────────────────────────────────────────────────────────
    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("refresh_token_hash", sa.Text, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text, nullable=True),
    )
    op.create_unique_constraint("uq_sessions_refresh_token_hash", "sessions", ["refresh_token_hash"])
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])

    # ── audit_logs ────────────────────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("target_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("resource_type", sa.String(100), nullable=True),
        sa.Column("resource_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text, nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])
    op.create_index("ix_audit_logs_actor_timestamp", "audit_logs", ["actor_user_id", "timestamp"])
    op.create_index("ix_audit_logs_target_timestamp", "audit_logs", ["target_user_id", "timestamp"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("sessions")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS userstatus")
