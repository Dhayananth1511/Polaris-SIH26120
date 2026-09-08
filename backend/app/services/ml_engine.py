"""
Polaris — Unified AI / ML Engine
=================================
Implements the full tech-stack AI layer:
  • XGBoost surrogate  → production & SOR forecasting
  • Isolation Forest   → real-time telemetry anomaly detection
  • SHAP TreeExplainer → per-prediction feature importance
  • Bayesian Beta-Binomial → failure-rate posterior with credible interval

Training data: CSV files in database/ directory (no DB required).
The engine is a lazy-loaded singleton; first call triggers training (~2 s).
"""

from __future__ import annotations

import logging
import math
import os
import warnings
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, cast

import numpy as np
import pandas as pd
from scipy import stats

warnings.filterwarnings("ignore", category=UserWarning)

try:
    import xgboost as xgb  # pyrefly: ignore[missing-import] # type: ignore
except ImportError:  # pragma: no cover
    xgb = None  # type: ignore

try:
    from sklearn.ensemble import IsolationForest  # pyrefly: ignore[missing-import] # type: ignore
    from sklearn.preprocessing import StandardScaler  # pyrefly: ignore[missing-import] # type: ignore
except ImportError:  # pragma: no cover
    IsolationForest = None  # type: ignore
    StandardScaler = None  # type: ignore

try:
    import shap  # pyrefly: ignore[missing-import] # type: ignore
except ImportError:  # pragma: no cover
    shap = None  # type: ignore

logger = logging.getLogger(__name__)

# ── Paths ──────────────────────────────────────────────────────────────────────
def _resolve_db_dir() -> Path:
    candidates = [
        Path(__file__).resolve().parents[3] / "database",
        Path(__file__).resolve().parents[2] / "database",
        Path.cwd() / "database",
        Path.cwd().parent / "database",
    ]
    for c in candidates:
        if c.exists() and (c / "well_telemetry.csv").exists():
            return c
    return candidates[0]

_DB_DIR = _resolve_db_dir()

_TELEMETRY_CSV   = _DB_DIR / "well_telemetry.csv"
_PRODUCTION_CSV  = _DB_DIR / "production.csv"
_SRP_CSV         = _DB_DIR / "srp_operations.csv"
_FAILURE_CSV     = _DB_DIR / "failure_events.csv"
_DYNAMO_CSV      = _DB_DIR / "dynamometer_cards.csv"


# ── Feature Definitions ────────────────────────────────────────────────────────
PROD_FEATURES = [
    "reservoir_temperature_c",
    "wellhead_temperature_c",
    "pressure_bar",
    "flow_rate_bpd",
    "motor_power_kw",
    "motor_current_a",
    "vibration_mm_s",
]

ANOMALY_FEATURES = [
    "reservoir_temperature_c",
    "vibration_mm_s",
    "motor_power_kw",
    "motor_current_a",
    "pressure_bar",
    "flow_rate_bpd",
]


class MLEngine:
    """Singleton lazy-loading ML engine for Polaris."""

    _instance: Optional["MLEngine"] = None
    _ready: bool = False

    def __new__(cls) -> "MLEngine":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    # ── Public API ─────────────────────────────────────────────────────────────

    def ensure_ready(self) -> None:
        """Train all models if not already done (idempotent)."""
        if self._ready:
            return
        logger.info("ml_engine: starting training from CSV data ...")
        try:
            self._train_production_model()
            self._train_anomaly_model()
            self._build_failure_priors()
            self._ready = True
            logger.info("ml_engine: all models ready [OK]")
        except Exception as exc:
            logger.error("ml_engine: training failed — %s", exc, exc_info=True)
            # Mark ready anyway so we don't retry on every request
            self._ready = True

    # ── 1. XGBoost Production Forecast ────────────────────────────────────────

    def forecast_production(
        self,
        well_id: str,
        current_features: Dict[str, float],
        horizon_days: int = 14,
    ) -> Dict[str, Any]:
        """
        Returns multi-day production forecast with 90% prediction interval.
        Uses XGBoost regressor + SHAP explanations.
        """
        self.ensure_ready()

        if xgb is None or not hasattr(self, "_prod_model"):
            return self._fallback_forecast(current_features, horizon_days)

        # Build feature matrix for forecast (apply small decay per day)
        forecast_rows = []
        for day_offset in range(1, horizon_days + 1):
            row = {}
            decay = math.exp(-0.012 * day_offset)          # thermal decay proxy
            for feat in PROD_FEATURES:
                base_val = current_features.get(feat, self._prod_feature_means.get(feat, 0.0))
                if feat in ("reservoir_temperature_c", "wellhead_temperature_c"):
                    row[feat] = base_val * (0.995 + decay * 0.005)
                elif feat == "flow_rate_bpd":
                    row[feat] = base_val * (0.97 + decay * 0.03)
                else:
                    row[feat] = base_val
            forecast_rows.append(row)

        X_fut = pd.DataFrame(forecast_rows)[PROD_FEATURES].fillna(self._prod_feature_means)
        dmat  = xgb.DMatrix(X_fut)
        preds = self._prod_model.predict(dmat).tolist()

        # ── Prediction Interval via residual std (± 1.645σ for 90% CI) ────────
        sigma = getattr(self, "_prod_residual_std", 3.5)
        z90   = 1.645

        # ── SHAP for first-day explanation ─────────────────────────────────────
        shap_vals = self._compute_shap(X_fut.iloc[[0]])

        daily_series = []
        for i, p in enumerate(preds):
            daily_series.append({
                "day":       i + 1,
                "predicted": round(max(0.0, p), 1),
                "lower90":   round(max(0.0, p - z90 * sigma), 1),
                "upper90":   round(max(0.0, p + z90 * sigma), 1),
            })

        return {
            "wellId":          well_id,
            "horizon":         horizon_days,
            "dailySeries":     daily_series,
            "shapValues":      shap_vals,
            "modelType":       "XGBoost (Baghewala CSV)",
            "rmse":            round(getattr(self, "_prod_rmse", 4.2), 2),
            "confidenceLevel": "90%",
        }

    # ── 2. Isolation Forest Anomaly Detection ─────────────────────────────────

    def score_anomaly(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Score a single telemetry reading for anomaly probability.
        Returns score in [0, 1] and boolean flag.
        """
        self.ensure_ready()

        if IsolationForest is None or not hasattr(self, "_anomaly_model") or not hasattr(self, "_anom_scaler"):
            return {"anomalyScore": 0.12, "isAnomaly": False, "method": "fallback"}

        vals = [features.get(f, self._anom_feature_means.get(f, 0.0)) for f in ANOMALY_FEATURES]
        X = np.array(vals).reshape(1, -1)
        X_scaled = self._anom_scaler.transform(X)

        # IsoForest decision_function: more negative → more anomalous
        raw_score = float(self._anomaly_model.decision_function(X_scaled)[0])
        is_anomaly = bool(self._anomaly_model.predict(X_scaled)[0] == -1)

        # Map raw score to [0, 1] probability (sigmoid inversion)
        anomaly_prob = round(1.0 / (1.0 + math.exp(5.0 * raw_score)), 3)

        return {
            "anomalyScore": anomaly_prob,
            "isAnomaly":    is_anomaly,
            "rawScore":     round(raw_score, 4),
            "method":       "IsolationForest",
        }

    def scan_well_anomalies(
        self,
        telemetry_rows: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Scan a list of telemetry records and flag anomalous ones.
        """
        self.ensure_ready()

        results = []
        anomaly_count = 0

        for row in telemetry_rows:
            feats = {f: float(row.get(f, 0) or 0) for f in ANOMALY_FEATURES}
            result = self.score_anomaly(feats)
            anomaly_count += int(result["isAnomaly"])
            results.append({
                "timestamp":    row.get("timestamp", ""),
                "anomalyScore": result["anomalyScore"],
                "isAnomaly":    result["isAnomaly"],
                "features":     feats,
            })

        total = len(results)
        return {
            "totalReadings":  total,
            "anomalyCount":   anomaly_count,
            "anomalyRate":    round(anomaly_count / max(total, 1), 3),
            "readings":       sorted(results, key=lambda x: x["anomalyScore"], reverse=True),
        }

    # ── 3. SHAP Explainability ─────────────────────────────────────────────────

    def explain_prediction(
        self,
        well_id: str,
        current_features: Dict[str, float],
    ) -> Dict[str, Any]:
        """
        Returns SHAP values for a single prediction using TreeExplainer.
        Falls back to feature-importance weights if SHAP unavailable.
        """
        self.ensure_ready()
        X = cast(pd.DataFrame, pd.DataFrame([current_features])[PROD_FEATURES].fillna(self._prod_feature_means))
        shap_vals = self._compute_shap(X)

        return {
            "wellId":      well_id,
            "shapValues":  shap_vals,
            "baseValue":   round(getattr(self, "_prod_base_value", 28.5), 2),
            "features":    PROD_FEATURES,
            "method":      "SHAP TreeExplainer" if shap is not None else "XGB Feature Importance",
        }

    # ── 4. Bayesian Failure Risk ───────────────────────────────────────────────

    def bayesian_failure_risk(
        self,
        well_id: str,
        recent_failures: int,
        observation_days: int = 30,
    ) -> Dict[str, Any]:
        """
        Beta-Binomial Bayesian update on failure rate prior.
        Prior: Beta(α₀, β₀) calibrated from field-wide historical data.
        Posterior: Beta(α₀ + failures, β₀ + days - failures)
        Returns: MAP estimate, 90% credible interval.
        """
        self.ensure_ready()

        # Field-wide prior (from historical failure_events.csv analysis)
        alpha0 = getattr(self, "_prior_alpha", 1.5)
        beta0  = getattr(self, "_prior_beta",  18.5)

        alpha_post = alpha0 + recent_failures
        beta_post  = beta0  + observation_days - recent_failures

        # Posterior mean, MAP, and 90% CI
        mean_rate  = alpha_post / (alpha_post + beta_post)
        mode_rate  = max(0.0, (alpha_post - 1) / (alpha_post + beta_post - 2)) if (alpha_post + beta_post) > 2 else mean_rate
        ci_lower, ci_upper = stats.beta.ppf([0.05, 0.95], alpha_post, beta_post)

        # Risk category
        if mean_rate >= 0.25:
            category = "HIGH"
        elif mean_rate >= 0.12:
            category = "MEDIUM"
        else:
            category = "LOW"

        # Posterior PDF curve for visualization
        x_range = np.linspace(0, 1, 50)
        pdf_curve = [
            {"x": round(float(x), 3), "density": round(float(stats.beta.pdf(x, alpha_post, beta_post)), 3)}
            for x in x_range
        ]

        return {
            "wellId":            well_id,
            "priorAlpha":        round(alpha0, 2),
            "priorBeta":         round(beta0, 2),
            "posteriorAlpha":    round(alpha_post, 2),
            "posteriorBeta":     round(beta_post, 2),
            "failureProbMean":   round(float(mean_rate), 4),
            "failureProbMAP":    round(float(mode_rate), 4),
            "ci90Lower":         round(float(ci_lower), 4),
            "ci90Upper":         round(float(ci_upper), 4),
            "riskCategory":      category,
            "recentFailures":    recent_failures,
            "observationDays":   observation_days,
            "posteriorPdfCurve": pdf_curve,
            "method":            "Beta-Binomial Bayesian Update",
        }

    # ── Private: Training Methods ──────────────────────────────────────────────

    def _train_production_model(self) -> None:
        """Train XGBoost regressor: telemetry features → oil production (bpd)."""
        if xgb is None:
            logger.warning("xgboost not installed — skipping production model")
            return

        # Load & merge telemetry + production
        if not _TELEMETRY_CSV.exists() or not _PRODUCTION_CSV.exists():
            logger.warning("CSV files not found at %s — using synthetic data", _DB_DIR)
            self._prod_feature_means = {f: 0.0 for f in PROD_FEATURES}
            self._prod_residual_std  = 4.2
            self._prod_rmse          = 4.2
            self._prod_base_value    = 28.5
            return

        tel  = pd.read_csv(_TELEMETRY_CSV, parse_dates=["timestamp"], low_memory=False)
        tel.columns = [c.strip().lower() for c in tel.columns]
        prod = pd.read_csv(_PRODUCTION_CSV, parse_dates=["timestamp"], low_memory=False)
        prod.columns = [c.strip().lower() for c in prod.columns]

        # Round to nearest hour for merge
        tel["ts_hour"]  = tel["timestamp"].dt.floor("h")
        prod["ts_hour"] = prod["timestamp"].dt.floor("h")

        # Merge on well_id + ts_hour
        merged = pd.merge(
            tel[["well_id", "ts_hour"] + PROD_FEATURES],
            prod[["well_id", "ts_hour", "oil_rate_bpd"]],
            on=["well_id", "ts_hour"],
            how="inner",
        ).dropna(subset=PROD_FEATURES + ["oil_rate_bpd"])

        if len(merged) < 20:
            logger.warning("Insufficient training rows (%d) — using synthetic fallback", len(merged))
            self._prod_feature_means = {f: 0.0 for f in PROD_FEATURES}
            self._prod_residual_std  = 4.2
            self._prod_rmse          = 4.2
            self._prod_base_value    = 28.5
            return

        X = merged[PROD_FEATURES].astype(float)
        y = merged["oil_rate_bpd"].astype(float)

        self._prod_feature_means = X.mean().to_dict()

        # 80/20 time-based split
        split_idx = int(len(X) * 0.8)
        X_train, X_val = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_val = y.iloc[:split_idx], y.iloc[split_idx:]

        dtrain = xgb.DMatrix(X_train, label=y_train)
        dval   = xgb.DMatrix(X_val,   label=y_val)

        params = {
            "objective":        "reg:squarederror",
            "max_depth":        5,
            "learning_rate":    0.08,
            "n_estimators":     200,
            "subsample":        0.8,
            "colsample_bytree": 0.8,
            "min_child_weight": 3,
            "seed":             42,
            "verbosity":        0,
        }

        model = xgb.train(
            params,
            dtrain,
            num_boost_round=200,
            evals=[(dval, "val")],
            early_stopping_rounds=20,
            verbose_eval=False,
        )
        self._prod_model = model

        val_preds = model.predict(dval)
        residuals = y_val.values - val_preds
        self._prod_residual_std = float(np.std(residuals))
        self._prod_rmse         = float(np.sqrt(np.mean(residuals ** 2)))
        self._prod_base_value   = float(y_train.mean())

        logger.info(
            "XGBoost prod model trained: n=%d, RMSE=%.2f, σ=%.2f",
            len(merged), self._prod_rmse, self._prod_residual_std,
        )

        # Pre-build SHAP explainer
        if shap is not None:
            try:
                self._shap_explainer = shap.TreeExplainer(self._prod_model)
                logger.info("SHAP TreeExplainer initialised ✓")
            except Exception as e:
                logger.warning("SHAP init failed: %s", e)

    def _train_anomaly_model(self) -> None:
        """Train Isolation Forest on well telemetry data."""
        if IsolationForest is None or StandardScaler is None:
            logger.warning("scikit-learn not installed — skipping anomaly model")
            return

        if not _TELEMETRY_CSV.exists():
            logger.warning("Telemetry CSV not found — skipping anomaly model")
            self._anom_feature_means = {f: 0.0 for f in ANOMALY_FEATURES}
            return

        tel = pd.read_csv(_TELEMETRY_CSV, low_memory=False)
        tel.columns = [c.strip().lower() for c in tel.columns]
        X   = tel[ANOMALY_FEATURES].dropna().astype(float)

        if len(X) < 10:
            logger.warning("Insufficient telemetry rows (%d) for Isolation Forest", len(X))
            self._anom_feature_means = {f: 0.0 for f in ANOMALY_FEATURES}
            return

        self._anom_feature_means = X.mean().to_dict()
        self._anom_scaler        = StandardScaler().fit(X)
        X_scaled                 = self._anom_scaler.transform(X)

        self._anomaly_model = IsolationForest(
            n_estimators=100,
            contamination=0.05,    # ~5% of readings expected to be anomalous
            random_state=42,
            n_jobs=-1,
        ).fit(X_scaled)

        logger.info("IsolationForest trained on %d telemetry rows [OK]", len(X))

    def _build_failure_priors(self) -> None:
        """Compute field-wide Beta prior from historical failure events."""
        if not _FAILURE_CSV.exists():
            logger.warning("Failure CSV not found — using uninformative prior")
            self._prior_alpha = 1.5
            self._prior_beta  = 18.5
            return

        events = pd.read_csv(_FAILURE_CSV, low_memory=False)
        # Count distinct failure days vs. total well-days observed
        # Use simple MOM estimation: alpha/(alpha+beta) = failure_rate
        total_rows   = len(events)
        total_wells  = events["well_id"].nunique() if "well_id" in events.columns else 10
        # Assume ~30 days per well × wells observed
        total_days   = total_wells * 30
        failure_rate = min(0.25, total_rows / max(total_days, 1))

        # Method-of-Moments: alpha/(alpha+beta) = p_hat, effective sample ≈ 20
        eff_n             = 20.0
        self._prior_alpha = max(1.0, failure_rate * eff_n)
        self._prior_beta  = max(1.0, (1.0 - failure_rate) * eff_n)

        logger.info(
            "Bayesian priors: alpha=%.2f, beta=%.2f (failure_rate=%.3f)",
            self._prior_alpha, self._prior_beta, failure_rate,
        )

    # ── Private Helpers ────────────────────────────────────────────────────────

    def _compute_shap(self, X: pd.DataFrame | Any) -> List[Dict[str, Any]]:
        """Compute SHAP values. Falls back to XGB feature importance."""
        if xgb is not None and shap is not None and hasattr(self, "_shap_explainer") and hasattr(self, "_prod_model"):
            try:
                sv = self._shap_explainer.shap_values(xgb.DMatrix(X))
                row = sv[0] if sv.ndim > 1 else sv
                total_abs = float(sum(abs(float(v)) for v in row)) or 1.0
                return [
                    {
                        "feature":     PROD_FEATURES[i],
                        "shapValue":   round(float(row[i]), 4),
                        "absContrib":  round(abs(float(row[i])), 4),
                        "pctContrib":  round((abs(float(row[i])) / total_abs) * 100.0, 1),
                    }
                    for i in range(len(PROD_FEATURES))
                ]
            except Exception as e:
                logger.warning("SHAP computation failed: %s", e)

        if hasattr(self, "_prod_model"):
            try:
                raw_fi = self._prod_model.get_fscore()
                fi: Dict[str, float] = {
                    k: v[0] if isinstance(v, (list, tuple)) else v
                    for k, v in raw_fi.items()
                }
                total = sum(fi.values()) or 1.0
                return [
                    {
                        "feature":    f,
                        "shapValue":  round(fi.get(f, 0.0) / total * 5.0, 4),
                        "absContrib": round(fi.get(f, 0.0) / total, 4),
                        "pctContrib": round((fi.get(f, 0.0) / total) * 100.0, 1),
                    }
                    for f in PROD_FEATURES
                ]
            except Exception:
                pass

        # Final fallback: uniform
        return [
            {"feature": f, "shapValue": 0.0, "absContrib": 0.0, "pctContrib": round(100.0 / len(PROD_FEATURES), 1)}
            for f in PROD_FEATURES
        ]

    def _fallback_forecast(
        self,
        current_features: Dict[str, float],
        horizon_days: int,
    ) -> Dict[str, Any]:
        """Simple exponential decay forecast when XGBoost is unavailable."""
        base = current_features.get("flow_rate_bpd", 28.5)
        series = []
        for d in range(1, horizon_days + 1):
            p = base * math.exp(-0.008 * d)
            series.append({
                "day":       d,
                "predicted": round(max(5.0, p), 1),
                "lower90":   round(max(0.0, p - 4.0), 1),
                "upper90":   round(p + 4.0, 1),
            })
        return {
            "wellId":      "",
            "horizon":     horizon_days,
            "dailySeries": series,
            "shapValues":  [],
            "modelType":   "Exponential Decay Fallback",
            "rmse":        None,
            "confidenceLevel": "N/A",
        }


# ── Module-level singleton ─────────────────────────────────────────────────────
ml_engine = MLEngine()
