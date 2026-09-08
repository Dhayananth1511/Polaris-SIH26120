# POLARIS SIH26120: System Architecture & Design

**Problem Statement**: Digital Twin for Well-to-Surface Optimization of Cyclic Steam Stimulation (CSS) and Sucker Rod Pump (SRP) Operations for Heavy Oil Wells of Baghewala Field.  
**Organization**: Oil India Limited (OIL)  
**Classification**: Software Prototype (Synthetic / Simulated Operational Data)

---

## 1. High-Level Architectural Overview

POLARIS implements a hybrid Physics-Informed Digital Twin coupled with modern machine learning and decision-support optimization for heavy oil well operations.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        REACT FRONTEND (Vite + TS)                      │
│   • 12 Dedicated Pages (Overview, Twin, Reservoir, CSS, SRP, Joint)   │
│   • Recharts Dynamometer & Thermal Curves                              │
│   • Real-time Simulated Live Telemetry Replay Bar                      │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ REST API
┌───────────────────────────────────▼────────────────────────────────────┐
│                        FASTAPI BACKEND SERVICE                         │
│   • Canonical REST Endpoints (/api/predict/*, /api/optimize/*, etc.)   │
│   • Heavy Oil Physics Engine (Walther D341, Boberg-Lantz, SPM_crit)    │
│   • In-Memory Telemetry Replay Engine (1x - 50x Playback)              │
│   • Multi-Objective Joint Optimizer (Pareto Front)                     │
│   • Governance & Engineering Approval State Machine                    │
└───────────────────▲────────────────────────────────▲───────────────────┘
                    │                                │
┌───────────────────▼──────────────┐   ┌─────────────▼───────────────────┐
│     POSTGRESQL RELATIONAL DB     │   │      SCIKIT-LEARN / XGBOOST     │
│   • wells, production, telemetry │   │   • Thermal Trajectory Predictor│
│   • css_cycles, srp_operations   │   │   • Production Multi-Forecaster │
│   • dynamometer_cards, failures  │   │   • Fault & Rod Float Classifier│
│   • optimization_approvals       │   │   • Isolation Forest Anomaly    │
└──────────────────────────────────┘   └─────────────────────────────────┘
```

---

## 2. Key Subsystems

### 2.1 Physics-Informed Heavy Oil Layer
- **Walther ASTM D341 Correlation**: Couples reservoir and wellbore temperature to dynamic crude viscosity for 17–19° API crude.
- **Boberg-Lantz Thermal Conduction**: Models cyclic steam injection heat dissipation, heated zone radius, and soaking cooling curve.
- **Stokes-Couette Downstroke Buoyancy Drag**: Computes critical SPM ceiling ($SPM_{crit}$) to mathematically prevent sucker rod floating.

### 2.2 Telemetry Replay Simulation Engine
- Synthetically replays operational telemetry rows from `well_telemetry.csv`.
- Exposes controls (`PLAY`, `PAUSE`, `RESET`, `STEP`, `SPEED` 1x–50x).
- Advances simulated operational time and updates Digital Twin state in real time.

### 2.3 Decision-Support Optimization Engine
- Performs multi-objective optimization over steam volume, injection pressure, soak duration, surface stroke length, and SPM.
- Balances oil production rate against Steam-Oil Ratio (SOR), energy consumption (kWh/bbl), and mechanical rod stress.
- Enforces strict human-in-the-loop engineering approvals before operational dispatch.
