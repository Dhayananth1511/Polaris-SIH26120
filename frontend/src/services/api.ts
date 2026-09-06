/**
 * Polaris Frontend — API Client
 * Centralized HTTP client connected to the backend FastAPI service.
 */

const API_BASE = '/api';

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
          errorData = await response.json();
        } catch {
          errorData = { error: { message: response.statusText || 'Request failed' } };
        }

        const message = errorData.error?.message || errorData.detail || 'An unexpected error occurred';
        const err = new Error(message) as Error & { code?: string; status?: number };
        err.code = errorData.error?.code;
        err.status = response.status;
        throw err;
      }

      const data = await response.json();
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
};

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
