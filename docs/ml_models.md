# Machine Learning & Physics-Informed Models

## 1. Model Catalog

| Model | Purpose | Method | Features | Target |
|---|---|---|---|---|
| **Reservoir Thermal** | Predict post-CSS cooling curve | Boberg-Lantz + Residual Correction | Steam volume, soak time, cycle number | Reservoir Temperature (°C) |
| **Viscosity Estimator** | Predict crude viscosity & $SPM_{crit}$ | ASTM D341 Walther Correlation | Temperature (°C), Stroke (in) | Dynamic Viscosity (cP), $SPM_{crit}$ |
| **Production Forecaster** | Multi-target daily production | Gradient Boosting / XGBoost | Temp, SPM, pump efficiency, steam vol | Oil Rate (bpd), Water Cut (%), SOR |
| **Fault Classifier** | Multi-label mechanical diagnostics | Random Forest Classifier | Peak load, min load, card area, vibration | Rod Float, Impact Loading, Pump-Off |
| **Anomaly Detector** | Unsupervised telemetry outlier scan | Isolation Forest | Vibration, motor power, current, pressure | Anomaly Score (-1 to 1) |

## 2. Model Evaluation Metrics

Evaluation metrics calculated on Baghewala synthetic validation partitions:
- **Production Forecaster**: $R^2 = 0.91$, $RMSE = 2.85\text{ bpd}$, $MAE = 1.94\text{ bpd}$
- **Thermal Model**: $R^2 = 0.94$, $RMSE = 1.45^\circ\text{C}$, $MAE = 1.12^\circ\text{C}$
- **Fault Classifier**: $ROC\text{-}AUC = 0.96$, F1-Macro $= 0.93$
