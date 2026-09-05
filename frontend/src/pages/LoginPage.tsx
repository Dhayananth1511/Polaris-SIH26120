import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Shield, User, Lock, ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types';

const ROLES: { value: UserRole; label: string; desc: string; iconTag: string }[] = [
  { value: 'field_operator',      label: 'Field Operator',      desc: 'Real-time operational status, CSS cycles, SRP telemetry & fault flags', iconTag: 'OP' },
  { value: 'production_engineer', label: 'Production / Reservoir Engineer', desc: 'Real-time telemetry, digital twin, simulations & parameter optimization', iconTag: 'PE' },
  { value: 'field_manager',       label: 'Field Supervisor / Manager',       desc: 'Production forecasting, optimization recommendations & pending approvals', iconTag: 'FM' },
  { value: 'administrator',       label: 'System Administrator',       desc: 'User roles, data connections, AI surrogate models & system health', iconTag: 'ADM' },
];

const DEMO_CREDS: Record<UserRole, { id: string; name: string }> = {
  field_operator:      { id: 'OIL-OP-4102', name: 'Amitav Patel' },
  production_engineer: { id: 'OIL-PE-2847', name: 'Rajan Sharma' },
  field_manager:       { id: 'OIL-FM-1052', name: 'Vikram Nair' },
  administrator:       { id: 'OIL-ADM-001', name: 'Priya Menon' },
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginError, clearError } = useAuthStore();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword]     = useState('');
  const [role, setRole]             = useState<UserRole>('production_engineer');
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const ok = login(employeeId, password, role);
    setLoading(false);
    if (ok) navigate('/app/command-center');
  };

  const fillDemo = (r: UserRole) => {
    clearError();
    setEmployeeId(DEMO_CREDS[r].id);
    setPassword('demo123');
    setRole(r);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F8]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Top Bar (OIL India Brand Header) ──────────────────────── */}
      <header className="bg-white border-b border-[#E2E8F0] shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-6 h-[70px] flex items-center justify-between">
          
          {/* Logo Mark */}
          <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => navigate('/')}>
            <svg width="40" height="44" viewBox="0 0 40 44" fill="none">
              <circle cx="20" cy="12" r="10" fill="#D32F2F" />
              <circle cx="20" cy="12" r="5" fill="white" />
              <rect x="18" y="22" width="4" height="20" fill="#D32F2F" />
              <rect x="10" y="40" width="20" height="3" rx="1.5" fill="#D32F2F" />
            </svg>
            <div className="border-l border-[#E2E8F0] pl-3.5">
              <div className="text-[15px] font-black text-[#0F172A] tracking-wider leading-tight">OIL INDIA LIMITED</div>
              <div className="text-[11px] text-[#64748B] leading-tight mt-0.5">A Navratna Government of India Enterprise</div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/')}
              className="text-[13px] font-semibold text-[#475569] hover:text-[#D32F2F] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              ← Platform Overview
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Grid: Left Sunset Visual + Right Enhanced Login Box ── */}
      <div className="flex-1 flex flex-col lg:flex-row">

        {/* ── Left Hero Panel (Sucker Rod Pump Sunset) ─────────────── */}
        <div className="relative hidden lg:flex flex-col justify-between flex-1 overflow-hidden bg-[#0A0F1D] min-h-[640px]">
          
          {/* Sucker Rod Pump Sunset Image */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
            style={{
              backgroundImage: `url("/srp_sunset.webp")`,
            }}
          />

          {/* Cinematic Dark Gradient Overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.40) 50%, rgba(10,15,30,0.92) 100%)',
            }}
          />

          {/* Top Section */}
          <div className="relative z-10 p-12 xl:p-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-[2.5px] bg-[#D32F2F]" />
              <span className="text-[13px] text-[#FF8A80] font-bold uppercase tracking-[0.2em]">
                Baghewala Heavy Oil Field · Rajasthan
              </span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] mb-5 tracking-tight">
              Well Intelligence<br />
              <span className="text-[#FF5252]">&amp; Digital Twin</span>
            </h1>

            <p className="text-white/80 text-[16px] leading-relaxed max-w-lg font-normal">
              Autonomous Well-to-Surface optimization platform for Cyclic Steam Stimulation (CSS) and Sucker Rod Pump (SRP) operations.
            </p>
          </div>

          {/* Bottom Live Metrics Strip */}
          <div className="relative z-10 p-12 xl:p-16 pt-0">
            <div className="grid grid-cols-3 gap-4 p-5 rounded-lg bg-black/45 border border-white/15 backdrop-blur-md max-w-lg mb-6">
              {[
                { v: '23', l: 'Active Wells' },
                { v: '2,840', l: 'Total BOPD' },
                { v: '3.6', l: 'Average SOR' },
              ].map(({ v, l }) => (
                <div key={l} className="border-l-2 border-[#D32F2F] pl-3.5">
                  <p className="text-2xl font-black text-white">{v}</p>
                  <p className="text-[12px] text-white/60 uppercase tracking-wide font-medium">{l}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 text-white/60 text-[12px]">
              <Shield className="w-4 h-4 text-[#D32F2F]" />
              <span>Oil India Limited Operational Security Protocol · OISD Standard Compliant</span>
            </div>
          </div>
        </div>

        {/* ── Right Panel: Extended, Balanced Login Box ────────────── */}
        <div className="w-full lg:w-[540px] xl:w-[580px] bg-white flex flex-col justify-between shadow-2xl border-l border-[#E2E8F0]">

          <div className="px-8 sm:px-12 py-6 xl:py-8 flex-1 flex flex-col justify-center">
            
            {/* Header */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D32F2F]" />
                <span className="text-[12px] font-bold text-[#D32F2F] uppercase tracking-wider">Authorized Operational Access</span>
              </div>
              <h2 className="text-2xl xl:text-3xl font-black text-[#0F172A] tracking-tight">Sign In to Platform</h2>
              <p className="text-[13px] text-[#64748B] mt-1 leading-relaxed">
                Enter your Oil India Limited engineering credentials to access command and control dashboards.
              </p>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="flex items-start gap-3 p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-md mb-4">
                <AlertCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-bold text-[#991B1B]">Authentication Failure</p>
                  <p className="text-[11px] text-[#7F1D1D] mt-0.5">{loginError}</p>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {/* Employee ID */}
              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1 uppercase tracking-wide">
                  Employee ID / Operational Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. OIL-PE-2847"
                    value={employeeId}
                    onChange={e => { setEmployeeId(e.target.value); clearError(); }}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[13px] text-[#0F172A] font-medium focus:bg-white focus:outline-none focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/15 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[12px] font-bold text-[#334155] uppercase tracking-wide">
                    Access Password
                  </label>
                  <span className="text-[11px] text-[#64748B]">Default demo: <strong className="text-[#0F172A]">demo123</strong></span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    placeholder="Enter confidential password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearError(); }}
                    className="w-full pl-10 pr-11 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[13px] text-[#0F172A] font-medium focus:bg-white focus:outline-none focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] transition-colors p-1"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Access Role */}
              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1 uppercase tracking-wide">
                  Operational Duty Role
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[13px] text-[#0F172A] font-semibold focus:bg-white focus:outline-none focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/15 transition-all"
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-3 px-6 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold rounded text-[14px] shadow hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Command Center</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Accounts Selection */}
            <div className="mt-5 pt-4 border-t border-[#F1F5F9]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Quick Fill Demo Roles</span>
                <span className="text-[11px] text-[#94A3B8]">1-Click Selection</span>
              </div>

              <div className="space-y-1.5">
                {ROLES.map(r => {
                  const cred = DEMO_CREDS[r.value];
                  const isSelected = role === r.value && employeeId === cred.id;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => fillDemo(r.value)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded border transition-all text-left group ${
                        isSelected 
                          ? 'bg-[#FFEBEE] border-[#D32F2F]' 
                          : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-6 h-6 rounded font-bold text-[10px] flex items-center justify-center ${
                          isSelected ? 'bg-[#D32F2F] text-white' : 'bg-[#E2E8F0] text-[#475569]'
                        }`}>
                          {r.iconTag}
                        </span>
                        <div>
                          <div className={`text-[12px] font-bold ${isSelected ? 'text-[#D32F2F]' : 'text-[#1E293B]'}`}>
                            {r.label}
                          </div>
                          <div className="text-[10px] text-[#64748B]">{cred.name} · <span className="font-mono">{cred.id}</span></div>
                        </div>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-[#D32F2F]' : 'text-[#94A3B8] group-hover:text-[#475569]'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Footer Strip */}
          <div className="px-8 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] text-center text-[12px] text-[#64748B]">
            <span>Oil India Limited · Corporate IT &amp; Field Telemetry Security Division</span>
          </div>

        </div>

      </div>

    </div>
  );
};
