import React, { useState } from 'react';
import { Bell, Search, ChevronDown, Wifi, Clock, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { ALERTS } from '../../data/mockData';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showUser, setShowUser] = useState(false);
  const unread = ALERTS.filter(a => !a.acknowledged).length;

  const roleLabel: Record<string, string> = {
    field_operator:      'Field Operator',
    production_engineer: 'Production / Reservoir Engineer',
    field_manager:       'Field Supervisor / Manager',
    administrator:       'System Administrator',
  };

  const { switchRole } = useAuthStore();

  const handleRoleSwitch = (r: any) => {
    switchRole(r);
    setShowUser(false);
    navigate('/app/command-center');
  };

  return (
    <header className="app-header bg-white border-b border-[#E2E8F0] shadow-xs px-6 h-16 flex items-center justify-between gap-4 z-40 select-none">
      
      {/* ── Left Brand: Team POLARIS ──────────────────────────────── */}
      <div className="flex items-center gap-3 flex-shrink-0 cursor-pointer" onClick={() => navigate('/app/command-center')}>
        {/* Project Polaris Star Icon */}
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-[#334155] flex items-center justify-center text-white shadow-xs">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z" fill="#D32F2F" stroke="#FFFFFF" strokeWidth="1" />
            <circle cx="12" cy="12" r="2.2" fill="#FFFFFF" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-black text-[#0F172A] tracking-wider leading-tight">TEAM POLARIS</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#FFEBEE] text-[#D32F2F]">AI CORE</span>
          </div>
          <div className="text-[11px] text-[#64748B] font-semibold leading-tight mt-0.5">
            Baghewala Field · Digital Twin &amp; Optimization Platform
          </div>
        </div>
      </div>

      {/* ── Center: Search + Live Operational Status ───────────────── */}
      <div className="flex-1 max-w-lg mx-4 hidden md:flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
          <input
            type="search"
            placeholder="Search well ID, telemetry parameter, alert..."
            className="w-full pl-9 pr-3 py-1.5 text-[12px] bg-[#F8FAFC] border border-[#CBD5E1] rounded-md text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#D32F2F] focus:bg-white focus:ring-1 focus:ring-[#D32F2F]/20 transition-all font-medium"
          />
        </div>

        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-[#E8F5E9] border border-[#C8E6C9] text-[11px] text-[#166534] font-bold flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
          <span>System Operational</span>
        </div>
      </div>

      {/* ── Right Actions & User Profile Dropdown ──────────────────── */}
      <div className="flex items-center gap-2 ml-auto flex-shrink-0">
        
        {/* Real-time Clock */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#64748B] font-semibold mr-2 bg-[#F8FAFC] px-2.5 py-1 rounded border border-[#E2E8F0]">
          <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
          <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST</span>
        </div>

        {/* Notifications */}
        <button 
          onClick={() => navigate('/app/alerts')}
          className="relative p-2 rounded-md hover:bg-[#F1F5F9] transition-colors cursor-pointer"
          title="Field Alerts"
        >
          <Bell className="w-4.5 h-4.5 text-[#475569]" style={{ width: 18, height: 18 }} />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#D32F2F] text-[9px] text-white font-black flex items-center justify-center shadow-xs">
              {unread}
            </span>
          )}
        </button>

        {/* Settings */}
        <button 
          onClick={() => navigate('/app/admin/config')}
          className="p-2 rounded-md hover:bg-[#F1F5F9] transition-colors cursor-pointer"
          title="Settings & Calibration"
        >
          <Settings style={{ width: 18, height: 18 }} className="text-[#475569]" />
        </button>

        <div className="w-px h-6 bg-[#E2E8F0] mx-1" />

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowUser(!showUser)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-md border border-[#CBD5E1] hover:border-[#94A3B8] hover:bg-[#F8FAFC] transition-all cursor-pointer bg-white"
          >
            <div className="w-7 h-7 rounded-full bg-[#D32F2F] flex items-center justify-center flex-shrink-0 text-white font-black text-[11px] shadow-xs">
              {user?.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-[12px] font-bold text-[#0F172A] leading-tight">{user?.name}</div>
              <div className="text-[10px] text-[#D32F2F] font-bold mt-0.5">{roleLabel[user?.role ?? '']}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
          </button>

          {showUser && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-[#E2E8F0] rounded-lg shadow-xl z-50 py-1.5">
              <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <p className="text-[13px] font-bold text-[#0F172A]">{user?.name}</p>
                <p className="text-[11px] text-[#64748B] font-mono mt-0.5">{user?.employeeId}</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFEBEE] text-[#D32F2F]">
                  {roleLabel[user?.role ?? '']}
                </span>
              </div>

              <div className="px-3 py-2 border-b border-[#E2E8F0] bg-[#FAFAFA]">
                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Switch Role</p>
                <div className="space-y-1">
                  {[
                    { r: 'field_operator', label: 'Field Operator' },
                    { r: 'production_engineer', label: 'Production Engineer' },
                    { r: 'field_manager', label: 'Field Supervisor / Manager' },
                    { r: 'administrator', label: 'System Administrator' },
                  ].map(({ r, label }) => (
                    <button
                      key={r}
                      onClick={() => handleRoleSwitch(r)}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors flex items-center justify-between cursor-pointer ${
                        user?.role === r ? 'bg-[#FFEBEE] text-[#D32F2F] font-bold' : 'text-[#334155] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      <span>{label}</span>
                      {user?.role === r && <span className="w-1.5 h-1.5 rounded-full bg-[#D32F2F]" />}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => { logout(); navigate('/login'); setShowUser(false); }}
                className="w-full text-left px-4 py-2 text-[12px] text-[#D32F2F] hover:bg-[#FEF2F2] transition-colors font-bold cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

      </div>

    </header>
  );
};
