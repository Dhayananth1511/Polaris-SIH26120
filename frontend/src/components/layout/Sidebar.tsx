import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Activity, Cpu, Brain, Sliders, CheckSquare,
  FileText, Users, Database, Settings,
  GitBranch, AlertTriangle, Layers, Shield, Zap,
  PanelLeftClose, PanelLeft, X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import type { UserRole } from '../../types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
  badge?: string;
  section?: string;
}

const ROLE_NAV_ITEMS: Record<UserRole, NavItem[]> = {
  // ── 1. OPERATOR (12 Canonical SIH26120 Pages) ─────────────────────────
  operator: [
    { label: 'Overview', path: '/app/overview', icon: <LayoutDashboard className="w-5.5 h-5.5" />, roles: ['operator'], section: 'DIGITAL TWIN PLATFORM' },
    { label: 'Well Explorer', path: '/app/wells', icon: <Database className="w-5.5 h-5.5" />, roles: ['operator'], section: 'DIGITAL TWIN PLATFORM' },
    { label: 'Digital Twin', path: '/app/digital-twin', icon: <Layers className="w-5.5 h-5.5" />, roles: ['operator'], section: 'DIGITAL TWIN PLATFORM' },
    { label: 'Reservoir', path: '/app/reservoir', icon: <Activity className="w-5.5 h-5.5" />, roles: ['operator'], section: 'DIGITAL TWIN PLATFORM' },
    { label: 'CSS Optimization', path: '/app/css-optimizer', icon: <Zap className="w-5.5 h-5.5" />, roles: ['operator'], section: 'OPTIMIZATION & KINEMATICS' },
    { label: 'SRP Diagnostics', path: '/app/srp-diagnostics', icon: <Sliders className="w-5.5 h-5.5" />, roles: ['operator'], section: 'OPTIMIZATION & KINEMATICS' },
    { label: 'SRP Optimization', path: '/app/srp-optimizer', icon: <Cpu className="w-5.5 h-5.5" />, roles: ['operator'], section: 'OPTIMIZATION & KINEMATICS' },
    { label: 'Joint Optimization', path: '/app/joint-optimizer', icon: <GitBranch className="w-5.5 h-5.5" />, roles: ['operator'], section: 'OPTIMIZATION & KINEMATICS' },
    { label: 'What-If Simulator', path: '/app/what-if', icon: <Cpu className="w-5.5 h-5.5" />, roles: ['operator'], section: 'SIMULATION & INTELLIGENCE' },
    { label: 'Alerts', path: '/app/alerts', icon: <AlertTriangle className="w-5.5 h-5.5" />, roles: ['operator'], badge: '4', section: 'SIMULATION & INTELLIGENCE' },
    { label: 'Historical', path: '/app/historical-analysis', icon: <FileText className="w-5.5 h-5.5" />, roles: ['operator'], section: 'GOVERNANCE & AUDIT' },
    { label: 'Recommendations', path: '/app/recommendations', icon: <Brain className="w-5.5 h-5.5" />, roles: ['operator'], badge: '2', section: 'GOVERNANCE & AUDIT' },
  ],

  // ── 2. SYSTEM ADMINISTRATOR ──────────────────────────────────────────────
  admin: [
    { label: 'Users & Roles', path: '/app/admin/users', icon: <Users className="w-6 h-6" />, roles: ['admin'], section: 'ADMINISTRATION' },
    { label: 'Data Management', path: '/app/admin/data', icon: <Database className="w-6 h-6" />, roles: ['admin'], section: 'ADMINISTRATION' },
    { label: 'Models & Engines', path: '/app/admin/models', icon: <Cpu className="w-6 h-6" />, roles: ['admin'], section: 'ADMINISTRATION' },
    { label: 'System Health', path: '/app/admin/health', icon: <Activity className="w-6 h-6" />, roles: ['admin'], section: 'SYSTEM' },
    { label: 'Well Configuration', path: '/app/admin/config', icon: <Settings className="w-6 h-6" />, roles: ['admin'], section: 'SYSTEM' },
    { label: 'Audit Logs', path: '/app/admin/audit', icon: <Shield className="w-6 h-6" />, roles: ['admin'], section: 'GOVERNANCE' },
    { label: 'Alerts', path: '/app/alerts', icon: <AlertTriangle className="w-6 h-6" />, roles: ['admin'], badge: '4', section: 'GOVERNANCE' },
    { label: 'Reports', path: '/app/reports', icon: <FileText className="w-6 h-6" />, roles: ['admin'], section: 'GOVERNANCE' },
  ],
};

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, closeMobileMenu } = useUIStore();
  const role = (user?.role || 'operator') as UserRole;

  // Get nav items for the active role
  const navItems = ROLE_NAV_ITEMS[role] || ROLE_NAV_ITEMS.operator;

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

  return (
    <>
      {/* ── 1. DESKTOP SIDEBAR (Visible ONLY on Desktop >= lg, takes 0px space on Mobile) ── */}
      <aside
        className={`
          hidden lg:flex flex-col flex-shrink-0 h-full bg-white text-[#0F172A] border-r border-[#E2E8F0] select-none transition-all duration-300 overflow-hidden
          ${sidebarCollapsed ? 'w-[76px] min-w-[76px] max-w-[76px]' : 'w-[280px] min-w-[280px] max-w-[280px]'}
        `}
      >
        {/* Desktop Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E2E8F0] bg-white min-h-[56px] flex-shrink-0">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse flex-shrink-0" />
              <span className="text-[13px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap truncate">
                {role === 'admin' ? 'Administration Menu' : 'Operations Menu'}
              </span>
            </div>
          )}

          {/* Desktop Toggle Button */}
          <button
            onClick={toggleSidebar}
            className={`p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer ${
              sidebarCollapsed ? 'mx-auto' : 'ml-auto'
            }`}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeft className="w-5.5 h-5.5" /> : <PanelLeftClose className="w-5.5 h-5.5" />}
          </button>
        </div>

        {/* Desktop Nav Items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3.5 px-3 space-y-4">
          {groupedSections.map((section) => (
            <div key={section.section} className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3 text-[12px] font-black text-[#64748B] uppercase tracking-wider mb-2 mt-1 whitespace-nowrap">
                  {section.section}
                </div>
              )}

              {section.items.map((item) => (
                <NavLink
                  key={`${section.section}-${item.path}-${item.label}`}
                  to={item.path}
                  end={item.path === '/app/command-center'}
                  className={({ isActive }) =>
                    `flex items-center gap-3.5 rounded-xl text-[16px] font-bold transition-all group whitespace-nowrap ${
                      sidebarCollapsed
                        ? 'justify-center px-0 py-3.5'
                        : 'px-3.5 py-3'
                    } ${
                      isActive
                        ? 'bg-[#FFEBEE] text-[#D32F2F] shadow-xs border-l-4 border-[#D32F2F]'
                        : 'text-[#1E293B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                    }`
                  }
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0 text-current flex items-center justify-center">{item.icon}</span>
                  {!sidebarCollapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="truncate whitespace-nowrap">{item.label}</span>
                      {item.badge && (
                        <span className="ml-2 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#D32F2F] text-white flex-shrink-0 shadow-2xs">
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

        {/* Desktop Footer */}
        {!sidebarCollapsed && (
          <div className="border-t border-[#E2E8F0] px-4 py-3.5 bg-[#F8FAFC] flex-shrink-0">
            <p className="text-[#64748B] text-[12.5px] leading-relaxed font-medium whitespace-nowrap truncate">
              <strong className="text-[#0F172A] font-bold">Oil India Limited · Team POLARIS</strong><br />
              <span className="text-[11.5px] text-[#64748B]">Baghewala Operations Platform</span>
            </p>
          </div>
        )}
      </aside>

      {/* ── 2. MOBILE DRAWER OVERLAY (Visible ONLY on Mobile < lg when open) ── */}
      <div 
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
          mobileMenuOpen ? 'pointer-events-auto visible opacity-100' : 'pointer-events-none invisible opacity-0'
        }`}
      >
        {/* Dark Backdrop */}
        <div
          onClick={closeMobileMenu}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity cursor-pointer"
          aria-hidden="true"
        />

        {/* Off-canvas Sliding Drawer */}
        <aside
          className={`
            relative z-10 h-full w-[320px] max-w-[85vw] bg-white text-[#0F172A] shadow-2xl flex flex-col transition-transform duration-300 ease-out overflow-hidden
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* Mobile Drawer Top Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E2E8F0] bg-white min-h-[56px] flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse flex-shrink-0" />
              <span className="text-[13px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap truncate">
                {role === 'admin' ? 'Administration Menu' : 'Operations Menu'}
              </span>
            </div>

            {/* Mobile Close X Button */}
            <button
              onClick={closeMobileMenu}
              className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer ml-auto"
              title="Close navigation menu"
            >
              <X className="w-6 h-6 text-[#1E293B]" />
            </button>
          </div>

          {/* Mobile Nav Items */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3.5 px-3 space-y-4">
            {groupedSections.map((section) => (
              <div key={section.section} className="space-y-1">
                <div className="px-3 text-[12px] font-black text-[#64748B] uppercase tracking-wider mb-2 mt-1 whitespace-nowrap">
                  {section.section}
                </div>

                {section.items.map((item) => (
                  <NavLink
                    key={`mobile-${section.section}-${item.path}-${item.label}`}
                    to={item.path}
                    end={item.path === '/app/command-center'}
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-[16px] font-bold transition-all group whitespace-nowrap ${
                        isActive
                          ? 'bg-[#FFEBEE] text-[#D32F2F] shadow-xs border-l-4 border-[#D32F2F]'
                          : 'text-[#1E293B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                      }`
                    }
                  >
                    <span className="flex-shrink-0 text-current flex items-center justify-center">{item.icon}</span>
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="truncate whitespace-nowrap">{item.label}</span>
                      {item.badge && (
                        <span className="ml-2 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#D32F2F] text-white flex-shrink-0 shadow-2xs">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          {/* Mobile Footer */}
          <div className="border-t border-[#E2E8F0] px-4 py-3.5 bg-[#F8FAFC] flex-shrink-0">
            <p className="text-[#64748B] text-[12.5px] leading-relaxed font-medium whitespace-nowrap truncate">
              <strong className="text-[#0F172A] font-bold">Oil India Limited · Team POLARIS</strong><br />
              <span className="text-[11.5px] text-[#64748B]">Baghewala Operations Platform</span>
            </p>
          </div>
        </aside>
      </div>
    </>
  );
};
