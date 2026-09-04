import { create } from 'zustand';
import type { User, UserRole } from '../types';

interface DemoCredential {
  employeeId: string;
  password: string;
  role: UserRole;
  name: string;
  designation: string;
}

const DEMO_CREDENTIALS: DemoCredential[] = [
  { employeeId: 'OIL-PE-2847', password: 'demo123', role: 'production_engineer', name: 'Rajan Sharma',    designation: 'Senior Production Engineer' },
  { employeeId: 'OIL-FM-1052', password: 'demo123', role: 'field_manager',        name: 'Vikram Nair',     designation: 'Field Manager, Baghewala' },
  { employeeId: 'OIL-ADM-001', password: 'demo123', role: 'administrator',         name: 'Priya Menon',     designation: 'System Administrator' },
];

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loginError: string;
  login: (employeeId: string, password: string, role: UserRole) => boolean;
  logout: () => void;
  clearError: () => void;
}

const defaultUser: User = {
  id: 'OIL-PE-2847',
  name: 'Rajan Sharma',
  employeeId: 'OIL-PE-2847',
  role: 'production_engineer',
  designation: 'Senior Production Engineer',
  department: 'Production Operations',
  lastLogin: '04 Nov 2024, 14:32 IST',
};

export const useAuthStore = create<AuthState>((set) => ({
  user: defaultUser,
  isAuthenticated: true,
  loginError: '',

  login: (employeeId, password, role) => {
    const cred = DEMO_CREDENTIALS.find(
      (c) => c.employeeId === employeeId && c.password === password && c.role === role
    );
    if (cred) {
      const user: User = {
        id: cred.employeeId,
        name: cred.name,
        employeeId: cred.employeeId,
        role: cred.role,
        designation: cred.designation,
        department: 'Production Operations',
        lastLogin: new Date().toLocaleString('en-IN'),
      };
      set({ user, isAuthenticated: true, loginError: '' });
      return true;
    }
    set({ loginError: 'Invalid Employee ID, password, or role. Please verify credentials.' });
    return false;
  },

  logout: () => set({ user: null, isAuthenticated: false, loginError: '' }),
  clearError: () => set({ loginError: '' }),
}));
