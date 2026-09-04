// ─── Auth / RBAC ──────────────────────────────────────────────────────────
export type UserRole = 'production_engineer' | 'field_manager' | 'administrator';

export interface User {
  id: string;
  name: string;
  employeeId: string;
  role: UserRole;
  designation: string;
  department: string;
  lastLogin: string;
}

// ─── Well ──────────────────────────────────────────────────────────────────
export type WellStatus = 'Producing' | 'Attention' | 'Critical' | 'Shut-in';
export type RiskLevel  = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Well {
  id: string;
  name: string;
  status: WellStatus;
  oilProduction: number;   // BPD
  temperature: number;     // °C
  pressure: number;        // bar
  rodLoad: number;         // kN
  pumpEfficiency: number;  // %
  failureRisk: RiskLevel;
  failureRiskScore: number; // 0–1
  waterCut: number;        // %
  sor: number;
  lastUpdated: string;
  cssPhase: string;
  field: string;
  wellType: string;
  spudDate: string;
  pumpDepth: number;       // m
  reservoir: string;
  latitude: number;
  longitude: number;
}

// ─── Production Data ───────────────────────────────────────────────────────
export interface ProductionDataPoint {
  date: string;
  oilRate: number;
  waterRate: number;
  sor: number;
  temperature: number;
  rodLoad: number;
}

// ─── CSS Cycle ────────────────────────────────────────────────────────────
export interface CSSCycle {
  cycleNumber: number;
  injectionDate: string;
  steamVolume: number;     // tonnes
  injectionPressure: number; // bar
  soakTime: number;        // hours
  productionRate: number;  // BPD
  peakProduction: number;  // BPD
  sor: number;
  status: 'Completed' | 'Active' | 'Planned';
}

// ─── SRP Operation ────────────────────────────────────────────────────────
export interface SRPOperation {
  timestamp: string;
  spm: number;
  strokeLength: number;  // in
  vfd: number;           // Hz
  rodLoad: number;       // kN
  pumpEfficiency: number;
  fluidLevel: number;    // m
}

// ─── Alert ────────────────────────────────────────────────────────────────
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Alert {
  id: string;
  wellId: string;
  wellName: string;
  message: string;
  severity: AlertSeverity;
  timestamp: string;
  acknowledged: boolean;
}

// ─── Digital Twin State ────────────────────────────────────────────────────
export interface TwinState {
  wellId: string;
  timestamp: string;
  reservoir: {
    temperature: number;     // °C
    pressure: number;        // bar
    viscosity: number;       // cP
    steamPenetration: number; // %
    oilSaturation: number;   // fraction
    depth: number;           // m
  };
  wellbore: {
    temperature: number;
    pressure: number;
    flowRate: number;        // m³/day
    depth: number;
    casingDiameter: number;
    tubingDiameter: number;
  };
  css: {
    steamVolume: number;       // tonnes
    injectionPressure: number; // bar
    soakTime: number;          // hours
    cycleNumber: number;
    steamQuality: number;      // %
  };
  srp: {
    spm: number;
    strokeLength: number;      // in
    vfd: number;               // Hz
    rodLoad: number;           // kN
    pumpEfficiency: number;    // %
    fluidLevel: number;        // m
  };
  production: {
    oilRate: number;           // BPD
    waterCut: number;          // %
    sor: number;
    grossRate: number;         // BPD
    energyConsumption: number; // kWh/bbl
  };
  health: {
    failureRisk: number;       // 0–1
    rodCondition: string;
    pumpCondition: string;
    overallHealth: number;     // 0–100
  };
}

// ─── Simulation Result ────────────────────────────────────────────────────
export interface SimulationParams {
  steamVolume: number;
  injectionPressure: number;
  soakTime: number;
  spm: number;
  strokeLength: number;
  vfd: number;
}

export interface SimulationResult {
  id: string;
  timestamp: string;
  wellId: string;
  params: SimulationParams;
  baseline: TwinState;
  simulated: TwinState;
  improvements: {
    oilRate: number;
    sor: number;
    energy: number;
    rodLoad: number;
    pumpEfficiency: number;
    failureRisk: number;
  };
  confidence: number;
  safetyCheck: boolean;
  recommendation?: Recommendation;
}

// ─── Recommendation ────────────────────────────────────────────────────────
export type RecommendationStatus = 'Pending' | 'Approved' | 'Rejected' | 'Modification Requested';

export interface Recommendation {
  id: string;
  wellId: string;
  wellName: string;
  engineer: string;
  engineerId: string;
  createdAt: string;
  simulationId: string;
  title: string;
  description: string;
  cssChanges: Partial<SimulationParams>;
  srpChanges: Partial<SimulationParams>;
  expectedImpact: {
    oilRate: number;
    sor: number;
    energy: number;
    failureRisk: number;
  };
  confidence: number;
  riskLevel: RiskLevel;
  status: RecommendationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerComment?: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  entity: string;
  entityId: string;
  wellId?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  ipAddress: string;
  sessionId: string;
}

// ─── AI Prediction ────────────────────────────────────────────────────────
export interface ProductionForecast {
  date: string;
  actual?: number;
  predicted: number;
  lower: number;
  upper: number;
}

export interface FailurePrediction {
  probability: number;
  riskLevel: RiskLevel;
  daysToFailure: number | null;
  drivers: Array<{ feature: string; importance: number; direction: 'positive' | 'negative' }>;
  confidence: number;
}

export interface AnomalyRecord {
  id: string;
  timestamp: string;
  parameter: string;
  value: number;
  expected: number;
  deviation: number;
  severity: AlertSeverity;
  status: 'Active' | 'Resolved' | 'Acknowledged';
}

export interface SHAPFeature {
  feature: string;
  value: number;      // SHAP value
  magnitude: number;  // absolute
  direction: 'positive' | 'negative';
}
