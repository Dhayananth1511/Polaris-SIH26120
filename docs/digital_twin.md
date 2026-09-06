# Digital Twin State Representation & Physical Coupling

## 1. Wellbore Digital Twin State Schema

The POLARIS Digital Twin maintains a synchronized virtual state representation for every heavy oil well:

```json
{
  "wellId": "BGW-001",
  "timestamp": "2026-09-06T17:00:00Z",
  "reservoir": {
    "temperature_c": 68.0,
    "pressure_bar": 18.5,
    "viscosity_cp": 1420.0,
    "fluid_mobility_index": 0.704,
    "steam_penetration_radius_m": 42.0
  },
  "css": {
    "cycle_number": 3,
    "steam_volume_ton": 750.0,
    "injection_pressure_bar": 21.0,
    "soak_time_hr": 64.0,
    "sor": 3.42
  },
  "srp": {
    "spm": 5.1,
    "stroke_length_in": 68.0,
    "vfd_frequency_hz": 34.0,
    "spm_crit": 5.4,
    "spm_safe": 4.8,
    "pump_efficiency_pct": 68.5,
    "peak_polished_rod_load_kn": 58.4,
    "min_polished_rod_load_kn": 12.2
  },
  "health": {
    "rod_floating_risk_pct": 24.5,
    "fluid_pound_risk_pct": 14.8,
    "overall_health_score": 78
  }
}
```

## 2. The Physical Coupling Chain

Heavy oil extraction exhibits strong non-linear physical coupling between thermal stimulation and surface mechanical lift:

```
Steam Injection (Volume, Pressure, Soak)
                 ↓
Reservoir Temperature Response (Boberg-Lantz)
                 ↓
ASTM D341 Walther Viscosity Decay
                 ↓
Darcy Mobility & Inflow Performance Relationship (IPR)
                 ↓
Hydrodynamic Drag on Rod String (Stokes-Couette)
                 ↓
Critical Pumping Speed ($SPM_{crit}$) & Rod Float Boundary
                 ↓
Pump Fillage, Dyno Card Geometry & Surface Oil Rate
```
