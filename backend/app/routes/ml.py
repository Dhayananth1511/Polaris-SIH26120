"""
Polaris Backend — Heavy Oil AI/ML Engine API Routes
===================================================
Endpoints:
  GET  /api/ml/models/status            Model health, R², RMSE, ROC-AUC, sample counts
  POST /api/ml/train                    Trigger background training pipeline
  POST /api/ml/css/optimize             Multi-objective CSS cycle optimizer (Pareto front)
  POST /api/ml/reservoir/predict        60-day physics-informed thermal trajectory
  POST /api/ml/srp/optimize             Viscosity-adaptive SRP kinematics, SPM_crit, 4 stages
  POST /api/ml/diagnostics/detect-faults Multi-label failure classification & MTBF
  GET  /api/ml/well/{well_id}/insights  Comprehensive wellbore AI audit & unified setpoints
"""
import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.ml.pipelines.inference_engine import ml_inference
from app.ml.pipelines.training_pipeline import training_pipeline
from app.ml.schemas import (
    CSSOptimizeRequest,
    CSSOptimizeResponse,
    FaultDetectRequest,
    FaultDetectResponse,
    ModelStatusResponse,
    ProductionForecastRequest,
    ProductionForecastResponse,
    ReservoirPredictRequest,
    ReservoirPredictResponse,
    SRPOptimizeRequest,
    SRPOptimizeResponse,
    WellInsightsResponse,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/ml", tags=["Heavy Oil AI/ML Engine"])


@router.get("/models/status", response_model=ModelStatusResponse, summary="Get Model Status & Metrics")
async def get_models_status():
    """Returns training state, metrics (R², RMSE, ROC-AUC), sample counts, and artifact paths."""
    try:
        return ml_inference.get_status()
    except Exception as err:
        logger.error("ml_status_failed", error=str(err))
        raise HTTPException(status_code=500, detail=f"Failed retrieving ML status: {err}")


@router.post("/train", summary="Trigger Model Training Pipeline")
async def trigger_training(background_tasks: BackgroundTasks):
    """Triggers end-to-end retraining across all models in a non-blocking background worker."""
    if training_pipeline.is_training:
        return {"status": "in_progress", "message": "Training pipeline is already executing"}

    def _train_and_reload():
        try:
            training_pipeline.train_all_models()
            ml_inference.reload_models()
            logger.info("ml_background_training_complete")
        except Exception as exc:
            logger.error("ml_background_training_failed", error=str(exc))

    background_tasks.add_task(_train_and_reload)
    return {
        "status": "initiated",
        "message": "Model retraining pipeline dispatched in background thread",
        "models": ["reservoir_thermal", "production_forecaster", "fault_classifier"]
    }


@router.post("/css/optimize", response_model=CSSOptimizeResponse, summary="Optimize Cyclic Steam Stimulation")
async def optimize_css(req: CSSOptimizeRequest):
    """Computes Pareto-optimal steam volume, injection pressure, and soak time to maximize net cash flow."""
    try:
        return ml_inference.optimize_css(req)
    except Exception as err:
        logger.error("css_optimization_failed", error=str(err))
        raise HTTPException(status_code=500, detail=f"CSS optimization failed: {err}")


@router.post("/reservoir/predict", response_model=ReservoirPredictResponse, summary="Forecast Reservoir Thermal State")
async def predict_reservoir(req: ReservoirPredictRequest):
    """Generates 60-day physics-informed Boberg-Lantz cooling curve and Walther viscosity forecast."""
    try:
        return ml_inference.predict_reservoir_thermal(req)
    except Exception as err:
        logger.error("reservoir_prediction_failed", error=str(err))
        raise HTTPException(status_code=500, detail=f"Reservoir thermal prediction failed: {err}")


@router.post("/production/forecast", response_model=ProductionForecastResponse, summary="Forecast Multi-Target Production")
async def forecast_production(req: ProductionForecastRequest):
    """Forecasts daily oil rate, water cut, cumulative oil, and daily SOR with a 90% confidence interval."""
    try:
        return ml_inference.forecast_production(req)
    except Exception as err:
        logger.error("production_forecast_failed", error=str(err))
        raise HTTPException(status_code=500, detail=f"Production forecast failed: {err}")


@router.post("/srp/optimize", response_model=SRPOptimizeResponse, summary="Optimize SRP Kinematics & Rod Float")
async def optimize_srp(req: SRPOptimizeRequest):
    """Calculates critical SPM to prevent rod floating and derives a 4-stage post-CSS VFD pumping schedule."""
    try:
        return ml_inference.optimize_srp(req)
    except Exception as err:
        logger.error("srp_optimization_failed", error=str(err))
        raise HTTPException(status_code=500, detail=f"SRP optimization failed: {err}")


@router.post("/diagnostics/detect-faults", response_model=FaultDetectResponse, summary="Detect Pumping Faults & MTBF")
async def detect_faults(req: FaultDetectRequest):
    """Multi-label classification of rod float, impact loading, pump unsetting, and gas interference."""
    try:
        return ml_inference.detect_faults(req)
    except Exception as err:
        logger.error("fault_detection_failed", error=str(err))
        raise HTTPException(status_code=500, detail=f"Fault detection failed: {err}")


@router.get("/well/{well_id}/insights", response_model=WellInsightsResponse, summary="Comprehensive Well AI Audit")
async def get_well_insights(
    well_id: str = Path(..., description="Well identifier (e.g. BGW-001)"),
    db: AsyncSession = Depends(get_db)
):
    """Synthesizes all 5 ML models into a unified health, kinematics, and recovery optimization audit."""
    try:
        return ml_inference.get_well_insights(well_id)
    except Exception as err:
        logger.error("well_insights_failed", well_id=well_id, error=str(err))
        raise HTTPException(status_code=500, detail=f"Well insights failed: {err}")
