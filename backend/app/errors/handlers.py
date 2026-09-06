"""
Polaris Backend — Global Error Handlers
Ensures NO stack traces, SQL errors, or internal details ever reach the client.
"""
import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from jose import JWTError

from app.errors.exceptions import PolarisError

logger = structlog.get_logger(__name__)


def register_handlers(app: FastAPI) -> None:
    """Attach all global exception handlers to the FastAPI app."""

    @app.exception_handler(PolarisError)
    async def polaris_error_handler(request: Request, exc: PolarisError) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, dict) else {"code": "ERROR", "message": str(exc.detail)}
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "error": detail},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        # Return first validation error message — don't dump full Pydantic trace
        errors = exc.errors()
        first = errors[0] if errors else {}
        msg = first.get("msg", "Invalid request data")
        field = " → ".join(str(x) for x in first.get("loc", []) if x != "body")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": f"{field}: {msg}" if field else msg,
                },
            },
        )

    @app.exception_handler(JWTError)
    async def jwt_error_handler(request: Request, exc: JWTError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"success": False, "error": {"code": "INVALID_TOKEN", "message": "Invalid or expired token"}},
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
        # Log full details server-side; return nothing useful to client
        logger.error(
            "unhandled_exception",
            path=request.url.path,
            method=request.method,
            exc_type=type(exc).__name__,
            exc=str(exc),
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"},
            },
        )
