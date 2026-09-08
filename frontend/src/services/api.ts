/**
 * Polaris Frontend — API Client
 * Centralized HTTP client connected to the backend FastAPI service.
 */

const envApiUrl = (import.meta as any).env?.VITE_API_URL || '';
const API_BASE = envApiUrl ? envApiUrl.replace(/\/$/, '') : '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('polaris_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('polaris_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('polaris_token');
  localStorage.removeItem('polaris_user');
}

// Client-side in-flight deduplication & short-TTL cache for instant page navigation
const inFlightRequests = new Map<string, Promise<any>>();
const clientCache = new Map<string, { data: any; expiry: number }>();
const CLIENT_CACHE_TTL_MS = 10_000; // 10 seconds

export function clearApiCache(): void {
  clientCache.clear();
  inFlightRequests.clear();
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const cacheKey = `${endpoint}`;

  if (isGet) {
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.data as T;
    }
    const inFlight = inFlightRequests.get(cacheKey);
    if (inFlight) {
      return inFlight as Promise<T>;
    }
  } else {
    // Mutations immediately invalidate cached read data
    clientCache.clear();
  }

  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include', // transmits HttpOnly refresh cookie
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          const errText = await response.text();
          if (errText && errText.trim().length > 0) {
            try {
              errorData = JSON.parse(errText);
            } catch {
              errorData = { error: { message: `Server error (${response.status}): ${errText.slice(0, 120)}` } };
            }
          }
        } catch {
          errorData = { error: { message: response.statusText || `Request failed with status ${response.status}` } };
        }

        const message = errorData.error?.message || errorData.detail || `Server error (${response.status}). Please verify backend is running.`;
        const err = new Error(message) as Error & { code?: string; status?: number };
        err.code = errorData.error?.code;
        err.status = response.status;
        throw err;
      }

      const text = await response.text();
      let data: any = {};
      if (text && text.trim().length > 0) {
        try {
          data = JSON.parse(text);
        } catch {
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            throw new Error('API request routed to HTML page. Please verify your Render Static Site rewrite rule for /api/* points to your backend URL.');
          }
          throw new Error(`Server returned non-JSON response: ${text.slice(0, 100)}`);
        }
      } else {
        throw new Error('Backend returned an empty response. The service may still be waking up on Render Free tier. Please wait 30 seconds and retry.');
      }

      if (isGet) {
        clientCache.set(cacheKey, { data, expiry: Date.now() + CLIENT_CACHE_TTL_MS });
      }
      return data as T;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  if (isGet) {
    inFlightRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
}

// ── Authentication API ────────────────────────────────────────────────────────
export const authApi = {
  login: async (employee_id: string, password: string) => {
    return request<{
      success: boolean;
      data: { access_token: string; token_type: string; expires_in: number };
      user: {
        id: string;
        employee_id: string;
        full_name: string;
        role: 'ADMIN' | 'OPERATOR';
        status: 'ACTIVE' | 'DISABLED' | 'LOCKED';
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ employee_id, password }),
    });
  },

  me: async () => {
    return request<{
      success: boolean;
      user: {
        id: string;
        employee_id: string;
        full_name: string;
        role: 'ADMIN' | 'OPERATOR';
        status: string;
      };
    }>('/auth/me');
  },

  logout: async () => {
    return request<{ success: boolean; message: string }>('/auth/logout', {
      method: 'POST',
    });
  },
};

// ── Admin Management API ──────────────────────────────────────────────────────
export interface BackendOperator {
  id: string;
  employee_id: string;
  full_name: string;
  role: 'ADMIN' | 'OPERATOR';
  status: 'ACTIVE' | 'DISABLED' | 'LOCKED';
  last_login_at: string | null;
  created_at: string;
}

export interface BackendAuditLog {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_user_id: string | null;
  resource_type: string | null;
  ip_address: string | null;
  timestamp: string;
  metadata: any;
}

export const adminApi = {
  listOperators: async (page = 1, limit = 50) => {
    return request<{
      success: boolean;
      data: BackendOperator[];
      total: number;
      page: number;
      limit: number;
      pages: number;
    }>(`/admin/operators?page=${page}&limit=${limit}`);
  },

  createOperator: async (payload: {
    employee_id: string;
    email?: string;
    full_name: string;
    password: string;
  }) => {
    return request<{
      success: boolean;
      data: BackendOperator;
    }>('/admin/operators', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateStatus: async (operatorId: string, status: 'ACTIVE' | 'DISABLED' | 'LOCKED') => {
    return request<{
      success: boolean;
      message: string;
    }>(`/admin/operators/${operatorId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  resetPassword: async (operatorId: string, new_password: string) => {
    return request<{
      success: boolean;
      message: string;
    }>(`/admin/operators/${operatorId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password }),
    });
  },

  listAuditLogs: async (page = 1, limit = 50) => {
    return request<{
      success: boolean;
      data: BackendAuditLog[];
      total: number;
      page: number;
      limit: number;
      pages: number;
    }>(`/admin/audit-logs?page=${page}&limit=${limit}`);
  },
};

// ── Wells & Field API ─────────────────────────────────────────────────────────

export interface BackendWell {
  id: string;
  name: string;
  status: string;
  oilProduction: number;
  temperature: number;
  pressure: number;
  rodLoad: number;
  pumpEfficiency: number;
  failureRisk: string;
  failureRiskScore: number;
  waterCut: number;
  sor: number;
  lastUpdated: string;
  cssPhase: string;
  field: string;
  wellType: string;
  spudDate: string;
  pumpDepth: number;
  reservoir: string;
  latitude: number;
  longitude: number;
  oilApi?: number;
  automationType?: string;
  wellDepthM?: number;
  initialPressureBar?: number;
  initialTemperatureC?: number;
}

export type WellItem = BackendWell;
export type ApprovalItem = BackendApproval;
export type SimulationPreset = any;

export interface FailureEvent {
  id: number | string;
  well_id?: string;
  event_type: string;
  description: string;
  root_cause?: string;
  downtime_hours: number;
  severity: string;
  created_at: string;
  status: string;
}

export interface BackendProductionPoint {
  date: string;
  oilRate: number;
  waterRate: number;
  sor: number;
  bottomholePressure: number;
  waterCut: number;
  totalFluidRate: number;
  energyConsumption: number;
  cumulativeOil: number;
}

export interface BackendCSSCycle {
  cycleId: string;
  cycleNumber: number;
  steamVolumeTon: number;
  injectionPressureBar: number;
  steamTemperatureC: number;
  injectionDurationHr: number;
  soakTimeHr: number;
  productionCutoff: string;
  postSteamTemperatureC: number;
  status: string;
}

export interface BackendSRPReading {
  timestamp: string;
  spm: number;
  strokeLengthIn: number;
  vfdFrequencyHz: number;
  rodLoadMinKN: number;
  rodLoadMaxKN: number;
  polishedRodLoadKN: number;
  pumpFillagePct: number;
  pumpEfficiencyPct: number;
  motorPowerKW: number;
  readingType: string;
}

export interface BackendAlert {
  id: string;
  wellId: string;
  wellName: string;
  message: string;
  severity: string;
  alertType: string;
  category: string;
  rootCause: string;
  recommendedAction: string;
  metric: string;
  threshold: string;
  actual: string;
  timestamp: string;
  acknowledged: boolean;
}

export const wellsApi = {
  listWells: async (params?: { field?: string; status?: string }) => {
    const qs = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; data: BackendWell[]; total: number }>(
      `/wells${qs ? `?${qs}` : ''}`
    );
  },

  fieldStats: async () => {
    return request<{
      success: boolean;
      data: {
        totalProduction: number;
        activeWells: number;
        averageSOR: number;
        averageWaterCut?: number;
        totalSteamInjectedTon?: number;
        energyConsumption: number;
        equipmentHealth: number;
        highRiskWells: number;
        productionDelta: string;
        sorDelta: string;
        energyDelta: string;
        asOfDate: string | null;
      };
    }>('/wells/field-stats');
  },

  getWell: async (wellId: string) => {
    return request<{ success: boolean; data: BackendWell }>(`/wells/${wellId}`);
  },

  getProduction: async (wellId: string, days = 60) => {
    return request<{ success: boolean; data: BackendProductionPoint[]; total: number }>(
      `/wells/${wellId}/production?days=${days}`
    );
  },

  getCSSCycles: async (wellId: string) => {
    return request<{ success: boolean; data: BackendCSSCycle[]; total: number }>(
      `/wells/${wellId}/css-cycles`
    );
  },

  getSRP: async (wellId: string, days = 30) => {
    return request<{ success: boolean; data: BackendSRPReading[]; total: number }>(
      `/wells/${wellId}/srp?days=${days}`
    );
  },
  getSrp: async (wellId: string, days = 30) => {
    return request<{ success: boolean; data: BackendSRPReading[]; total: number }>(
      `/wells/${wellId}/srp?days=${days}`
    );
  },

  getTwinState: async (wellId: string) => {
    return request<{ success: boolean; data: any }>(`/wells/${wellId}/twin-state`);
  },

  getTelemetry: async (wellId: string, days = 30) => {
    return request<{ success: boolean; data: any[]; total: number }>(
      `/wells/${wellId}/telemetry?days=${days}`
    );
  },

  getFailureEvents: async (wellId: string, limit = 20) => {
    return request<{ success: boolean; data: any[]; total: number }>(
      `/wells/${wellId}/failure-events?limit=${limit}`
    );
  },

  fieldProductionTrend: async (days = 30) => {
    return request<{ success: boolean; data: { date: string; production: number; target: number }[]; total: number }>(
      `/wells/field/production-trend?days=${days}`
    );
  },

  getDynamometerCards: async (wellId: string, cycleId?: string, limit = 20) => {
    const qs = cycleId ? `?cycle_id=${encodeURIComponent(cycleId)}&limit=${limit}` : `?limit=${limit}`;
    return request<{ success: boolean; data: BackendDynamometerCard[]; total: number }>(
      `/wells/${wellId}/dynamometer-cards${qs}`
    );
  },

  getLatestDynamometerCard: async (wellId: string) => {
    return request<{ success: boolean; data: BackendDynamometerCard }>(
      `/wells/${wellId}/dynamometer-cards/latest`
    );
  },

  getDynamometerCardLatest: async (wellId: string) => {
    return request<{ success: boolean; data: BackendDynamometerCard }>(
      `/wells/${wellId}/dynamometer-cards/latest`
    );
  },

  getViscosityProfile: async (wellId: string) => {
    return request<{ success: boolean; data: ViscosityProfile }>(
      `/wells/${wellId}/viscosity-profile`
    );
  },
};

// ── Alerts API ────────────────────────────────────────────────────────────────

export const alertsApi = {
  listAlerts: async (params?: {
    well_id?: string;
    severity?: string;
    acknowledged?: boolean;
    limit?: number;
    page?: number;
  }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params || {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      )
    ).toString();
    return request<{
      success: boolean;
      data: BackendAlert[];
      total: number;
      page: number;
      limit: number;
      pages: number;
    }>(`/alerts${qs ? `?${qs}` : ''}`);
  },

  acknowledgeAlert: async (alertId: string) => {
    return request<{ success: boolean; data: BackendAlert }>(
      `/alerts/${alertId}/acknowledge`,
      { method: 'PATCH' }
    );
  },
};

// ── Simulation Laboratory API ─────────────────────────────────────────────────

export interface SimulationResultRow {
  parameter: string;
  current: string | number;
  scenario: string | number;
  change: string;
  isPositive: boolean;
}

export interface SimulationResponse {
  wellId: string;
  scenarioName: string;
  scenarioMode: string;
  parameters: {
    steamVolumeTon: number;
    injectionPressureBar: number;
    soakTimeHr: number;
    spm: number;
    strokeLengthIn: number;
    vfdFrequencyHz: number;
  };
  results: SimulationResultRow[];
  recommendation: {
    status: string;
    message: string;
    confidenceScore: number;
  };
}

export const simulationApi = {
  getPreset: async (wellId: string) => {
    return request<{
      success: boolean;
      data: {
        wellId: string;
        wellName: string;
        reservoir: string;
        current: {
          steamVolumeTon: number;
          injectionPressureBar: number;
          soakTimeHr: number;
          spm: number;
          strokeLengthIn: number;
          vfdFrequencyHz: number;
          oilProduction: number;
          sor: number;
          energy: number;
          failureRisk: number;
          pumpEfficiency: number;
        };
        optimized: {
          steamVolumeTon: number;
          injectionPressureBar: number;
          soakTimeHr: number;
          spm: number;
          strokeLengthIn: number;
          vfdFrequencyHz: number;
        };
      };
    }>(`/simulation/preset/${wellId}`);
  },

  runSimulation: async (payload: {
    well_id: string;
    scenario_name?: string;
    scenario_mode?: string;
    steam_volume_ton: number;
    injection_pressure_bar: number;
    soak_time_hr: number;
    spm: number;
    stroke_length_in: number;
    vfd_frequency_hz: number;
  }) => {
    return request<{
      success: boolean;
      data: SimulationResponse;
    }>('/simulation/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getPostCssSchedule: async (wellId: string, days = 60) => {
    return request<{ success: boolean; data: PostCssScheduleResponse }>(
      `/simulation/post-css-schedule/${wellId}?days=${days}`
    );
  },

  injectEdgeAnomaly: async (payload: { well_id: string; anomaly_type: string; severity?: string }) => {
    return request<{ success: boolean; message: string; alert: any }>(
      '/simulation/edge-anomaly-inject',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  getEdgeStream: async (wellId: string) => {
    return request<{ success: boolean; data: EdgeTelemetryStream }>(
      `/simulation/edge-stream/${wellId}`
    );
  },
};

// ── Dynamometer Card & Heavy Oil Interfaces ──────────────────────────────────

export interface DynamometerPoint {
  position: number;
  load: number;
}

export interface BackendDynamometerCard {
  cardId: string;
  wellId: string;
  timestamp: string;
  cssCycleId: string | null;
  strokeLengthIn: number;
  spm: number;
  peakLoadKN: number;
  minLoadKN: number;
  cardAreaKNIn: number;
  diagnosticLabel: string;
  rodFloatingRisk: number;
  fluidPoundRisk: number;
  surfacePoints: DynamometerPoint[];
  downholePoints: DynamometerPoint[];
}

export interface ViscosityProfile {
  wellId: string;
  currentTempC: number;
  currentViscosityCP: number;
  currentSPM: number;
  strokeLengthIn: number;
  spmCrit: number;
  spmSafe: number;
  buoyantRodWeightKN: number;
  status: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: string;
  referenceCurve: { tempC: number; viscosityCP: number; spmCrit: number }[];
}

export interface PostCssScheduleStage {
  name: string;
  days: string;
  tempRange: string;
  viscosityRange: string;
  action: string;
  spmRange: string;
}

export interface PostCssScheduleDay {
  day: number;
  phase: string;
  phaseNumber: number;
  temperatureC: number;
  viscosityCP: number;
  spmCrit: number;
  recommendedSPM: number;
  recommendedVFDHz: number;
  oilRateBpd: number;
  cumulativeOilBbl: number;
  sor: number;
  floatingRiskPct: number;
}

export interface PostCssScheduleResponse {
  wellId: string;
  steamVolumeTon: number;
  peakTempC: number;
  days: number;
  summary: {
    cumulativeOilBbl: number;
    baselineCumulativeOilBbl: number;
    incrementalOilPct: string;
    initialSOR: number;
    finalSOR: number;
    sorReductionPct: string;
    rodFailuresPrevented: number;
    stages: PostCssScheduleStage[];
  };
  dailyData: PostCssScheduleDay[];
}

export interface EdgeTelemetryStream {
  wellId: string;
  gateway: string;
  protocol: string;
  timestamp: string;
  telemetry: {
    reservoirTempC: number;
    wellheadTempC: number;
    viscosityCP: number;
    spm: number;
    spmCrit: number;
    vibrationMmS: number;
    motorPowerKW: number;
    motorCurrentA: number;
    isFloatingRisk: boolean;
  };
}

// ── Approvals & Recommendations API ───────────────────────────────────────────

export interface BackendApproval {
  id: string;
  date: string;
  wellId: string;
  recommendation: string;
  impact: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedBy: string;
  comment: string;
  setpoints: any;
  reviewedBy?: string | null;
  createdAt?: string | null;
}

export const approvalsApi = {
  listApprovals: async (params?: { status?: string; well_id?: string }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params || {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      )
    ).toString();
    return request<{
      success: boolean;
      data: BackendApproval[];
      total: number;
      counts: { pending: number; approved: number; rejected: number };
    }>(`/approvals${qs ? `?${qs}` : ''}`);
  },

  createApproval: async (payload: {
    well_id: string;
    recommendation: string;
    impact: string;
    submitted_by?: string;
    comment?: string;
    setpoints?: any;
  }) => {
    return request<{
      success: boolean;
      data: { id: string; wellId: string; status: string; message: string };
    }>('/approvals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateStatus: async (
    approvalId: string,
    status: 'Approved' | 'Rejected' | 'Pending',
    comment?: string,
    reviewedBy?: string
  ) => {
    return request<{
      success: boolean;
      message: string;
      data: BackendApproval;
    }>(`/approvals/${approvalId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, comment, reviewed_by: reviewedBy }),
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AI / ML Intelligence API
// ─────────────────────────────────────────────────────────────────────────────

export interface ForecastDay {
  day: number;
  predicted: number;
  lower90: number;
  upper90: number;
}

export interface ShapValue {
  feature: string;
  shapValue: number;
  absContrib: number;
  pctContrib: number;
}

export interface ForecastResult {
  wellId: string;
  horizon: number;
  dailySeries: ForecastDay[];
  shapValues: ShapValue[];
  modelType: string;
  rmse: number | null;
  confidenceLevel: string;
}

export interface AnomalyReading {
  timestamp: string;
  anomalyScore: number;
  isAnomaly: boolean;
  features: Record<string, number>;
}

export interface AnomalyScanResult {
  wellId: string;
  totalReadings: number;
  anomalyCount: number;
  anomalyRate: number;
  readings: AnomalyReading[];
}

export interface PosteriorPdfPoint {
  x: number;
  density: number;
}

export interface FailureRiskResult {
  wellId: string;
  priorAlpha: number;
  priorBeta: number;
  posteriorAlpha: number;
  posteriorBeta: number;
  failureProbMean: number;
  failureProbMAP: number;
  ci90Lower: number;
  ci90Upper: number;
  riskCategory: 'HIGH' | 'MEDIUM' | 'LOW';
  recentFailures: number;
  observationDays: number;
  posteriorPdfCurve: PosteriorPdfPoint[];
  method: string;
  latestWaterCut?: number;
  latestSOR?: number;
}

export interface PIMLTwinResult {
  wellId: string;
  physicsBpd: number;
  residualCorrection: number;
  pimlBpd: number;
  viscosityCp: number;
  uncertaintyBpd: number;
  ci90Lower: number;
  ci90Upper: number;
  thermalStage: string;
  modelType: string;
  pimlImprovement: string;
  actualBpd: number | null;
  physicsErrorPct: number | null;
  pimlErrorPct: number | null;
  inputFeatures: Record<string, number>;
}

export interface AIStatusResult {
  mlEngineReady: boolean;
  pimlTwinReady: boolean;
  xgboostModel: boolean;
  isolationForest: boolean;
  shapExplainer: boolean;
  pimlResidual: boolean;
}

export const aiApi = {
  /** Check model readiness */
  status: () =>
    request<{ success: boolean; data: AIStatusResult }>('/ai/status'),

  /** XGBoost production forecast (1–30 days) */
  forecast: (wellId: string, days: number = 14) =>
    request<{ success: boolean; data: ForecastResult }>(
      `/ai/forecast/${wellId}?days=${days}`
    ),

  /** Isolation Forest anomaly scan of last N days of telemetry */
  anomalyScan: (wellId: string, days: number = 30) =>
    request<{ success: boolean; data: AnomalyScanResult }>(
      `/ai/anomaly-scan/${wellId}?days=${days}`
    ),

  /** SHAP feature importance for latest reading */
  explain: (wellId: string) =>
    request<{ success: boolean; data: { wellId: string; shapValues: ShapValue[]; baseValue: number; method: string } }>(
      `/ai/explain/${wellId}`
    ),

  /** Bayesian failure risk with 90% credible interval */
  failureRisk: (wellId: string, observationDays: number = 30) =>
    request<{ success: boolean; data: FailureRiskResult }>(
      `/ai/failure-risk/${wellId}?observation_days=${observationDays}`
    ),

  /** Physics-Informed ML twin state */
  pimlTwin: (wellId: string) =>
    request<{ success: boolean; data: PIMLTwinResult }>(
      `/ai/piml-twin/${wellId}`
    ),

  /** Score a single telemetry reading for anomaly */
  detectAnomaly: (payload: {
    well_id: string;
    reservoir_temperature_c?: number;
    vibration_mm_s?: number;
    motor_power_kw?: number;
    motor_current_a?: number;
    pressure_bar?: number;
    flow_rate_bpd?: number;
  }) =>
    request<{ success: boolean; data: { wellId: string; anomalyScore: number; isAnomaly: boolean } }>(
      '/ai/anomaly-detect',
      { method: 'POST', body: JSON.stringify(payload) }
    ),
};

// ── Heavy Oil AI/ML Engine API ───────────────────────────────────────────────

export interface MLModelStatusResult {
  models: Record<string, {
    status: string;
    sample_count: number;
    metrics: Record<string, number>;
    last_trained?: string;
    artifact_path?: string;
  }>;
  overall_system_status: string;
  trained_artifacts_directory: string;
}

export interface CSSParetoCandidate {
  id: number;
  name: string;
  steam_volume_ton: number;
  injection_pressure_bar: number;
  soak_time_hr: number;
  predicted_cumulative_oil_bbl: number;
  predicted_sor: number;
  estimated_steam_cost_usd: number;
  estimated_revenue_usd: number;
  net_economic_value_usd: number;
  tradeoff_summary: string;
}

export interface CSSOptimizeResult {
  well_id: string;
  cycle_number: number;
  recommended_candidate_id: number;
  candidates: CSSParetoCandidate[];
  explanation: string;
}

export interface DailyThermalForecastPoint {
  day: number;
  date?: string;
  temperature_c: number;
  physics_temperature_c: number;
  residual_correction_c: number;
  viscosity_cp: number;
  thermal_stage: string;
}

export interface ReservoirPredictResult {
  well_id: string;
  peak_temperature_c: number;
  heated_radius_m: number;
  heat_injected_mmbtu: number;
  cooling_half_life_days: number;
  forecast: DailyThermalForecastPoint[];
}

export interface SRPOptimizeResult {
  well_id: string;
  current_temperature_c: number;
  walther_viscosity_cp: number;
  terminal_velocity_m_s: number;
  spm_crit_theoretical: number;
  spm_crit_safe: number;
  current_spm: number;
  rod_floating_risk_pct: number;
  recommended_spm: number;
  recommended_vfd_hz: number;
  stages: Array<{
    stage_number: number;
    stage_name: string;
    day_range: string;
    temperature_range_c: string;
    viscosity_range_cp: string;
    spm_recommended: number;
    vfd_hz_recommended: number;
    rod_float_risk_level: string;
    operational_notes: string;
  }>;
}

export interface FaultDetectResult {
  well_id: string;
  primary_fault: string;
  confidence_pct: number;
  severity: string;
  probabilities: {
    rod_floating: number;
    impact_loading: number;
    pump_unsetting: number;
    gas_interference: number;
    normal_operation: number;
  };
  mtbf_days_estimate: number;
  recommended_actions: string[];
}

export interface WellInsightsResult {
  well_id: string;
  reservoir_temperature_c: number;
  viscosity_cp: number;
  thermal_phase: string;
  spm_actual: number;
  spm_crit_safe: number;
  rod_float_risk_pct: number;
  forecast_60d_cum_oil_bbl: number;
  forecast_sor: number;
  fault_diagnosis: string;
  fault_confidence_pct: number;
  recommended_css_volume_ton: number;
  recommended_spm: number;
  alerts_count: number;
}

export const mlApi = {
  /** Get metrics, readiness, and sample counts for all models */
  modelsStatus: () =>
    request<MLModelStatusResult>('/ml/models/status'),

  /** Trigger background training across all models */
  triggerTrain: () =>
    request<{ status: string; message: string; models: string[] }>('/ml/train', {
      method: 'POST',
    }),

  /** Optimize Cyclic Steam Stimulation (CSS) parameters */
  optimizeCss: (payload: {
    well_id: string;
    current_cycle_number?: number;
    steam_cost_usd_per_ton?: number;
    oil_price_usd_bbl?: number;
    min_steam_volume_ton?: number;
    max_steam_volume_ton?: number;
  }) =>
    request<CSSOptimizeResult>('/ml/css/optimize', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Predict 60-day reservoir thermal trajectory */
  predictReservoir: (payload: {
    well_id: string;
    steam_volume_ton?: number;
    injection_temp_c?: number;
    soak_time_hr?: number;
    forecast_days?: number;
  }) =>
    request<ReservoirPredictResult>('/ml/reservoir/predict', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Optimize SRP kinematics and SPM_crit */
  optimizeSrp: (payload: {
    well_id: string;
    reservoir_temperature_c: number;
    well_depth_m?: number;
    stroke_length_in?: number;
    current_spm?: number;
    rod_od_inch?: number;
    tubing_id_inch?: number;
  }) =>
    request<SRPOptimizeResult>('/ml/srp/optimize', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Detect mechanical pumping faults and MTBF */
  detectFaults: (payload: {
    well_id: string;
    spm?: number;
    pprl_kn: number;
    mprl_kn: number;
    card_area_kn_in: number;
    vibration_mm_s: number;
    motor_power_kw: number;
    motor_current_a: number;
    fluid_level_m?: number;
    reservoir_temperature_c?: number;
  }) =>
    request<FaultDetectResult>('/ml/diagnostics/detect-faults', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Retrieve full multi-model audit and setpoints for a single well */
  getWellInsights: (wellId: string) =>
    request<WellInsightsResult>(`/ml/well/${wellId}/insights`),
};

export interface ReplayReading {
  cycleId?: string;
  cycleNumber?: number;
  phase?: 'injection' | 'soak' | 'production' | string;
  steamVolumeTon?: number;
  steamPressureBar?: number;
  steamTemperatureC?: number;
  soakTimeHr?: number;
  temperatureC: number;
  wellheadTempC: number;
  pressureBar: number;
  flowRateBpd: number;
  viscosityCP: number;
  fluidMobility: number;
  spm: number;
  spmCrit: number;
  spmSafe: number;
  rodFloatingRisk: number;
  rodFloatingStatus: string;
  vibrationMmS: number;
  motorPowerKW: number;
  motorCurrentA?: number;
  timestamp: string;
}

export interface ReplayWellReading {
  id: string;
  name: string;
  oilProduction: number;
  temperature: number;
  pressure: number;
  rodLoad: number;
  pumpEfficiency: number;
  spm: number;
  viscosityCP: number;
  spmCrit: number;
  spmSafe: number;
  failureRisk: string;
  failureRiskScore: number;
  status: string;
  cssPhase: string;
  vibrationMmS: number;
  motorPowerKW: number;
  timestamp: string;
}

export interface ReplayState {
  isPlaying: boolean;
  speed: number;
  activeWellId: string;
  currentIndex: number;
  totalFrames: number;
  simulatedLiveLabel: string;
  prototypeDisclaimer: string;
  decisionSupportNotice: string;
  isFieldSync?: boolean;
  availableWells?: string[];
  fieldSummary?: {
    totalWells: number;
    totalProduction?: number;
    avgPressureBar: number;
    avgFlowRateBpd: number;
    avgSpm: number;
    avgPumpEfficiency?: number;
    totalPowerKW?: number;
  };
  currentReading: ReplayReading;
  allWellsReadings?: Record<string, ReplayWellReading>;
}

export const replayApi = {
  getStatus: () => request<{ success: boolean; data: ReplayState }>('/simulation/status'),
  start: (speed?: number) =>
    request<{ success: boolean; data: ReplayState }>(`/simulation/start${speed ? `?speed=${speed}` : ''}`, { method: 'POST' }),
  pause: () => request<{ success: boolean; data: ReplayState }>('/simulation/pause', { method: 'POST' }),
  reset: () => request<{ success: boolean; data: ReplayState }>('/simulation/reset', { method: 'POST' }),
  step: (steps: number = 1) => request<{ success: boolean; data: ReplayState }>(`/simulation/step?steps=${steps}`, { method: 'POST' }),
  seek: (frame_index: number) =>
    request<{ success: boolean; data: ReplayState }>('/simulation/seek', {
      method: 'POST',
      body: JSON.stringify({ frame_index }),
    }),
  setSpeed: (speed: number) =>
    request<{ success: boolean; data: ReplayState }>('/simulation/speed', {
      method: 'POST',
      body: JSON.stringify({ speed }),
    }),
  selectWell: (well_id: string) =>
    request<{ success: boolean; data: ReplayState }>('/simulation/select-well', {
      method: 'POST',
      body: JSON.stringify({ well_id }),
    }),
};

