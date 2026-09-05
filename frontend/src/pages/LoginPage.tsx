import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, EyeOff, AlertCircle, User, Lock, ArrowRight, 
  Activity, Shield, KeyRound, Clock
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginError, clearError } = useAuthStore();
  
  // Form Fields
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword]     = useState('');
  const [role, setRole]             = useState<UserRole>('operator');
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const ok = login(employeeId, password, role);
    setLoading(false);
    if (ok) {
      navigate(role === 'admin' ? '/app/admin/users' : '/app/command-center');
    }
  };

  const handleRoleChange = (r: UserRole) => {
    setRole(r);
    clearError();
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-[#0F172A] selection:bg-[#D32F2F] selection:text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Top Header with Prominent POLARIS Branding ────────────── */}
      <header className="px-6 sm:px-12 py-4 sm:py-5 flex items-center justify-between border-b border-[#E2E8F0] bg-white shadow-2xs sticky top-0 z-30">
        
        {/* Brand & Project Logo Mark */}
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
          <div className="hidden md:flex items-center gap-2 text-[12px] text-[#64748B] font-semibold bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#E2E8F0]">
            <Clock className="w-4 h-4 text-[#94A3B8]" />
            <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST</span>
          </div>

          <div className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-[#E8F5E9] border border-[#C8E6C9] text-[11px] sm:text-[12.5px] text-[#166534] font-bold shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
            <span>Core Operational</span>
          </div>
        </div>
      </header>

      {/* ── Main Center Login Card Container ─────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8 sm:py-12">
        <div className="w-full max-w-xl sm:max-w-2xl bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl shadow-2xl shadow-slate-200/60 p-6 sm:p-10 md:p-12 transition-all">
          
          {/* Card Top Header with Polaris Star Emblem */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E293B] border border-[#334155] mb-4 shadow-lg shadow-slate-900/25">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 sm:w-10 sm:h-10">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="#D32F2F" stroke="#FFFFFF" strokeWidth="1.2" />
                <circle cx="12" cy="12" r="2.8" fill="#FFFFFF" />
              </svg>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#0F172A] tracking-tight">
              Sign In to Polaris
            </h1>
            
            <p className="text-[13.5px] sm:text-[15px] text-[#64748B] mt-2 font-medium max-w-md mx-auto">
              Heavy Oil Wellbore Digital Twin &amp; Joint Optimization Platform
            </p>
          </div>

          {/* Operational Role Selector */}
          <div className="mb-6 sm:mb-8">
            <label className="block text-[12px] sm:text-[13px] font-bold text-[#64748B] uppercase tracking-wider mb-2.5 sm:mb-3 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-[#D32F2F]" />
              Select Operational Role
            </label>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 p-1.5 bg-[#F1F5F9] rounded-2xl border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => handleRoleChange('operator')}
                className={`py-3 sm:py-3.5 px-4 rounded-xl text-[14px] sm:text-[15px] font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                  role === 'operator'
                    ? 'bg-white text-[#D32F2F] shadow-sm border border-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/50'
                }`}
              >
                <Activity className="w-5 h-5 text-[#D32F2F]" />
                <span>Field Operator</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`py-3 sm:py-3.5 px-4 rounded-xl text-[14px] sm:text-[15px] font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                  role === 'admin'
                    ? 'bg-white text-[#D32F2F] shadow-sm border border-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/50'
                }`}
              >
                <Shield className="w-5 h-5 text-[#D32F2F]" />
                <span>System Administrator</span>
              </button>
            </div>
          </div>

          {/* Error Message Alert */}
          {loginError && (
            <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] flex items-center gap-3 text-[13px] sm:text-[14px] text-[#B91C1C]">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            
            {/* Registered Employee ID Field */}
            <div>
              <label className="block text-[13px] sm:text-[14px] font-bold text-[#334155] mb-2">
                Registered Employee ID
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                <input
                  type="text"
                  required
                  placeholder="Enter your registered Employee ID (e.g. OIL-OP-4102)"
                  value={employeeId}
                  onChange={e => { setEmployeeId(e.target.value); clearError(); }}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[14px] sm:text-[15px] text-[#0F172A] font-medium outline-none focus:bg-white focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/15 transition-all placeholder:text-[#94A3B8]"
                />
              </div>
            </div>

            {/* Confidential Password Field */}
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
                  className="w-full pl-12 pr-12 py-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[14px] sm:text-[15px] text-[#0F172A] font-medium outline-none focus:bg-white focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/15 transition-all placeholder:text-[#94A3B8]"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] p-1 cursor-pointer transition-colors"
                  title={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold rounded-xl text-[15px] sm:text-[16px] shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 mt-4 active:scale-[0.99]"
            >
              {loading ? (
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

      {/* ── Responsive Footer ────────────────────────────────────── */}
      <footer className="py-4 px-6 text-center text-[12px] sm:text-[13px] text-[#64748B] border-t border-[#E2E8F0] bg-white">
        <span>POLARIS · Heavy Oil Digital Twin &amp; Joint CSS+SRP Optimization Platform</span>
      </footer>

    </div>
  );
};
