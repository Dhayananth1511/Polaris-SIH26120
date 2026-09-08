"""
Polaris AI/ML Modular Architecture Package
==========================================
Field: Oil India Limited (OIL), Baghewala Heavy Oil PML Field, Rajasthan, India

Modules:
  - config: Physical constants, ASTM D341 Walther parameters, Baghewala reservoir specs
  - schemas: Pydantic v2 schemas for all ML inputs and outputs
  - data: Multi-source dataset loader and feature transformers
  - models: Boberg-Lantz thermal, multi-target production, SRP kinematics, fault classifier, CSS optimizer
  - pipelines: Model training pipeline and unified inference engine
  - trained_artifacts: Persisted .joblib model weights and metric summaries
"""
from app.ml.config import RESERVOIR, SRP, STEAM, WALTHER
from app.ml.data import DataLoader, MLDataPreprocessor, data_loader
from app.ml.models import (
    CSSOptimizerModel,
    FaultDetectorModel,
    ProductionForecasterModel,
    ReservoirThermalModel,
    SRPOptimizerModel,
)
from app.ml.pipelines import (
    InferenceEngine,
    TrainingPipeline,
    ml_inference,
    training_pipeline,
)
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

__all__ = [
    # Singletons
    "ml_inference",
    "training_pipeline",
    "data_loader",
    # Model Classes
    "ReservoirThermalModel",
    "ProductionForecasterModel",
    "SRPOptimizerModel",
    "FaultDetectorModel",
    "CSSOptimizerModel",
    # Preprocessor
    "MLDataPreprocessor",
    "DataLoader",
    "TrainingPipeline",
    "InferenceEngine",
    # Configs
    "WALTHER",
    "RESERVOIR",
    "STEAM",
    "SRP",
    # Schemas
    "ReservoirPredictRequest",
    "ReservoirPredictResponse",
    "ProductionForecastRequest",
    "ProductionForecastResponse",
    "SRPOptimizeRequest",
    "SRPOptimizeResponse",
    "FaultDetectRequest",
    "FaultDetectResponse",
    "CSSOptimizeRequest",
    "CSSOptimizeResponse",
    "ModelStatusResponse",
    "WellInsightsResponse",
]
