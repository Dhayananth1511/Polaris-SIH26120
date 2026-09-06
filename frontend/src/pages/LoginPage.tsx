import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, AlertCircle, User, Lock, ArrowRight,
  Clock, KeyRound, Flame, Settings
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

type OperationalRole = 'operator' | 'admin';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, logout, loginError, clearError, isLoading } = useAuthStore();

  // Form Fields
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword]     = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [selectedRole, setSelectedRole] = useState<OperationalRole>('operator');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const ok = await login(employeeId, password);
    if (ok) {
      const currentUser = useAuthStore.getState().user;
      const actualRole = currentUser?.role; // 'admin' | 'operator'

      // Enforce: selected tab must match the actual account role
      if (
        (selectedRole === 'operator' && actualRole === 'admin') ||
        (selectedRole === 'admin'    && actualRole === 'operator')
      ) {
        await logout();
        const mismatchMsg =
          selectedRole === 'operator'
            ? 'These credentials belong to a System Administrator account. Please select the correct role.'
            : 'These credentials belong to a Field Operator account. Please select the correct role.';
        useAuthStore.setState({ loginError: mismatchMsg });
        return;
      }

      navigate(actualRole === 'admin' ? '/app/admin/users' : '/app/command-center');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between bg-white text-[#0F172A] selection:bg-[#D32F2F] selection:text-white"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="px-6 sm:px-12 py-4 sm:py-5 flex items-center justify-between border-b border-[#E2E8F0] bg-white shadow-2xs sticky top-0 z-30">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-[#334155] flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="#D32F2F" stroke="#FFFFFF" strokeWidth="1.2" />
              <circle cx="12" cy="12" r="2.5" fill="#FFFFFF" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[19px] sm:text-[23px] font-black text-[#0F172A] tracking-wider leading-none">
              POLARIS
            </div>
            <div className="text-[11px] sm:text-[13px] text-[#64748B] font-semibold leading-none mt-1 sm:mt-1.5">
              Digital Twin &amp; Optimization Platform
            </div>
          </div>
        </div>

        {/* Live System Status & IST Clock */}
        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
          <div className="hidden md:flex items-center gap-2 text-[12px] text-[#64748B] font-semibold bg-[#F8FAFC] px-3.5 py-1.5 rounded-lg border border-[#E2E8F0]">
            <Clock className="w-4 h-4 text-[#94A3B8]" />
            <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST</span>
          </div>
          <div className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-[#E8F5E9] border border-[#C8E6C9] text-[11px] sm:text-[12.5px] text-[#166534] font-bold shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
            <span>Core Operational</span>
          </div>
        </div>
      </header>

      {/* ── Main Login Card ──────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8 sm:py-12">
        <div className="w-full max-w-2xl bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl shadow-2xl shadow-slate-200/60 p-6 sm:p-10 transition-all">

          {/* Card Top — Emblem + Title */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E293B] border border-[#334155] mb-4 shadow-lg shadow-slate-900/25">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 sm:w-10 sm:h-10">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="#D32F2F" stroke="#FFFFFF" strokeWidth="1.2" />
                <circle cx="12" cy="12" r="2.8" fill="#FFFFFF" />
              </svg>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
              Sign In to Polaris
            </h1>
            <p className="text-[13px] sm:text-[14px] text-[#64748B] mt-2 font-medium max-w-xs mx-auto leading-snug">
              Heavy Oil Wellbore Digital Twin &amp; Joint Optimization Platform
            </p>
          </div>

          {/* ── Operational Role Selector ──────────────────────────── */}
          <div className="mb-6">
            <div className="flex items-center gap-1.5 mb-3">
              <KeyRound className="w-3.5 h-3.5 text-[#D32F2F]" />
              <span className="text-[10.5px] font-extrabold text-[#94A3B8] tracking-widest uppercase">
                Select Operational Role
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Field Operator Tab */}
              <button
                type="button"
                onClick={() => setSelectedRole('operator')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-[13.5px] font-bold transition-all cursor-pointer
                  ${selectedRole === 'operator'
                    ? 'bg-[#FFF5F5] border-[#D32F2F] text-[#D32F2F] shadow-sm'
                    : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                  }`}
              >
                <Flame className={`w-4 h-4 ${selectedRole === 'operator' ? 'text-[#D32F2F]' : 'text-[#94A3B8]'}`} />
                Field Operator
              </button>

              {/* System Administrator Tab */}
              <button
                type="button"
                onClick={() => setSelectedRole('admin')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-[13.5px] font-bold transition-all cursor-pointer
                  ${selectedRole === 'admin'
                    ? 'bg-[#FFF5F5] border-[#D32F2F] text-[#D32F2F] shadow-sm'
                    : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                  }`}
              >
                <Settings className={`w-4 h-4 ${selectedRole === 'admin' ? 'text-[#D32F2F]' : 'text-[#94A3B8]'}`} />
                System Administrator
              </button>
            </div>
          </div>

          {/* Error Message Alert */}
          {loginError && (
            <div className="mb-5 p-4 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] flex items-center gap-3 text-[13px] sm:text-[14px] text-[#B91C1C]">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Registered Employee ID */}
            <div>
              <label className="block text-[13px] sm:text-[14px] font-bold text-[#334155] mb-2">
                Registered Employee ID
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                <input
                  type="text"
                  required
                  placeholder={
                    selectedRole === 'operator'
                      ? 'Enter your registered Employee ID (e.g. OIL-OP-4102)'
                      : 'Enter your registered Employee ID (e.g. OIL-AD-0001)'
                  }
                  value={employeeId}
                  onChange={e => { setEmployeeId(e.target.value); clearError(); }}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[14px] text-[#0F172A] font-medium outline-none focus:bg-white focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/15 transition-all placeholder:text-[#94A3B8]"
                />
              </div>
            </div>

            {/* Confidential Password */}
            <div>
              <label className="block text-[13px] sm:text-[14px] font-bold text-[#334155] mb-2">
                Confidential Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  placeholder="Enter your account password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearError(); }}
                  className="w-full pl-12 pr-12 py-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[14px] text-[#0F172A] font-medium outline-none focus:bg-white focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/15 transition-all placeholder:text-[#94A3B8]"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] p-1 cursor-pointer transition-colors"
                  title={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold rounded-xl text-[15px] shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 mt-2 active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In with Registered ID</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="py-4 px-6 text-center text-[12px] sm:text-[13px] text-[#64748B] border-t border-[#E2E8F0] bg-white">
        <span>POLARIS · Heavy Oil Digital Twin &amp; Joint CSS+SRP Optimization Platform</span>
      </footer>

    </div>
  );
};
