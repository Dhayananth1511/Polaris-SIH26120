"""
Polaris Backend — RBAC Authorization Middleware
Answers: "Are you allowed to perform this operation?"
Authentication and authorization are kept as separate concerns.
"""
from typing import Callable

from fastapi import Depends

from app.db.models import User, UserRole
from app.errors.exceptions import ForbiddenError
from app.middleware.authenticate import get_current_user


def require_role(*roles: UserRole) -> Callable:
    """
    Factory that returns a FastAPI dependency enforcing role membership.

    Usage:
        @router.post("/admin/operators", dependencies=[Depends(require_role(UserRole.ADMIN))])

    or inline:
        user: User = Depends(require_role(UserRole.ADMIN))
    """
    async def check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise ForbiddenError(
                f"Role '{current_user.role}' is not permitted to perform this action."
            )
        return current_user

    # Give the dependency a unique __name__ so FastAPI doesn't deduplicate it
    check.__name__ = f"require_role_{'_'.join(r.value for r in roles)}"
    return check


# ── Pre-built role dependencies (for readability in route definitions) ────────
AdminRequired = Depends(require_role(UserRole.ADMIN))
OperatorRequired = Depends(require_role(UserRole.OPERATOR))
AnyRoleRequired = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR))
