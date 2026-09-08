import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  ChevronDown,
  Clock,
  Settings,
  Menu,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useNavigate } from 'react-router-dom';
import { alertsApi } from '../../services/api';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { toggleMobileMenu } = useUIStore();
  const navigate = useNavigate();
  const [showUser, setShowUser] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    alertsApi.listAlerts({ acknowledged: false, limit: 1 })
      .then(res => { if (res.success) setUnread(res.total); })
      .catch(() => {});
    const t = setInterval(() => {
      alertsApi.listAlerts({ acknowledged: false, limit: 1 })
        .then(res => { if (res.success) setUnread(res.total); })
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  const roleLabel: Record<string, string> = {
    operator: 'Field Operator',
    admin:    'System Administrator',
  };

  const handleSignOut = async () => {
    await logout();
    setShowUser(false);
    navigate('/login');
  };

  const defaultHome = user?.role === 'admin' ? '/app/admin/users' : '/app/command-center';

  return (
    <header className="app-header bg-white border-b border-[#E2E8F0] shadow-xs px-3 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-2 sm:gap-6 z-40 select-none w-full flex-shrink-0">
      
      {/* ── 1ST: MOBILE MENU BUTTON + POLARIS BRAND (Far Left) ─────── */}
      <div className="flex items-center gap-2 sm:gap-3.5 flex-shrink-0 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={toggleMobileMenu}
          className="p-2 -ml-1 rounded-xl hover:bg-[#F1F5F9] text-[#0F172A] lg:hidden transition-colors cursor-pointer flex-shrink-0"
          title="Toggle navigation menu"
        >
          <Menu className="w-6 h-6 text-[#1E293B]" />
        </button>

        {/* POLARIS Logo & Title */}
        <div 
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group flex-shrink-0" 
          onClick={() => navigate(defaultHome)}
          title="Return to main dashboard"
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-[#334155] flex items-center justify-center text-white shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="sm:w-6 sm:h-6">
              <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="#D32F2F" stroke="#FFFFFF" strokeWidth="1.2" />
              <circle cx="12" cy="12" r="2.5" fill="#FFFFFF" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[16px] sm:text-[19px] font-black text-[#0F172A] tracking-wider leading-tight">POLARIS</span>
            </div>
            <div className="text-[11px] sm:text-[12.5px] text-[#64748B] font-semibold leading-tight mt-0.5 hidden xl:block whitespace-nowrap">
              Baghewala Field · Digital Twin &amp; Optimization Platform
            </div>
          </div>
        </div>
      </div>



      {/* ── RIGHT: Clock, Alerts, Settings, User Profile ─────────── */}
      <div className="flex items-center gap-1.5 sm:gap-3 ml-auto flex-shrink-0">
        
        {/* Real-time Clock */}
        <div className="hidden lg:flex items-center gap-2 text-[12.5px] text-[#64748B] font-semibold bg-[#F8FAFC] px-3.5 py-2 rounded-xl border border-[#E2E8F0]">
          <Clock className="w-4 h-4 text-[#94A3B8]" />
          <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST</span>
        </div>

        {/* Alerts Notification Button */}
        <button 
          onClick={() => navigate('/app/alerts')}
          className="relative p-2 sm:p-2.5 rounded-xl hover:bg-[#F1F5F9] transition-colors cursor-pointer"
          title="Field Alerts & Governance"
        >
          <Bell className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-[#475569]" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-[#D32F2F] text-[9px] sm:text-[10px] text-white font-black flex items-center justify-center shadow-xs">
              {unread}
            </span>
          )}
        </button>

        {/* Settings Button (Admin Only) */}
        {user?.role === 'admin' && (
          <button 
            onClick={() => navigate('/app/admin/config')}
            className="p-2 sm:p-2.5 rounded-xl hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            title="Settings & System Calibration"
          >
            <Settings className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-[#475569]" />
          </button>
        )}

        <div className="w-px h-6 sm:h-8 bg-[#E2E8F0] mx-0.5 sm:mx-1" />

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUser(!showUser)}
            className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-[#CBD5E1] hover:border-[#94A3B8] hover:bg-[#F8FAFC] transition-all cursor-pointer bg-white shadow-2xs"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#D32F2F] flex items-center justify-center flex-shrink-0 text-white font-black text-[11px] sm:text-[12px] shadow-xs">
              {user?.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-[13px] font-bold text-[#0F172A] leading-tight">{user?.name}</div>
              <div className="text-[11px] text-[#D32F2F] font-bold mt-0.5">{roleLabel[user?.role ?? '']}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#64748B]" />
          </button>

          {showUser && (
            <div className="absolute right-0 top-full mt-2.5 w-64 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl z-50 py-2">
              <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <p className="text-[14px] font-bold text-[#0F172A]">{user?.name}</p>
                <p className="text-[12px] text-[#64748B] font-mono mt-0.5">{user?.employeeId}</p>
                <p className="text-[12px] text-[#475569] mt-1">{user?.designation || user?.department}</p>
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#FFEBEE] text-[#D32F2F]">
                  {roleLabel[user?.role ?? ''] || user?.role}
                </span>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2.5 text-[13px] text-[#D32F2F] hover:bg-[#FEF2F2] transition-colors font-bold cursor-pointer"
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
