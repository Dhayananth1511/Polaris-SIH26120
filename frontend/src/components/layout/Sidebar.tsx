import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Activity, Cpu, Brain, Sliders, CheckSquare,
  FileText, Users, Database, Settings, ChevronLeft, ChevronRight,
  GitBranch, AlertTriangle, BarChart2, Layers, Shield, Zap,
  TrendingUp, Eye, FileCheck, ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
  badge?: string;
  section?: string;
}

// Exactly 6-7 core items tailored per role
const ROLE_NAV_ITEMS: Record<UserRole, NavItem[]> = {
  // ── 1. FIELD OPERATOR (6 items) ──────────────────────────────────────────
  field_operator: [
    { label: 'Overview', path: '/app/command-center', icon: <LayoutDashboard className="w-4 h-4" />, roles: ['field_operator'], section: 'MONITORING' },
    { label: 'Well Status', path: '/app/field-status', icon: <Map className="w-4 h-4" />, roles: ['field_operator'], section: 'MONITORING' },
    { label: 'CSS Operations', path: '/app/css-operations', icon: <Zap className="w-4 h-4" />, roles: ['field_operator'], section: 'OPERATIONS' },
    { label: 'SRP Diagnostics', path: '/app/srp-diagnostics', icon: <Sliders className="w-4 h-4" />, roles: ['field_operator'], section: 'OPERATIONS' },
    { label: 'Alerts', path: '/app/alerts', icon: <AlertTriangle className="w-4 h-4" />, roles: ['field_operator'], badge: '4', section: 'GOVERNANCE' },
    { label: 'Reports', path: '/app/reports', icon: <FileText className="w-4 h-4" />, roles: ['field_operator'], section: 'GOVERNANCE' },
  ],

  // ── 2. PRODUCTION / RESERVOIR ENGINEER (7 items) ─────────────────────────
  production_engineer: [
    { label: 'Overview', path: '/app/command-center', icon: <LayoutDashboard className="w-4 h-4" />, roles: ['production_engineer'], section: 'COMMAND CENTER' },
    { label: 'Well & Production Intel', path: '/app/well-intelligence', icon: <Activity className="w-4 h-4" />, roles: ['production_engineer'], section: 'INTELLIGENCE' },
    { label: 'CSS & SRP Operations', path: '/app/css-operations', icon: <Zap className="w-4 h-4" />, roles: ['production_engineer'], section: 'INTELLIGENCE' },
    { label: 'Well Digital Twin', path: '/app/digital-twin', icon: <Layers className="w-4 h-4" />, roles: ['production_engineer'], section: 'DIGITAL TWIN' },
    { label: 'What-If Simulator', path: '/app/simulation-lab', icon: <Cpu className="w-4 h-4" />, roles: ['production_engineer'], section: 'DIGITAL TWIN' },
    { label: 'Smart Optimization', path: '/app/smart-optimization', icon: <GitBranch className="w-4 h-4" />, roles: ['production_engineer'], section: 'OPTIMIZATION' },
    { label: 'AI Recommendations', path: '/app/recommendations', icon: <Brain className="w-4 h-4" />, roles: ['production_engineer'], badge: '2', section: 'OPTIMIZATION' },
  ],

  // ── 3. FIELD SUPERVISOR / MANAGER (6 items) ──────────────────────────────
  field_manager: [
    { label: 'Overview', path: '/app/command-center', icon: <LayoutDashboard className="w-4 h-4" />, roles: ['field_manager'], section: 'EXECUTIVE' },
    { label: 'Production Forecast', path: '/app/ai/forecast', icon: <TrendingUp className="w-4 h-4" />, roles: ['field_manager'], section: 'INTELLIGENCE' },
    { label: 'Optimization Recs', path: '/app/recommendations', icon: <Brain className="w-4 h-4" />, roles: ['field_manager'], section: 'DECISION SUPPORT' },
    { label: 'Critical Alerts', path: '/app/alerts', icon: <AlertTriangle className="w-4 h-4" />, roles: ['field_manager'], badge: '1', section: 'DECISION SUPPORT' },
    { label: 'Pending Approvals', path: '/app/approvals', icon: <CheckSquare className="w-4 h-4" />, roles: ['field_manager'], badge: '2', section: 'GOVERNANCE' },
    { label: 'Performance Reports', path: '/app/reports', icon: <FileText className="w-4 h-4" />, roles: ['field_manager'], section: 'GOVERNANCE' },
  ],

  // ── 4. SYSTEM ADMINISTRATOR (6 items) ────────────────────────────────────
  administrator: [
    { label: 'Users & Roles', path: '/app/admin/users', icon: <Users className="w-4 h-4" />, roles: ['administrator'], section: 'ADMINISTRATION' },
    { label: 'Data Management', path: '/app/admin/data', icon: <Database className="w-4 h-4" />, roles: ['administrator'], section: 'ADMINISTRATION' },
    { label: 'Models & Engines', path: '/app/admin/models', icon: <Cpu className="w-4 h-4" />, roles: ['administrator'], section: 'ADMINISTRATION' },
    { label: 'System Health', path: '/app/admin/health', icon: <Activity className="w-4 h-4" />, roles: ['administrator'], section: 'SYSTEM' },
    { label: 'Well Configuration', path: '/app/admin/config', icon: <Settings className="w-4 h-4" />, roles: ['administrator'], section: 'SYSTEM' },
    { label: 'Audit Logs', path: '/app/admin/audit', icon: <Shield className="w-4 h-4" />, roles: ['administrator'], section: 'GOVERNANCE' },
  ],
};

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const role = (user?.role || 'production_engineer') as UserRole;

  // Get exactly 6-7 items for the active role
  const navItems = ROLE_NAV_ITEMS[role] || ROLE_NAV_ITEMS.production_engineer;

  // Group items by clean sections
  const groupedSections: { section: string; items: NavItem[] }[] = [];
  navItems.forEach(item => {
    const secName = item.section || 'CORE';
    let existing = groupedSections.find(g => g.section === secName);
    if (!existing) {
      existing = { section: secName, items: [] };
      groupedSections.push(existing);
    }
    existing.items.push(item);
  });

  const roleDisplayNames: Record<UserRole, string> = {
    field_operator: 'Field Operator',
    production_engineer: 'Production Engineer',
    field_manager: 'Supervisor / Manager',
    administrator: 'System Admin',
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} flex flex-col bg-white text-[#0F172A] border-r border-[#E2E8F0] select-none transition-all duration-300 shadow-xs`}>
      
      {/* ── Sidebar Top Header ───────────────────────────────────── */}
      <div className="sidebar-logo flex items-center justify-between px-4 py-3.5 border-b border-[#E2E8F0] bg-white">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-[#334155] flex items-center justify-center text-white flex-shrink-0 shadow-2xs">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z" fill="#D32F2F" stroke="#FFFFFF" strokeWidth="1" />
                <circle cx="12" cy="12" r="2.2" fill="#FFFFFF" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-[12.5px] font-black text-[#0F172A] tracking-wider uppercase flex items-center gap-1.5">
                <span>POLARIS</span>
                <span className="text-[9px] font-bold text-[#64748B]">CORE</span>
              </div>
              <div className="text-[10.5px] text-[#D32F2F] font-bold mt-0.5 tracking-wide flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                <span>{roleDisplayNames[role]}</span>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] transition-colors ml-auto cursor-pointer"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Nav Sections (Crisp White & Black) ────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-3">
        {groupedSections.map((section) => (
          <div key={section.section} className="space-y-0.5">
            {!collapsed && (
              <div className="px-3 text-[10px] font-black text-[#64748B] uppercase tracking-wider mb-1 mt-1">
                {section.section}
              </div>
            )}

            {section.items.map((item) => (
              <NavLink
                key={`${section.section}-${item.path}-${item.label}`}
                to={item.path}
                end={item.path === '/app/command-center'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-bold transition-all group ${
                    isActive
                      ? 'bg-[#FFEBEE] text-[#D32F2F] shadow-2xs border-l-4 border-[#D32F2F]'
                      : 'text-[#1E293B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                  }`
                }
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#D32F2F] text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ── Sidebar Footer ───────────────────────────────────────── */}
      {!collapsed && (
        <div className="border-t border-[#E2E8F0] px-4 py-3 bg-[#F8FAFC]">
          <p className="text-[#64748B] text-[11px] leading-tight font-medium">
            <strong className="text-[#0F172A] font-bold">Oil India Limited · Team POLARIS</strong><br />
            Baghewala Field Operations Platform
          </p>
        </div>
      )}
    </aside>
  );
};
