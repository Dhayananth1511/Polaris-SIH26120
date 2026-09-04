import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Activity, Cpu, Brain, Sliders, CheckSquare,
  FileText, Users, Database, Settings, ChevronLeft, ChevronRight,
  GitBranch, AlertTriangle, BarChart2, Layers, Shield, Zap,
  TrendingUp, Eye
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
  sub?: boolean;
}

interface NavSection {
  section: string;
  items: NavItem[];
  roles: UserRole[];
}

const NAV: NavSection[] = [
  {
    section: 'Command Center',
    roles: ['production_engineer', 'field_manager', 'administrator'],
    items: [
      { label: 'Overview', path: '/app/command-center', icon: <LayoutDashboard className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'] },
      { label: 'Field Status', path: '/app/field-status', icon: <Map className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'] },
    ],
  },
  {
    section: 'Field Operations',
    roles: ['production_engineer', 'field_manager', 'administrator'],
    items: [
      { label: 'Well Explorer', path: '/app/well-explorer', icon: <Activity className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'] },
      { label: 'Production', path: '/app/production', icon: <TrendingUp className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'] },
      { label: 'CSS Operations', path: '/app/css-operations', icon: <Zap className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'] },
      { label: 'SRP Operations', path: '/app/srp-operations', icon: <Sliders className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'] },
    ],
  },
  {
    section: 'Digital Twin',
    roles: ['production_engineer', 'field_manager', 'administrator'],
    items: [
      { label: 'Well Digital Twin', path: '/app/digital-twin', icon: <Layers className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'] },
      { label: 'Simulation Lab', path: '/app/simulation-lab', icon: <Cpu className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'] },
    ],
  },
  {
    section: 'AI Intelligence',
    roles: ['production_engineer', 'field_manager', 'administrator'],
    items: [
      { label: 'Production Forecast', path: '/app/ai/forecast', icon: <TrendingUp className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'], sub: true },
      { label: 'Failure Prediction', path: '/app/ai/failure', icon: <AlertTriangle className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'], sub: true },
      { label: 'Anomaly Detection', path: '/app/ai/anomaly', icon: <Eye className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'], sub: true },
      { label: 'Explainability', path: '/app/ai/explain', icon: <Brain className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'], sub: true },
    ],
  },
  {
    section: 'Optimization',
    roles: ['production_engineer', 'field_manager', 'administrator'],
    items: [
      { label: 'CSS Optimizer', path: '/app/css-optimizer', icon: <Zap className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'] },
      { label: 'SRP Optimizer', path: '/app/srp-optimizer', icon: <Sliders className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'] },
      { label: 'Joint Optimization', path: '/app/joint-optimizer', icon: <GitBranch className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'] },
    ],
  },
  {
    section: 'Governance',
    roles: ['production_engineer', 'field_manager', 'administrator'],
    items: [
      { label: 'Recommendations', path: '/app/recommendations', icon: <BarChart2 className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'] },
      { label: 'Pending Approvals', path: '/app/approvals', icon: <CheckSquare className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'] },
      { label: 'Audit Logs', path: '/app/audit-logs', icon: <Shield className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'] },
      { label: 'Reports', path: '/app/reports', icon: <FileText className="icon" />, roles: ['production_engineer', 'field_manager', 'administrator'] },
    ],
  },
  {
    section: 'Administration',
    roles: ['administrator'],
    items: [
      { label: 'Users', path: '/app/admin/users', icon: <Users className="icon" />, roles: ['administrator'] },
      { label: 'Data Management', path: '/app/admin/data', icon: <Database className="icon" />, roles: ['administrator'] },
      { label: 'Models', path: '/app/admin/models', icon: <Brain className="icon" />, roles: ['administrator'] },
      { label: 'System Health', path: '/app/admin/health', icon: <Activity className="icon" />, roles: ['administrator'] },
      { label: 'Configuration', path: '/app/admin/config', icon: <Settings className="icon" />, roles: ['administrator'] },
      { label: 'Audit Logs', path: '/app/audit-logs', icon: <Shield className="icon" />, roles: ['administrator'] },
      { label: 'Reports', path: '/app/reports', icon: <FileText className="icon" />, roles: ['administrator'] },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const role = user?.role as UserRole;

  const visibleSections = NAV.filter(s => s.roles.includes(role));

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} flex flex-col`}>
      {/* Collapse toggle */}
      <div className="sidebar-logo flex items-center justify-between">
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-[13px] font-black text-[#0F172A] tracking-wider uppercase">Baghewala Field</div>
            <div className="text-[11px] text-[#5B728D] font-semibold mt-0.5">Digital Operations Core</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded hover:bg-[#D4E6F6] text-[#475569] hover:text-[#0F172A] transition-colors ml-auto"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {visibleSections.map((section) => {
          const visibleItems = section.items.filter(i => i.roles.includes(role));
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.section} className="mb-2">
              {!collapsed && (
                <div className="sidebar-section-label">{section.section}</div>
              )}
              {visibleItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/app/command-center'}
                  className={({ isActive }) =>
                    `sidebar-item ${item.sub && !collapsed ? 'sidebar-sub-item' : ''} ${isActive ? 'active' : ''}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-[#D6E4F0] px-5 py-4 bg-[#DFEDF8]/40">
          <p className="text-[#5B728D] leading-relaxed" style={{ fontSize: '12px' }}>
            <strong className="text-[#0F172A] font-bold">Oil India Limited</strong><br />
            Baghewala Field Operations Platform
          </p>
        </div>
      )}
    </aside>
  );
};
