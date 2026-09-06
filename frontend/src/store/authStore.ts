import { create } from 'zustand';
import type { User, UserRole } from '../types';
import { authApi, setAuthToken, removeAuthToken, getAuthToken } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loginError: string;
  isLoading: boolean;
  login: (employeeId: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

const savedUserRaw = localStorage.getItem('polaris_user');
let initialUser: User | null = null;
try {
  if (savedUserRaw) {
    initialUser = JSON.parse(savedUserRaw);
  }
} catch {
  initialUser = null;
}

const initialToken = getAuthToken();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  token: initialToken,
  isAuthenticated: !!initialToken && !!initialUser,
  loginError: '',
  isLoading: false,

  login: async (employeeId, password) => {
    const trimmedId = employeeId.trim();
    if (!trimmedId) {
      set({ loginError: 'Please enter your registered Employee ID.' });
      return false;
    }
    if (!password) {
      set({ loginError: 'Please enter your account password.' });
      return false;
    }

    set({ isLoading: true, loginError: '' });
    try {
      const res = await authApi.login(trimmedId, password);
      const backendUser = res.user;
      const roleLower: UserRole = backendUser.role.toLowerCase() === 'admin' ? 'admin' : 'operator';

      const user: User = {
        id: backendUser.id,
        name: backendUser.full_name,
        employeeId: backendUser.employee_id,
        role: roleLower,
        designation: roleLower === 'admin' ? 'System Administrator' : 'Lead Field Operations Specialist',
        department: roleLower === 'admin' ? 'System Administration' : 'Field Operations',
        lastLogin: new Date().toLocaleString('en-IN'),
      };

      setAuthToken(res.data.access_token);
      localStorage.setItem('polaris_user', JSON.stringify(user));

      set({
        user,
        token: res.data.access_token,
        isAuthenticated: true,
        loginError: '',
        isLoading: false,
      });
      return true;
    } catch (err: any) {
      set({
        loginError: err.message || 'Authentication failed. Please verify your credentials.',
        isLoading: false,
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    removeAuthToken();
    set({ user: null, token: null, isAuthenticated: false, loginError: '', isLoading: false });
  },

  checkAuth: async () => {
    const token = getAuthToken();
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false });
      return;
    }
    try {
      const res = await authApi.me();
      const backendUser = res.user;
      const roleLower: UserRole = backendUser.role.toLowerCase() === 'admin' ? 'admin' : 'operator';
      const user: User = {
        id: backendUser.id,
        name: backendUser.full_name,
        employeeId: backendUser.employee_id,
        role: roleLower,
        designation: roleLower === 'admin' ? 'System Administrator' : 'Lead Field Operations Specialist',
        department: roleLower === 'admin' ? 'System Administration' : 'Field Operations',
        lastLogin: new Date().toLocaleString('en-IN'),
      };
      localStorage.setItem('polaris_user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } catch {
      removeAuthToken();
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  clearError: () => set({ loginError: '' }),
}));
