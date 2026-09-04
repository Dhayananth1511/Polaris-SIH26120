import type { Well, Alert, ProductionDataPoint, CSSCycle, SRPOperation, TwinState } from '../types';

// ─── Wells ─────────────────────────────────────────────────────────────────
export const WELLS: Well[] = [
  {
    id: 'BGW-001', name: 'BGW-001', status: 'Producing',  oilProduction: 31.2, temperature: 82, pressure: 4.8, rodLoad: 4.2, pumpEfficiency: 78, failureRisk: 'Low',      failureRiskScore: 0.08, waterCut: 38, sor: 3.2, lastUpdated: '14:32', cssPhase: 'Production', field: 'Baghewala', wellType: 'CSS + SRP', spudDate: '12 Mar 2018', pumpDepth: 820, reservoir: 'Baghewala Sand', latitude: 29.142, longitude: 72.385
  },
  {
    id: 'BGW-002', name: 'BGW-002', status: 'Producing',  oilProduction: 28.4, temperature: 79, pressure: 5.1, rodLoad: 5.1, pumpEfficiency: 74, failureRisk: 'Medium',   failureRiskScore: 0.21, waterCut: 42, sor: 3.5, lastUpdated: '14:31', cssPhase: 'Production', field: 'Baghewala', wellType: 'CSS + SRP', spudDate: '05 Jun 2018', pumpDepth: 790, reservoir: 'Baghewala Sand', latitude: 29.145, longitude: 72.391
  },
  {
    id: 'BGW-003', name: 'BGW-003', status: 'Attention',  oilProduction: 24.8, temperature: 74, pressure: 6.3, rodLoad: 6.3, pumpEfficiency: 62, failureRisk: 'High',     failureRiskScore: 0.45, waterCut: 51, sor: 4.1, lastUpdated: '14:30', cssPhase: 'Production', field: 'Baghewala', wellType: 'CSS + SRP', spudDate: '22 Sep 2018', pumpDepth: 850, reservoir: 'Baghewala Sand', latitude: 29.138, longitude: 72.378
  },
  {
    id: 'BGW-004', name: 'BGW-004', status: 'Producing',  oilProduction: 33.1, temperature: 81, pressure: 4.2, rodLoad: 4.2, pumpEfficiency: 81, failureRisk: 'Low',      failureRiskScore: 0.06, waterCut: 35, sor: 3.0, lastUpdated: '14:32', cssPhase: 'Production', field: 'Baghewala', wellType: 'CSS + SRP', spudDate: '18 Jan 2019', pumpDepth: 805, reservoir: 'Baghewala Sand', latitude: 29.150, longitude: 72.400
  },
  {
    id: 'BGW-005', name: 'BGW-005', status: 'Producing',  oilProduction: 26.7, temperature: 76, pressure: 5.8, rodLoad: 5.8, pumpEfficiency: 70, failureRisk: 'Medium',   failureRiskScore: 0.18, waterCut: 45, sor: 3.7, lastUpdated: '14:29', cssPhase: 'Soak',       field: 'Baghewala', wellType: 'CSS + SRP', spudDate: '07 Apr 2019', pumpDepth: 830, reservoir: 'Baghewala Sand', latitude: 29.132, longitude: 72.372
  },
  {
    id: 'BGW-006', name: 'BGW-006', status: 'Producing',  oilProduction: 29.5, temperature: 80, pressure: 4.9, rodLoad: 4.9, pumpEfficiency: 76, failureRisk: 'Low',      failureRiskScore: 0.10, waterCut: 40, sor: 3.3, lastUpdated: '14:31', cssPhase: 'Production', field: 'Baghewala', wellType: 'CSS + SRP', spudDate: '30 Jul 2019', pumpDepth: 815, reservoir: 'Baghewala Sand', latitude: 29.155, longitude: 72.408
  },
  {
    id: 'BGW-007', name: 'BGW-007', status: 'Critical',   oilProduction: 18.4, temperature: 68, pressure: 7.1, rodLoad: 7.1, pumpEfficiency: 52, failureRisk: 'High',     failureRiskScore: 0.67, waterCut: 58, sor: 5.2, lastUpdated: '14:28', cssPhase: 'Production', field: 'Baghewala', wellType: 'CSS + SRP', spudDate: '14 Nov 2019', pumpDepth: 870, reservoir: 'Baghewala Sand', latitude: 29.128, longitude: 72.365
  },
  {
    id: 'BGW-008', name: 'BGW-008', status: 'Producing',  oilProduction: 32.8, temperature: 83, pressure: 4.6, rodLoad: 4.6, pumpEfficiency: 79, failureRisk: 'Low',      failureRiskScore: 0.09, waterCut: 37, sor: 3.1, lastUpdated: '14:32', cssPhase: 'Production', field: 'Baghewala', wellType: 'CSS + SRP', spudDate: '26 Feb 2020', pumpDepth: 800, reservoir: 'Baghewala Sand', latitude: 29.160, longitude: 72.415
  },
  {
    id: 'BGW-009', name: 'BGW-009', status: 'Producing',  oilProduction: 27.3, temperature: 78, pressure: 5.4, rodLoad: 5.4, pumpEfficiency: 72, failureRisk: 'Low',      failureRiskScore: 0.13, waterCut: 43, sor: 3.6, lastUpdated: '14:30', cssPhase: 'Steam Inj', field: 'Baghewala', wellType: 'CSS + SRP', spudDate: '11 May 2020', pumpDepth: 840, reservoir: 'Baghewala Sand', latitude: 29.135, longitude: 72.380
  },
  {
    id: 'BGW-010', name: 'BGW-010', status: 'Attention',  oilProduction: 22.1, temperature: 71, pressure: 6.8, rodLoad: 6.8, pumpEfficiency: 58, failureRisk: 'High',     failureRiskScore: 0.52, waterCut: 54, sor: 4.6, lastUpdated: '14:27', cssPhase: 'Production', field: 'Baghewala', wellType: 'CSS + SRP', spudDate: '03 Aug 2020', pumpDepth: 860, reservoir: 'Baghewala Sand', latitude: 29.125, longitude: 72.360
  },
  {
    id: 'BGW-011', name: 'BGW-011', status: 'Producing',  oilProduction: 30.6, temperature: 80, pressure: 5.0, rodLoad: 5.0, pumpEfficiency: 77, failureRisk: 'Low',      failureRiskScore: 0.11, waterCut: 39, sor: 3.3, lastUpdated: '14:32', cssPhase: 'Production', field: 'Baghewala', wellType: 'CSS + SRP', spudDate: '19 Oct 2020', pumpDepth: 810, reservoir: 'Baghewala Sand', latitude: 29.148, longitude: 72.395
  },
  {
    id: 'BGW-012', name: 'BGW-012', status: 'Producing',  oilProduction: 25.9, temperature: 77, pressure: 5.6, rodLoad: 5.6, pumpEfficiency: 69, failureRisk: 'Medium',   failureRiskScore: 0.24, waterCut: 47, sor: 3.8, lastUpdated: '14:31', cssPhase: 'Soak',       field: 'Baghewala', wellType: 'CSS + SRP', spudDate: '08 Jan 2021', pumpDepth: 825, reservoir: 'Baghewala Sand', latitude: 29.143, longitude: 72.388
  },
  {
    id: 'BGW-013', name: 'BGW-013', status: 'Shut-in',    oilProduction: 0,    temperature: 58, pressure: 3.2, rodLoad: 0.0, pumpEfficiency: 0,  failureRisk: 'Medium',   failureRiskScore: 0.30, waterCut: 0,  sor: 0,   lastUpdated: '08:15', cssPhase: 'Steam Inj', field: 'Baghewala', wellType: 'CSS + SRP', spudDate: '22 Apr 2021', pumpDepth: 845, reservoir: 'Baghewala Sand', latitude: 29.140, longitude: 72.382
  },
  {
    // BGW-014 — Main demonstration well — declining scenario
    id: 'BGW-014', name: 'BGW-014', status: 'Attention',  oilProduction: 24.8, temperature: 74, pressure: 31.4, rodLoad: 6.3, pumpEfficiency: 62, failureRisk: 'High',  failureRiskScore: 0.184, waterCut: 42, sor: 3.8, lastUpdated: '14:32', cssPhase: 'Production (Cycle 14)', field: 'Baghewala', wellType: 'CSS + SRP', spudDate: '12 Mar 2018', pumpDepth: 852, reservoir: 'Baghewala Sand Member A', latitude: 29.141, longitude: 72.387
  },
];

// ─── BGW-014 Production History ────────────────────────────────────────────
export const BGW014_PRODUCTION: ProductionDataPoint[] = [
  { date: '01 Oct', oilRate: 42.1, waterRate: 28.0, sor: 2.8, temperature: 86, rodLoad: 4.8 },
  { date: '05 Oct', oilRate: 40.3, waterRate: 29.1, sor: 3.0, temperature: 84, rodLoad: 5.0 },
  { date: '08 Oct', oilRate: 38.6, waterRate: 30.2, sor: 3.1, temperature: 83, rodLoad: 5.1 },
  { date: '12 Oct', oilRate: 36.8, waterRate: 31.5, sor: 3.2, temperature: 81, rodLoad: 5.3 },
  { date: '15 Oct', oilRate: 35.2, waterRate: 32.4, sor: 3.3, temperature: 80, rodLoad: 5.5 },
  { date: '19 Oct', oilRate: 33.4, waterRate: 33.2, sor: 3.4, temperature: 78, rodLoad: 5.7 },
  { date: '22 Oct', oilRate: 31.2, waterRate: 34.1, sor: 3.5, temperature: 77, rodLoad: 5.8 },
  { date: '26 Oct', oilRate: 29.5, waterRate: 35.0, sor: 3.6, temperature: 76, rodLoad: 5.9 },
  { date: '29 Oct', oilRate: 27.8, waterRate: 35.8, sor: 3.7, temperature: 75, rodLoad: 6.1 },
  { date: '01 Nov', oilRate: 26.4, waterRate: 36.2, sor: 3.8, temperature: 74, rodLoad: 6.2 },
  { date: '04 Nov', oilRate: 24.8, waterRate: 36.8, sor: 3.8, temperature: 74, rodLoad: 6.3 },
];

// ─── BGW-014 CSS Cycles ────────────────────────────────────────────────────
export const BGW014_CSS_CYCLES: CSSCycle[] = [
  { cycleNumber: 11, injectionDate: '15 Jan 2024', steamVolume: 1200, injectionPressure: 45, soakTime: 22, productionRate: 52.4, peakProduction: 68.2, sor: 2.6, status: 'Completed' },
  { cycleNumber: 12, injectionDate: '28 Apr 2024', steamVolume: 950,  injectionPressure: 43, soakTime: 20, productionRate: 44.6, peakProduction: 58.1, sor: 3.1, status: 'Completed' },
  { cycleNumber: 13, injectionDate: '08 Jul 2024', steamVolume: 850,  injectionPressure: 42, soakTime: 18, productionRate: 38.2, peakProduction: 49.5, sor: 3.5, status: 'Completed' },
  { cycleNumber: 14, injectionDate: '18 Nov 2024', steamVolume: 800,  injectionPressure: 42, soakTime: 18, productionRate: 24.8, peakProduction: 38.0, sor: 3.8, status: 'Active' },
];

// ─── BGW-014 SRP Operations ────────────────────────────────────────────────
export const BGW014_SRP: SRPOperation[] = [
  { timestamp: '14:32', spm: 10, strokeLength: 72, vfd: 38, rodLoad: 6.3, pumpEfficiency: 62, fluidLevel: 320 },
  { timestamp: '14:17', spm: 10, strokeLength: 72, vfd: 38, rodLoad: 6.1, pumpEfficiency: 63, fluidLevel: 318 },
  { timestamp: '14:02', spm: 10, strokeLength: 72, vfd: 38, rodLoad: 6.2, pumpEfficiency: 62, fluidLevel: 321 },
  { timestamp: '13:47', spm: 10, strokeLength: 72, vfd: 37, rodLoad: 6.0, pumpEfficiency: 64, fluidLevel: 315 },
  { timestamp: '13:32', spm: 10, strokeLength: 72, vfd: 37, rodLoad: 5.9, pumpEfficiency: 65, fluidLevel: 312 },
];

// ─── BGW-014 Default Twin State ────────────────────────────────────────────
export const BGW014_TWIN_STATE: TwinState = {
  wellId: 'BGW-014',
  timestamp: new Date().toISOString(),
  reservoir: {
    temperature: 61.4,
    pressure: 28.5,
    viscosity: 1820,
    steamPenetration: 42,
    oilSaturation: 0.34,
    depth: 852,
  },
  wellbore: {
    temperature: 58.2,
    pressure: 31.4,
    flowRate: 52.3,
    depth: 852,
    casingDiameter: 177.8,
    tubingDiameter: 88.9,
  },
  css: {
    steamVolume: 800,
    injectionPressure: 42,
    soakTime: 18,
    cycleNumber: 14,
    steamQuality: 72,
  },
  srp: {
    spm: 10,
    strokeLength: 72,
    vfd: 38,
    rodLoad: 6.3,
    pumpEfficiency: 62,
    fluidLevel: 320,
  },
  production: {
    oilRate: 24.8,
    waterCut: 42,
    sor: 3.8,
    grossRate: 42.8,
    energyConsumption: 42,
  },
  health: {
    failureRisk: 0.184,
    rodCondition: 'Fair',
    pumpCondition: 'Degraded',
    overallHealth: 63,
  },
};

// ─── Field-level Alerts ────────────────────────────────────────────────────
export const ALERTS: Alert[] = [
  { id: 'ALT-001', wellId: 'BGW-014', wellName: 'BGW-014', message: 'Elevated rod loading detected — 6.3 kN (threshold: 6.0 kN)', severity: 'HIGH',     timestamp: '12 min ago', acknowledged: false },
  { id: 'ALT-002', wellId: 'BGW-021', wellName: 'BGW-021', message: 'Reservoir temperature declining — 3.2°C below forecast', severity: 'MEDIUM',   timestamp: '34 min ago', acknowledged: false },
  { id: 'ALT-003', wellId: 'BGW-007', wellName: 'BGW-007', message: 'Production below expected range — 18.4 BPD vs 26 BPD forecast', severity: 'MEDIUM', timestamp: '1 hr ago',   acknowledged: false },
  { id: 'ALT-004', wellId: 'BGW-003', wellName: 'BGW-003', message: 'Sensor anomaly detected — pressure transducer P-3B', severity: 'LOW',      timestamp: '2 hrs ago',  acknowledged: true  },
  { id: 'ALT-005', wellId: 'BGW-010', wellName: 'BGW-010', message: 'Pump efficiency below 60% — immediate review recommended', severity: 'HIGH',     timestamp: '3 hrs ago',  acknowledged: false },
];

// ─── Field Summary Stats ────────────────────────────────────────────────────
export const FIELD_STATS = {
  totalProduction: 2840,
  activeWells: 23,
  averageSOR: 3.6,
  energyConsumption: 42,
  equipmentHealth: 78,
  highRiskWells: 3,
  productionDelta: '+6.4%',
  sorDelta: '-10.2%',
  energyDelta: '-7.1%',
};

// ─── Field Production Trend ────────────────────────────────────────────────
export const FIELD_PRODUCTION_TREND = [
  { date: '01 Oct', production: 2620, target: 2700 },
  { date: '05 Oct', production: 2680, target: 2700 },
  { date: '08 Oct', production: 2710, target: 2700 },
  { date: '12 Oct', production: 2750, target: 2720 },
  { date: '15 Oct', production: 2780, target: 2720 },
  { date: '19 Oct', production: 2800, target: 2740 },
  { date: '22 Oct', production: 2820, target: 2760 },
  { date: '26 Oct', production: 2835, target: 2780 },
  { date: '29 Oct', production: 2828, target: 2800 },
  { date: '01 Nov', production: 2845, target: 2820 },
  { date: '04 Nov', production: 2840, target: 2840 },
];
