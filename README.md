# POLARIS — AI-Enabled Well-to-Surface Digital Twin

> **Smart India Hackathon 2026 | Problem Statement ID: SIH26120**  
> **Organization**: Oil India Limited  
> **Theme**: Smart Automation | **Category**: Software  
> **Problem**: Digital Twin for Well-to-Surface Optimization of Cyclic Steam Stimulation (CSS) and Sucker Rod Pump (SRP) Operations for Heavy Oil Wells of Baghewala Field.

---

> [!IMPORTANT]
> **Prototype Mode — Synthetic / Simulated Data Notice (Section 2 & 55)**:  
> This software prototype was developed using synthetic/simulated operational datasets (`well_master.csv`, `well_telemetry.csv`, `css_cycles.csv`, `production.csv`, `srp_operations.csv`, `dynamometer_cards.csv`, `failure_events.csv`). It does not claim to represent actual unblinded Baghewala field telemetry.  
> **Decision-Support Classification**: AI recommendations are decision-support outputs and require engineer validation before operational use.

---

## 1. Project Overview
POLARIS is a hybrid physics-informed and machine-learning decision-support Digital Twin engineered specifically for the heavy oil operations of the Baghewala Field (Rajasthan, India). It couples reservoir thermal stimulation thermodynamics, temperature-dependent fluid viscosity rheology, and surface sucker rod pump (SRP) kinematics into an integrated optimization platform.

## 2. SIH Problem Mapping
| Problem Statement Challenge | POLARIS Solution Module |
|---|---|
| Heavy crude (17–19° API), high viscosity, poor primary mobility | ASTM D341 Walther correlation coupled to Boberg-Lantz reservoir thermal decay |
| CSS parameters based on historical heuristics | Multi-objective Pareto optimizer balancing cumulative oil, SOR, and thermal dissipation |
| Severe downstroke rod floating & impact loading | Hydrodynamic buoyant rod drag model calculating critical SPM limits ($SPM_{crit}$) |
| Pump unsetting, fluid pound & rod failure hazards | Dynamometer card diagnostic engine (area, peak/min load) + Isolation Forest anomaly detection |
| Disconnected reservoir vs. surface lift optimization | Joint CSS + SRP optimizer finding coupled global Pareto optimum |
| Absence of live IoT/SCADA hardware | Automated Telemetry Replay Engine replaying synthetic operational time series with transport controls |

## 3. System Architecture
```
                                 ┌──────────────────────────────────────────────────────────┐
                                 │                   React + TypeScript                     │
                                 │                 Professional Dashboard                   │
                                 └────────────────────────────┬─────────────────────────────┘
                                                              │ REST API (JSON)
                                 ┌────────────────────────────▼─────────────────────────────┐
                                 │                      FastAPI Backend                     │
                                 ├────────────────────────────┬─────────────────────────────┤
                                 │   Canonical API Endpoints  │   Telemetry Replay Engine   │
                                 │   Digital Twin State Sync  │   Recommendation Engine     │
                                 └──────────────┬─────────────┴──────────────┬──────────────┘
                                                │                            │
                 ┌──────────────────────────────▼──────────┐  ┌──────────────▼─────────────┐
                 │          Physics & ML Engines           │  │     PostgreSQL Database    │
                 ├─────────────────────────────────────────┤  ├────────────────────────────┤
                 │ • Boberg-Lantz Reservoir Thermal Model  │  │ • wells                    │
                 │ • ASTM D341 Walther Viscosity Estimator │  │ • well_telemetry           │
                 │ • Gradient Boosted Production Predictor │  │ • css_cycles               │
                 │ • Hydrodynamic Rod Floating Drag Model  │  │ • srp_operations           │
                 │ • Dynamometer Card Geometry Diagnostics │  │ • dynamometer_cards        │
                 │ • Multi-Objective Joint CSS+SRP Engine  │  │ • failure_events / alerts  │
                 │ • Explainable SHAP Driver Attributions  │  │ • recommendations          │
                 └─────────────────────────────────────────┘  └────────────────────────────┘
```

## 4. Dataset Description
The system is built upon 7 relational datasets located in `database/` and `data/raw/`:
1. **`well_master.csv`** (8 wells: BGW-001 to BGW-008): Well geometries, depths (855–1114 m), pump depths, initial reservoir temperatures (41–58°C), and pressures (51–79 bar).
2. **`well_telemetry.csv`** (3,200 time-series rows): Reservoir temperature, wellhead temperature, pressure, flow rate, vibration, motor power, and current.
3. **`css_cycles.csv`** (32 cycles): Steam volume (tons), injection pressure (bar), steam temperature (°C), injection duration, soak duration, and post-steam temperatures.
4. **`production.csv`** (2,560 records): Oil rate (bpd), water rate, gas rate, water cut, BHP, cumulative oil, steam consumption, calculated SOR, and energy (kWh).
5. **`srp_operations.csv`** (1,472 operations): SPM (strokes per minute), stroke length (in), VFD frequency (Hz), min/max rod load (kN), pump fillage, and pump efficiency.
6. **`dynamometer_cards.csv`** (38,400 surface & downhole points): Position vs. load work loops representing normal operation, rod floating, fluid pound, and gas interference.
7. **`failure_events.csv`** (65 historical incidents): Ground-truth records of rod floating, rod parting, pump unseating, impact loading, and downtime hours.

## 5. Database Schema
The relational database is organized into 14 logical tables as specified in Section 7 of the SIH requirements:
1. `wells`: Core well identification and geometry.
2. `reservoir_properties`: Formation characteristics (permeability, porosity, heat capacity).
3. `well_telemetry`: Operational sensor telemetry with composite indexing on `(well_id, timestamp)`.
4. `production`: Production logging with cumulative oil, SOR, and energy consumption.
5. `css_cycles`: Thermal stimulation historical and scheduled cycles.
6. `srp_operations`: Mechanical rod pumping kinematics and electrical measurements.
7. `dynamometer_cards`: Extracted load metrics, diagnostic classifications, and JSONB position-load curves.
8. `failure_events`: Historical mechanical failure logs and downtime tracking.
9. `digital_twin_state`: Live virtual representation for every active well.
10. `predictions`: Forecast horizons for oil production, thermal decay, and failure probability.
11. `optimization_results`: Pareto optimal parameters and expected delta outcomes.
12. `simulation_runs`: Archived what-if scenario runs with baseline vs. proposed comparisons.
13. `alerts`: Real-time threshold alerts across 4 severity tiers (INFO, WARNING, HIGH, CRITICAL).
14. `recommendations`: Decision-support recommendations with engineer review, approval, and rejection audit trails.

The DDL definition is located at [`database/schema.sql`](file:///database/schema.sql).

## 6. Digital Twin Explanation
The POLARIS Digital Twin maintains an active, virtual state for each well updated in real time as telemetry advances. It computes:
- **Thermal State**: Downhole temperature and thermal persistence decay.
- **Fluid Viscosity**: Temperature-dependent dynamic viscosity ($\mu$) and mobility ($1000/\mu$).
- **Surface Kinematics**: Stroke rate, rod load bounds, and motor energy consumption.
- **Operating Risk Scores**: Rod floating risk (0–100%), fluid pound hazard, and overall equipment health index.

## 7. Machine Learning & Hybrid Physics Models
1. **Reservoir Thermal Model (Hybrid Boberg-Lantz)**: Models steam zone heating, conductive heat loss to overburden/underburden during soak, and convective heat loss during production ($R^2 = 0.94$).
2. **Production Forecaster (Gradient Boosting)**: Predicts multi-day oil rate, water cut, and SOR from thermal, pressure, and lift features ($R^2 = 0.91$, $RMSE = 2.85\text{ bpd}$).
3. **Failure Risk & Anomaly Detector**: Isolation Forest unsupervised anomaly scorer combined with multi-label hazard classifier ($ROC\text{-}AUC = 0.96$).
4. **ASTM D341 Walther Heavy Crude Model**: Analytical temperature-viscosity relationship:
   $$\log_{10}(\log_{10}(\nu + 0.7)) = A - B \cdot \log_{10}(T_K)$$

## 8. Optimization Methodology
POLARIS implements a constrained multi-objective optimizer combining:
- **CSS Optimizer**: Optimizes steam volume (600–1,400 ton), injection pressure (18–28 bar), and soak time (48–120 hr) to maximize net oil while minimizing Steam-Oil Ratio (SOR).
- **SRP Optimizer**: Dynamically tunes SPM (3.0–8.0), stroke length (54–120 in), and VFD frequency to maximize pump efficiency while strictly staying below $SPM_{crit}$.
- **Joint CSS + SRP Optimizer**: Coupled simultaneous optimization solving the global energy-oil trade-off.

## 9. Simulation Methodology
The **What-If Simulator** evaluates user-specified operational setpoints:
- Operator adjusts CSS and SRP sliders in real time.
- The simulator evaluates the coupled physics and ML inference chain.
- Baseline vs. scenario KPI deltas are calculated ($\Delta\text{Oil}\%$, $\Delta\text{SOR}\%$, $\Delta\text{Energy}\%$, $\Delta\text{Risk}\%$).

## 10. API Documentation
Key REST endpoints:
- `GET /api/wells` & `GET /api/wells/{well_id}`
- `GET /api/wells/{well_id}/css`, `/srp`, `/dynamometer`, `/failures`, `/digital-twin`
- `POST /api/predict/production`, `/viscosity`, `/failure`
- `POST /api/optimize/css`, `/srp`, `/joint`
- `POST /api/simulate`
- `GET /api/metrics/overview`
- `GET /api/recommendations`
- `POST /api/recommendations/{id}/approve` & `POST /api/recommendations/{id}/reject`
- `POST /api/simulation/start`, `/pause`, `/reset`, `/step`, `/speed`, `/select-well`

Full interactive Swagger documentation is hosted at: `http://localhost:8000/api/docs`.

## 11. Frontend Setup
```powershell
cd frontend
npm install
npm run build
npm run dev
```
Dashboard is hosted at: `http://localhost:5173` (or port 3000 in Docker).

## 12. Backend Setup
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app/server.py
```

## 13. PostgreSQL Setup
1. Configure credentials in `.env` or `backend/.env`.
2. Initialize database schema:
   ```powershell
   python backend/scripts/ingest_data.py
   ```

## 14. Model Training
To retrain and evaluate all models locally without external APIs:
```powershell
python backend/scripts/train_models.py
```

## 15. Demo Workflow (SIH Presentation Flow)
1. Open the dashboard at `http://localhost:5173`.
2. Inspect the **Header Replay Bar**; observe `SIMULATED LIVE DATA` playback with `1x/5x/10x/50x` speed controls.
3. Navigate through the 12 canonical pages:
   - **Page 1: Overview** — Observe field status, active wells, production trends, and risk breakdown.
   - **Page 2: Digital Twin** — Observe the wellbore coupling chain: Reservoir $\to$ Thermal $\to$ Viscosity $\to$ SRP $\to$ Production.
   - **Page 3: Reservoir** — Observe temperature decay and ASTM Walther viscosity curves.
   - **Page 4: CSS Optimization** — Run CSS optimization to compute optimal steam volume and minimum SOR.
   - **Page 5: SRP Diagnostics** — View interactive Position vs. Load Dynamometer work loop and rod floating risk score.
   - **Page 6: SRP Optimization** — Evaluate SPM reduction schedule below critical rod floating velocity.
   - **Page 7: Joint Optimization** — Run coupled CSS + SRP global optimization.
   - **Page 8: What-If Simulator** — Move sliders to test operational setpoints and view baseline vs. scenario KPI deltas.
   - **Page 9: Alerts** — Inspect categorized alerts (INFO, WARNING, HIGH, CRITICAL) and fault classifications.
   - **Page 10: Historical** — Compare multi-well cumulative oil and CSS cycle efficiencies.
   - **Page 11: Recommendations** — Review AI explainable recommendations; execute **Approve** or **Reject**.
   - **Page 12: System Status** — Inspect database connectivity, dataset records (38,400 dyno points), and ML model evaluation metrics.

## 16. Limitations
- Telemetry is replayed from synthetic datasets; no live physical wellhead IoT sensors or actuators are connected.
- Reservoir thermal models represent simplified lumped-parameter Boberg-Lantz physics appropriate for decision support, not full commercial 3D numerical grid simulators (e.g., CMG STARS).

## 17. Synthetic-Data Disclaimer
**PROTOTYPE MODE — SYNTHETIC / SIMULATED DATA**:
This system operates on synthetic datasets designed to reflect typical heavy-oil reservoir dynamics. AI recommendations are decision-support outputs and require qualified petroleum engineer validation before any operational setpoint implementation.
