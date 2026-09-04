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
    production_engineer: 'Production Engineer',
    field_manager:       'Field Manager',
    administrator:       'Administrator',
  };

  return (
    <header className="app-header">
      {/* ── Top utility bar ─────────────────────────────────────────── */}
      <div className="app-topbar">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-[#1E293B]">
            Oil India Limited — Well Intelligence &amp; Digital Twin
          </span>
          <span className="text-[#CBD5E1]">|</span>
          <span>Baghewala Field, Rajasthan</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3 text-[#2E7D32]" />
            <span className="text-[#2E7D32] font-semibold">System Operational</span>
          </div>
          <span className="text-[#CBD5E1]">|</span>
          <div className="flex items-center gap-1 text-[#64748B]">
            <Clock className="w-3 h-3" />
            <span>Last Sync: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST</span>
          </div>
        </div>
      </div>

      {/* ── Main nav bar ────────────────────────────────────────────── */}
      <div className="app-navbar">
        {/* Logo — OIL India style */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* OIL Logo mark — red circle with vertical line like actual logo */}
          <div className="flex-shrink-0">
            <svg width="40" height="44" viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="12" r="10" fill="#D32F2F" />
              <circle cx="20" cy="12" r="5" fill="white" />
              <rect x="18" y="22" width="4" height="20" fill="#D32F2F" />
              <rect x="10" y="40" width="20" height="3" rx="1.5" fill="#D32F2F" />
            </svg>
          </div>
          <div className="border-l border-[#E2E8F0] pl-3">
            <div className="text-[13px] font-bold text-[#1E293B] tracking-wide leading-tight">OIL INDIA LIMITED</div>
            <div className="text-[10px] text-[#64748B] leading-tight mt-0.5">Conquering Newer Horizons</div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-[#E2E8F0] mx-2" />

        {/* Platform title */}
        <div>
          <div className="text-[0.78rem] font-semibold text-[#1E3A5F]">Well Intelligence &amp; Digital Twin</div>
          <div className="text-[0.68rem] text-[#64748B]">Baghewala Field Operations Platform</div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-sm mx-6 hidden lg:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input
              type="search"
              placeholder="Search well, parameter, alert..."
              className="w-full pl-9 pr-3 py-2 text-[0.8rem] bg-[#F4F6F8] border border-[#E2E8F0] rounded text-[#1E293B] placeholder-[#94A3B8] outline-none focus:border-[#D32F2F] focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 ml-auto">
          {/* Notifications */}
          <button className="relative p-2 rounded hover:bg-[#F4F6F8] transition-colors">
            <Bell className="w-4.5 h-4.5 text-[#475569]" style={{ width: 18, height: 18 }} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#D32F2F] text-[8px] text-white font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>

          {/* Settings */}
          <button className="p-2 rounded hover:bg-[#F4F6F8] transition-colors">
            <Settings style={{ width: 18, height: 18 }} className="text-[#475569]" />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-[#E2E8F0] mx-1" />

          {/* User */}
          <div className="relative">
            <button
              onClick={() => setShowUser(!showUser)}
              className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[#D32F2F] flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-white">
                  {user?.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <div className="text-[0.75rem] font-semibold text-[#1E293B] leading-none">{user?.name}</div>
                <div className="text-[0.65rem] text-[#64748B] mt-0.5">{roleLabel[user?.role ?? '']}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
            </button>

            {showUser && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-[#E2E8F0] rounded shadow-lg z-50 py-1">
                <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <p className="text-[0.82rem] font-semibold text-[#1E293B]">{user?.name}</p>
                  <p className="text-[0.72rem] text-[#64748B] mt-0.5">{user?.employeeId}</p>
                  <p className="text-[0.72rem] text-[#64748B]">{roleLabel[user?.role ?? '']}</p>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login'); setShowUser(false); }}
                  className="w-full text-left px-4 py-2.5 text-[0.8rem] text-[#D32F2F] hover:bg-[#FEF2F2] transition-colors font-medium"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
