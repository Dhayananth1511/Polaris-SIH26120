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

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

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

  return response.json();
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
