# POLARIS — AI-Enabled Well-to-Surface Digital Twin

> **Smart India Hackathon 2026 | Problem Statement ID: SIH26120**  
> **Organization**: Oil India Limited  
> **Theme**: Smart Automation | **Category**: Software  
> **Digital Twin for Well-to-Surface Optimization of Cyclic Steam Stimulation (CSS) and Sucker Rod Pump (SRP) Operations for Heavy Oil Wells of Baghewala Field.**

---

> [!IMPORTANT]
> **Prototype Mode — Synthetic / Simulated Data Notice**:  
> This software prototype was developed using synthetic/simulated operational datasets (`well_master.csv`, `well_telemetry.csv`, `css_cycles.csv`, `production.csv`, `srp_operations.csv`, `dynamometer_cards.csv`, `failure_events.csv`). It does not claim to represent actual unblinded Baghewala field telemetry.  
> **Decision-Support Classification**: All AI recommendations are decision-support outputs and strictly require engineer validation before operational use.

---

## 1. Executive Summary

Heavy oil recovery at the Baghewala PML field (17–19° API crude, Jodhpur Sandstone) presents acute physical challenges:
- High crude viscosity exceeding 2,000 cP at natural reservoir temperatures (48°C)
- Severe downstroke rod floating and fluid pound hazards on Sucker Rod Pumps
- Disconnected optimization between reservoir steam injection and surface pump kinematics
- High Steam-Oil Ratio (SOR) and excessive mechanical failure rates

**POLARIS** solves this through an end-to-end, Physics-Informed Digital Twin coupling Boberg-Lantz reservoir thermal decay, ASTM D341 Walther viscosity correlation, hydrodynamic rod drag modeling, and multi-objective Pareto optimization.

---

## 2. The 12 UI Pages

1. **Page 1: Overview** (`/app/overview`) — Field-level KPIs, production trends, active well health cards, alert summaries, and Digital Twin status strip.
2. **Page 2: Well Digital Twin** (`/app/digital-twin`) — Synchronized virtual representation linking Reservoir $\to$ Thermal State $\to$ Viscosity $\to$ Wellbore $\to$ SRP $\to$ Production.
3. **Page 3: Reservoir Monitor** (`/app/reservoir`) — Downhole temperature/pressure history, ASTM Walther viscosity response, and 1/3/7-day thermal forecasts.
4. **Page 4: CSS Optimization** (`/app/css-optimizer`) — Multi-objective Pareto optimization of steam volume, injection pressure, and soak time to minimize SOR.
5. **Page 5: SRP Diagnostics** (`/app/srp-diagnostics`) — Interactive Position vs. Load Dynamometer Card (Surface and Downhole work loops), rod floating detection, and impact loading risk.
6. **Page 6: SRP Optimization** (`/app/srp-optimizer`) — SPM, stroke length, and 4-stage VFD kinematic schedule ensuring operation below critical rod float speed ($SPM_{crit}$).
7. **Page 7: Joint Optimization** (`/app/joint-optimizer`) — Simultaneous multi-objective optimization across both CSS thermal stimulation and SRP artificial lift.
8. **Page 8: What-If Simulator** (`/app/what-if`) — Interactive slider sandbox comparing baseline vs. proposed scenarios with KPI deltas (+8.4% oil, -12.2% SOR, -14.3% rod float risk).
9. **Page 9: Failure & Alerts** (`/app/alerts`) — Anomaly detection scan (Isolation Forest) and multi-label fault classification (rod float, fluid pound, gas interference).
10. **Page 10: Historical Analysis** (`/app/historical-analysis`) — Multi-well production histories, CSS cycle comparisons, cumulative oil, and downtime records.
11. **Page 11: Recommendations** (`/app/recommendations`) — Explainable AI action feed with confidence, physical rationale, safety constraints, and engineer Review/Approve/Reject workflow.
12. **Page 12: System Status** (`/app/system-status`) — Database connection status, dataset record counts, ML model readiness metrics ($R^2$, $RMSE$), and calibration configuration.

---

## 3. Real-Time Telemetry Replay Engine

Since hardware sensors (ESP32, Arduino, SCADA controllers) are deliberately excluded per the software prototype constraints:
- Built-in **Telemetry Replay Engine** replays rows from `well_telemetry.csv`.
- Header transport controls: `[▶ PLAY]`, `[❚❚ PAUSE]`, `[↺ RESET]`, `[⏭ STEP]`, and Speed selection (`1x`, `5x`, `10x`, `50x`).
- Clearly identified by the **"SIMULATED LIVE DATA"** indicator badge.

---

## 4. Quick Start (Single Command via Docker)

Start the entire system (PostgreSQL, FastAPI Backend, React Frontend):

```bash
docker compose up --build
```

Access the applications:
- **Frontend Dashboard**: `http://localhost:3000`
- **Backend Swagger API Docs**: `http://localhost:8000/api/docs`
- **PostgreSQL**: `localhost:5432`

---

## 5. Local Development Setup

### 5.1 Backend Setup
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Inspect and validate datasets
python scripts/inspect_data.py
python scripts/validate_data.py

# Ingest datasets & bootstrap database
python scripts/seed_database.py

# Train ML models
python scripts/train_models.py

# Start backend server
python app/server.py
```

### 5.2 Frontend Setup
```powershell
cd frontend
npm install
npm run build
npm run dev
```

---

## 6. Verification & Testing

Execute unit and regression tests:
```powershell
cd backend
.\.venv\Scripts\pytest tests/ -v
```
