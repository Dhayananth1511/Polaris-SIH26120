import React from 'react';
import type { AlertSeverity, RiskLevel, WellStatus } from '../../types';

// ─── Status Dot ───────────────────────────────────────────────────────────
interface StatusDotProps { status: WellStatus | string; size?: 'sm' | 'md'; }
export const StatusDot: React.FC<StatusDotProps> = ({ status, size = 'md' }) => {
  const colorMap: Record<string, string> = {
    Producing: 'bg-[#2E7D32]', Normal: 'bg-[#2E7D32]',
    Attention: 'bg-[#E65100]', Warning: 'bg-[#E65100]',
    Critical:  'bg-[#D32F2F]',
    'Shut-in': 'bg-[#94A3B8]', Offline: 'bg-[#94A3B8]',
  };
  const sz = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  return <span className={`inline-block rounded-full flex-shrink-0 ${sz} ${colorMap[status] ?? 'bg-gray-400'}`} />;
};

// ─── Badge ─────────────────────────────────────────────────────────────────
type BadgeVariant = 'normal' | 'warning' | 'critical' | 'info' | 'muted';
interface BadgeProps { children: React.ReactNode; variant: BadgeVariant; className?: string; }
export const Badge: React.FC<BadgeProps> = ({ children, variant, className = '' }) => (
  <span className={`badge-${variant} inline-flex items-center px-2 py-0.5 rounded text-[0.68rem] font-semibold ${className}`}>
    {children}
  </span>
);

export const riskVariant = (risk: RiskLevel | string): BadgeVariant =>
  ({ Low: 'normal', Medium: 'warning', High: 'critical', Critical: 'critical' }[risk] ?? 'muted') as BadgeVariant;

export const severityVariant = (sev: AlertSeverity | string): BadgeVariant =>
  ({ LOW: 'normal', MEDIUM: 'warning', HIGH: 'critical', CRITICAL: 'critical' }[sev] ?? 'muted') as BadgeVariant;

export const wellStatusVariant = (s: WellStatus | string): BadgeVariant =>
  ({ Producing: 'normal', Attention: 'warning', Critical: 'critical', 'Shut-in': 'muted' }[s] ?? 'muted') as BadgeVariant;

// ─── Card ──────────────────────────────────────────────────────────────────
interface CardProps { children: React.ReactNode; className?: string; padding?: string; }
export const Card: React.FC<CardProps> = ({ children, className = '', padding = 'p-4' }) => (
  <div className={`card ${padding} ${className}`}>{children}</div>
);

// ─── Section Header ────────────────────────────────────────────────────────
interface SectionHeaderProps { title: string; subtitle?: string; action?: React.ReactNode; }
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h2 className="text-section-head">{title}</h2>
      {subtitle && <p className="text-meta mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

// ─── KPI Card ──────────────────────────────────────────────────────────────
interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  deltaDirection?: 'up' | 'down';
  icon?: React.ReactNode;
  status?: 'normal' | 'warning' | 'critical' | 'info';
  className?: string;
}
export const KPICard: React.FC<KPICardProps> = ({
  label, value, unit, delta, deltaDirection, icon, status, className = ''
}) => {
  const borderMap = { normal: 'border-t-[#2E7D32]', warning: 'border-t-[#E65100]', critical: 'border-t-[#D32F2F]', info: 'border-t-[#1565C0]' };
  const borderClass = status ? `border-t-2 ${borderMap[status]}` : '';
  return (
    <div className={`kpi-card ${borderClass} ${className}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-label">{label}</span>
        {icon && <span className="text-[#64748B] opacity-70">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="kpi-value">{value}</span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {delta && (
        <p className={`mt-1 ${deltaDirection === 'up' ? 'kpi-delta-up' : 'kpi-delta-down'}`}>
          {deltaDirection === 'up' ? '▲' : '▼'} {delta}
        </p>
      )}
    </div>
  );
};

// ─── Risk Bar ──────────────────────────────────────────────────────────────
interface RiskBarProps { value: number; max?: number; }
export const RiskBar: React.FC<RiskBarProps> = ({ value, max = 1 }) => {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct < 30 ? '#16805C' : pct < 60 ? '#D97706' : '#DC2626';
  return (
    <div className="risk-bar w-full">
      <div className="risk-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
};

// ─── Tab List ─────────────────────────────────────────────────────────────
interface TabListProps { tabs: string[]; active: string; onChange: (t: string) => void; }
export const TabList: React.FC<TabListProps> = ({ tabs, active, onChange }) => (
  <div className="tab-list">
    {tabs.map((t) => (
      <button key={t} className={`tab-btn ${active === t ? 'active' : ''}`} onClick={() => onChange(t)}>
        {t}
      </button>
    ))}
  </div>
);

// ─── Spinner ──────────────────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <div className="spinner" style={{ width: size, height: size }} />
);

// ─── Alert Banner ─────────────────────────────────────────────────────────
interface AlertBannerProps { type: 'info' | 'warning' | 'critical' | 'success'; children: React.ReactNode; }
export const AlertBanner: React.FC<AlertBannerProps> = ({ type, children }) => (
  <div className={`alert-banner ${type}`}>{children}</div>
);

// ─── Prototype Disclaimer ─────────────────────────────────────────────────
export const PrototypeBanner: React.FC = () => (
  <div className="bg-[#FFF7ED] border-b border-[#FFCC80] px-4 py-1.5 text-[0.7rem] text-[#92400E] flex items-center justify-between">
    <span>⚠ Prototype Environment — Synthetic Data Only — Not connected to live field systems</span>
    <span className="text-[#FFCC80] font-medium">Baghewala Field | Oil India Limited</span>
  </div>
);

// ─── Metric Row ──────────────────────────────────────────────────────────
interface MetricRowProps { label: string; value: string | number; unit?: string; highlight?: boolean; }
export const MetricRow: React.FC<MetricRowProps> = ({ label, value, unit, highlight }) => (
  <div className={`flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0 ${highlight ? 'bg-blue-50 -mx-3 px-3' : ''}`}>
    <span className="text-meta">{label}</span>
    <span className={`text-[0.82rem] font-semibold ${highlight ? 'text-[var(--petroleum)]' : 'text-[var(--text)]'}`}>
      {value}{unit && <span className="text-meta font-normal ml-1">{unit}</span>}
    </span>
  </div>
);

// ─── Empty State ─────────────────────────────────────────────────────────
interface EmptyStateProps { message: string; sub?: string; }
export const EmptyState: React.FC<EmptyStateProps> = ({ message, sub }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
      <span className="text-[var(--muted)] text-lg">—</span>
    </div>
    <p className="text-card-head text-[var(--muted)]">{message}</p>
    {sub && <p className="text-meta mt-1">{sub}</p>}
  </div>
);

// ─── Delta Indicator ─────────────────────────────────────────────────────
interface DeltaProps { value: number; unit?: string; goodDirection?: 'up' | 'down'; }
export const Delta: React.FC<DeltaProps> = ({ value, unit = '%', goodDirection = 'up' }) => {
  const isGood = goodDirection === 'up' ? value >= 0 : value <= 0;
  const color = isGood ? 'text-[#16805C]' : 'text-[#DC2626]';
  const arrow = value >= 0 ? '▲' : '▼';
  return (
    <span className={`text-[0.75rem] font-semibold ${color}`}>
      {arrow} {Math.abs(value).toFixed(1)}{unit}
    </span>
  );
};
