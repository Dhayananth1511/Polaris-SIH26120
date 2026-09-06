"""
Polaris Backend — Audit Logger
Writes security-relevant events to the audit_logs table.
This is append-only — normal code must never DELETE from this table.
"""
import uuid
from typing import Optional

import structlog

from app.db.models import AuditAction, AuditLog

logger = structlog.get_logger(__name__)


async def write_audit(
    *,
    session,               # AsyncSession — passed in, not fetched here
    action: AuditAction | str,
    actor_user_id: Optional[uuid.UUID] = None,
    target_user_id: Optional[uuid.UUID] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[uuid.UUID] = None,
    metadata: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """
    Append an audit event to the database.
    Called from services — never from route handlers directly.
    """
    action_str = action.value if isinstance(action, AuditAction) else action

    entry = AuditLog(
        actor_user_id=actor_user_id,
        action=action_str,
        target_user_id=target_user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata_=metadata,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    session.add(entry)

    # Structured log for real-time observability
    logger.info(
        "audit_event",
        action=action_str,
        actor=str(actor_user_id) if actor_user_id else None,
        target=str(target_user_id) if target_user_id else None,
        ip=ip_address,
    )
