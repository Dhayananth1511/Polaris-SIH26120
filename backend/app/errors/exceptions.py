"""
Polaris Backend — Custom HTTP Exceptions
Clean, structured error hierarchy that maps to safe API responses.
"""
from fastapi import HTTPException, status


class PolarisError(HTTPException):
    """Base for all Polaris domain errors."""
    code: str = "INTERNAL_ERROR"

    def __init__(self, message: str, status_code: int = 500, code: str | None = None):
        self.code = code or self.__class__.code
        super().__init__(status_code=status_code, detail={"code": self.code, "message": message})


class InvalidCredentialsError(PolarisError):
    code = "INVALID_CREDENTIALS"
    def __init__(self):
        super().__init__("Invalid credentials", status_code=status.HTTP_401_UNAUTHORIZED)


class AccountLockedError(PolarisError):
    code = "ACCOUNT_LOCKED"
    def __init__(self, minutes: int = 15):
        super().__init__(
            f"Account temporarily locked due to repeated failures. Try again in {minutes} minutes.",
            status_code=status.HTTP_423_LOCKED,
        )


class AccountDisabledError(PolarisError):
    code = "ACCOUNT_DISABLED"
    def __init__(self):
        super().__init__("Account has been disabled. Contact your administrator.", status_code=status.HTTP_403_FORBIDDEN)


class UnauthenticatedError(PolarisError):
    code = "UNAUTHENTICATED"
    def __init__(self):
        super().__init__("Authentication required", status_code=status.HTTP_401_UNAUTHORIZED)


class ForbiddenError(PolarisError):
    code = "FORBIDDEN"
    def __init__(self, message: str = "You do not have permission to perform this action"):
        super().__init__(message, status_code=status.HTTP_403_FORBIDDEN)


class NotFoundError(PolarisError):
    code = "NOT_FOUND"
    def __init__(self, resource: str = "Resource"):
        super().__init__(f"{resource} not found", status_code=status.HTTP_404_NOT_FOUND)


class ConflictError(PolarisError):
    code = "CONFLICT"
    def __init__(self, message: str = "Resource already exists"):
        super().__init__(message, status_code=status.HTTP_409_CONFLICT)


class ValidationError(PolarisError):
    code = "VALIDATION_ERROR"
    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


class SessionExpiredError(PolarisError):
    code = "SESSION_EXPIRED"
    def __init__(self):
        super().__init__("Session expired — please log in again", status_code=status.HTTP_401_UNAUTHORIZED)


class RateLimitError(PolarisError):
    code = "RATE_LIMITED"
    def __init__(self):
        super().__init__("Too many requests — please slow down", status_code=status.HTTP_429_TOO_MANY_REQUESTS)
