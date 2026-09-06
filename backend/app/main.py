"""
Polaris Backend — FastAPI Application Factory
"""
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config.settings import settings
from app.errors.handlers import register_handlers
from app.middleware.rate_limit import limiter
from app.routes import auth, admin, wells, alerts, simulation, approvals, ai, ml, canonical_api
from app.utils.logging import setup_logging

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("polaris_api_starting", env=settings.NODE_ENV, port=settings.PORT)

    # ── Warm-up ML models in a thread (non-blocking) ──────────────────────────
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    from app.services.ml_engine import ml_engine
    from app.services.piml_twin import piml_twin
    from app.ml.pipelines.inference_engine import ml_inference

    loop = asyncio.get_event_loop()
    executor = ThreadPoolExecutor(max_workers=3)
    loop.run_in_executor(executor, ml_engine.ensure_ready)
    loop.run_in_executor(executor, piml_twin.ensure_ready)
    loop.run_in_executor(executor, ml_inference.ensure_artifacts)
    logger.info("polaris_api_ml_warmup_started")

    yield
    logger.info("polaris_api_shutdown")


def create_app() -> FastAPI:
    setup_logging()

    app = FastAPI(
        title="Polaris API",
        description="Heavy Oil Wellbore Digital Twin & Joint Optimization Platform — Backend API",
        version="1.0.0",
        docs_url="/api/docs" if not settings.is_production else None,
        redoc_url="/api/redoc" if not settings.is_production else None,
        openapi_url="/api/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── Rate limiter ──────────────────────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # ── CORS ──────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,       # Required for cookies
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )

    # ── Security headers (Helmet equivalent) ─────────────────────────────────
    @app.middleware("http")
    async def set_security_headers(request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    # ── Global error handlers ─────────────────────────────────────────────────
    register_handlers(app)

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(auth.router, prefix="/api")
    app.include_router(admin.router, prefix="/api")
    app.include_router(wells.router, prefix="/api")
    app.include_router(alerts.router, prefix="/api")
    app.include_router(simulation.router, prefix="/api")
    app.include_router(approvals.router, prefix="/api")
    app.include_router(ai.router, prefix="/api")
    app.include_router(ml.router, prefix="/api")
    app.include_router(canonical_api.router, prefix="/api")

    # ── Health check ──────────────────────────────────────────────────────────
    @app.get("/api/health", tags=["Health"], include_in_schema=False)
    async def health():
        return {"status": "operational", "service": "polaris-api"}

    return app
