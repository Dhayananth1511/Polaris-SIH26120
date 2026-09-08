#!/usr/bin/env python3
"""
backend/scripts/train_models.py
Executes end-to-end model training for:
- Reservoir Thermal Cooling Model (Boberg-Lantz hybrid)
- Production Forecaster (XGBoost / Gradient Boosting)
- Fault Classifier & Anomaly Detector
Saves joblib artifacts and logs evaluation metrics (MAE, RMSE, R²).
Conforms to SIH26120 Section 12, 16, 31, 38.
"""
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ml.pipelines.training_pipeline import training_pipeline
from app.ml.pipelines.inference_engine import ml_inference

def main():
    print("=" * 70)
    print("POLARIS SIH26120 — ML MODEL TRAINING & EVALUATION PIPELINE")
    print("=" * 70)
    print("\n[Step 1/3] Initiating full model training run...")

    metrics = training_pipeline.train_all_models()

    print("\n[Step 2/3] Reloading inference engine memory artifacts...")
    ml_inference.reload_models()

    print("\n[Step 3/3] Training and Evaluation Results:")
    print("-" * 70)
    for model_name, data in metrics.items():
        print(f"\nModel: {model_name.upper()}")
        print(f"  Status       : {data.get('status', 'Ready')}")
        print(f"  Sample Count : {data.get('sample_count', 0)}")
        print(f"  Last Trained : {data.get('last_trained', 'N/A')}")
        print("  Metrics:")
        for k, v in data.get("metrics", {}).items():
            print(f"    - {k}: {v}")

    print("\n" + "=" * 70)
    print("[OK] ML model training pipeline successfully executed.")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main()
