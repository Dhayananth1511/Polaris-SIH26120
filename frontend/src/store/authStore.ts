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
  { employeeId: 'OIL-OP-4102', password: 'demo123', role: 'operator', name: 'Amitav Patel', designation: 'Field Operations Specialist' },
  { employeeId: 'OIL-ADM-001', password: 'demo123', role: 'admin',    name: 'Priya Menon',  designation: 'System Administrator' },
];

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loginError: string;
  login: (employeeId: string, password: string, role: UserRole) => boolean;
  register: (name: string, employeeId: string, password: string, role: UserRole) => boolean;
  switchRole: (role: UserRole) => void;
  logout: () => void;
  clearError: () => void;
}

const defaultUser: User = {
  id: 'OIL-OP-4102',
  name: 'Amitav Patel',
  employeeId: 'OIL-OP-4102',
  role: 'operator',
  designation: 'Field Operations Specialist',
  department: 'Field Operations',
  lastLogin: '04 Nov 2024, 14:32 IST',
};

export const useAuthStore = create<AuthState>((set) => ({
  user: defaultUser,
  isAuthenticated: true,
  loginError: '',

  login: (employeeId, password, role) => {
    const trimmedId = employeeId.trim();
    if (!trimmedId) {
      set({ loginError: 'Please enter your registered Employee ID.' });
      return false;
    }
    if (!password) {
      set({ loginError: 'Please enter your account password.' });
      return false;
    }

    const user: User = {
      id: trimmedId.toUpperCase(),
      name: role === 'admin' ? 'System Administrator' : 'Field Operator',
      employeeId: trimmedId.toUpperCase(),
      role: role,
      designation: role === 'admin' ? 'System Administrator' : 'Lead Field Operations Specialist',
      department: role === 'admin' ? 'Information Systems' : 'Field Operations',
      lastLogin: new Date().toLocaleString('en-IN'),
    };
    set({ user, isAuthenticated: true, loginError: '' });
    return true;
  },

  register: (name, employeeId, password, role) => {
    const trimmedName = name.trim();
    const trimmedId = employeeId.trim();
    if (!trimmedName) {
      set({ loginError: 'Please enter your full name.' });
      return false;
    }
    if (!trimmedId) {
      set({ loginError: 'Please enter your employee ID.' });
      return false;
    }
    if (!password || password.length < 4) {
      set({ loginError: 'Password must be at least 4 characters long.' });
      return false;
    }

    const user: User = {
      id: trimmedId.toUpperCase(),
      name: trimmedName,
      employeeId: trimmedId.toUpperCase(),
      role: role,
      designation: role === 'admin' ? 'System Administrator' : 'Lead Field Operations Specialist',
      department: role === 'admin' ? 'Information Systems' : 'Field Operations',
      lastLogin: new Date().toLocaleString('en-IN'),
    };
    set({ user, isAuthenticated: true, loginError: '' });
    return true;
  },

  switchRole: (role) => {
    const cred = DEMO_CREDENTIALS.find((c) => c.role === role) || DEMO_CREDENTIALS[0];
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
  },

  logout: () => set({ user: null, isAuthenticated: false, loginError: '' }),
  clearError: () => set({ loginError: '' }),
}));
