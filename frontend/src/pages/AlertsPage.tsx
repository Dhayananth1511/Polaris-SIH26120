import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, ShieldAlert, CheckCircle2, Filter, Search, 
  ArrowRight, RefreshCw, Zap, Sliders, Eye, BellRing, ChevronRight, Info
} from 'lucide-react';
import { ALERTS, WELLS } from '../data/mockData';
import type { AlertSeverity } from '../types';

interface ExtendedAlert {
  id: string;
  wellId: string;
  wellName: string;
  type: 'Fault Flag' | 'Threshold Breach' | 'Anomaly Alert' | 'Critical Operational';
  category: 'SRP Mechanical' | 'CSS Thermal' | 'Reservoir Fluid' | 'Sensor Hardware';
  message: string;
  severity: AlertSeverity;
  timestamp: string;
  acknowledged: boolean;
  rootCause: string;
  recommendedAction: string;
  metric: string;
  threshold: string;
  actual: string;
}

const EXTENDED_ALERTS: ExtendedAlert[] = [
  {
    id: 'ALT-101',
    wellId: 'BGW-014',
    wellName: 'Well BGW-014',
    type: 'Critical Operational',
    category: 'SRP Mechanical',
    message: 'Elevated polished rod load detected (6.3 kN vs 5.5 kN threshold)',
    severity: 'CRITICAL',
    timestamp: '12 min ago',
    acknowledged: false,
    rootCause: 'Heavy viscous oil accumulation in pump barrel causing fluid pound and high friction on upstroke.',
    recommendedAction: 'Reduce SPM from 5.8 to 5.1 and adjust VFD frequency to 36 Hz via SRP Optimizer.',
    metric: 'Peak Polished Rod Load',
    threshold: '5.50 kN',
    actual: '6.30 kN',
  },
  {
    id: 'ALT-102',
    wellId: 'BGW-021',
    wellName: 'Well BGW-021',
    type: 'Threshold Breach',
    category: 'CSS Thermal',
    message: 'Reservoir bottom-hole temperature declining faster than Boberg-Lantz model curve',
    severity: 'HIGH',
    timestamp: '34 min ago',
    acknowledged: false,
    rootCause: 'Heat loss to adjacent un-steamed shale overburden; thermal soak phase incomplete.',
    recommendedAction: 'Increase steam injection volume for next cycle to 780 tonnes or schedule localized re-steaming.',
    metric: 'Bottom-Hole Temp',
    threshold: '75.0 °C',
    actual: '69.4 °C',
  },
  {
    id: 'ALT-103',
    wellId: 'BGW-007',
    wellName: 'Well BGW-007',
    type: 'Anomaly Alert',
    category: 'Reservoir Fluid',
    message: 'Production rate 18% below expected XGBoost surrogate model baseline',
    severity: 'MEDIUM',
    timestamp: '1 hr ago',
    acknowledged: false,
    rootCause: 'Temporary sand influx near perforated interval restricting fluid inflow.',
    recommendedAction: 'Review sand screen differential pressure and perform backflush diagnostic.',
    metric: 'Oil Flow Rate',
    threshold: '110 BPD',
    actual: '91 BPD',
  },
  {
    id: 'ALT-104',
    wellId: 'BGW-003',
    wellName: 'Well BGW-003',
    type: 'Fault Flag',
    category: 'Sensor Hardware',
    message: 'Tubing head pressure transducer signal drift anomaly detected',
    severity: 'LOW',
    timestamp: '2 hrs ago',
    acknowledged: true,
    rootCause: 'Telemetry packet jitter and minor calibration offset on sensor transmitter TX-03.',
    recommendedAction: 'Calibrate transmitter zero-point during upcoming maintenance window.',
    metric: 'Transducer Voltage',
    threshold: '± 2.0%',
    actual: '+ 3.8%',
  },
  {
    id: 'ALT-105',
    wellId: 'BGW-019',
    wellName: 'Well BGW-019',
    type: 'Threshold Breach',
    category: 'CSS Thermal',
    message: 'Steam-to-Oil Ratio (SOR) elevated above operational ceiling of 6.5',
    severity: 'HIGH',
    timestamp: '3 hrs ago',
    acknowledged: false,
    rootCause: 'Low oil mobilization response due to high water saturation in upper pay zone.',
    recommendedAction: 'Trigger Joint Optimizer to re-evaluate steam cutoff threshold.',
    metric: 'Instantaneous SOR',
    threshold: '6.50',
    actual: '7.20',
  },
];

export const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<ExtendedAlert[]>(EXTENDED_ALERTS);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAlert, setActiveAlert] = useState<ExtendedAlert>(EXTENDED_ALERTS[0]);

  const handleAcknowledge = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
    if (activeAlert.id === id) {
      setActiveAlert(prev => ({ ...prev, acknowledged: true }));
    }
  };

  const handleAcknowledgeAll = () => {
    setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })));
    setActiveAlert(prev => ({ ...prev, acknowledged: true }));
  };

  const filteredAlerts = alerts.filter(a => {
    const matchSev = selectedSeverity === 'ALL' || a.severity === selectedSeverity;
    const matchType = selectedType === 'ALL' || a.type === selectedType;
    const matchSearch = a.wellId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        a.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        a.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSev && matchType && matchSearch;
  });

  const unreadCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="p-6 md:p-8 space-y-6 bg-white min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-pulse" />
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">Oil India Limited · Real-Time Governance</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            Field Alerts &amp; Diagnostic Events
          </h1>
          <p className="text-[14px] text-[#64748B] mt-0.5">
            Consolidated fault flags, parameter threshold breaches, AI anomaly detections &amp; critical operational alarms
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAcknowledgeAll}
            disabled={unreadCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#CBD5E1] rounded text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <span>Acknowledge All ({unreadCount})</span>
          </button>

          <button
            onClick={() => navigate('/app/approvals')}
            className="flex items-center gap-2 px-4 py-2 bg-[#D32F2F] text-white rounded text-[13px] font-semibold hover:bg-[#B71C1C] shadow-xs transition-colors cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>View Approvals</span>
          </button>
        </div>
      </div>

      {/* ── Summary Counters Strip ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Unacknowledged', val: unreadCount, color: '#DC2626', bg: '#FEE2E2', icon: <BellRing className="w-5 h-5 text-[#DC2626]" /> },
          { label: 'Critical Alarms', val: alerts.filter(a => a.severity === 'CRITICAL').length, color: '#DC2626', bg: '#FEF2F2', icon: <ShieldAlert className="w-5 h-5 text-[#DC2626]" /> },
          { label: 'High Thresholds', val: alerts.filter(a => a.severity === 'HIGH').length, color: '#D97706', bg: '#FEF3C7', icon: <AlertTriangle className="w-5 h-5 text-[#D97706]" /> },
          { label: 'Anomalies & Flags', val: alerts.filter(a => a.severity === 'MEDIUM' || a.severity === 'LOW').length, color: '#0284C7', bg: '#E0F2FE', icon: <Eye className="w-5 h-5 text-[#0284C7]" /> },
        ].map(card => (
          <div key={card.label} className="bg-white p-4 rounded border border-[#E2E8F0] shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">{card.label}</span>
              <p className="text-2xl font-black text-[#0F172A] mt-1">{card.val}</p>
            </div>
            <div className="p-2.5 rounded-lg" style={{ backgroundColor: card.bg }}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main 2-Column Interface: Alert List on Left, Detail & Root Cause on Right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Filterable Alert Stream (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded border border-[#E2E8F0] shadow-sm flex flex-col">
          
          {/* Controls Bar */}
          <div className="p-4 border-b border-[#F1F5F9] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Severity chips */}
              <div className="flex items-center bg-[#F1F5F9] p-1 rounded text-[12px] font-bold">
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSeverity(s)}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      selectedSeverity === s ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search well or alert..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-[12px] bg-white border border-[#CBD5E1] rounded focus:outline-none focus:border-[#D32F2F] w-48"
                />
              </div>
            </div>

            {/* Type selector chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold text-[#64748B]">
              <span className="text-[#94A3B8] text-[10px] uppercase font-bold mr-1">Type:</span>
              {['ALL', 'Critical Operational', 'Threshold Breach', 'Anomaly Alert', 'Fault Flag'].map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-2.5 py-1 rounded-full transition-colors whitespace-nowrap ${
                    selectedType === t ? 'bg-[#0F172A] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-[#F1F5F9] max-h-[620px] overflow-y-auto">
            {filteredAlerts.length === 0 ? (
              <div className="p-12 text-center text-[#64748B]">
                <p className="text-[14px]">No alerts match the selected filters.</p>
              </div>
            ) : (
              filteredAlerts.map(a => {
                const isSelected = activeAlert.id === a.id;
                return (
                  <div
                    key={a.id}
                    onClick={() => setActiveAlert(a)}
                    className={`p-4 transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected ? 'bg-[#FFF5F5] border-l-4 border-[#D32F2F]' : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                        a.severity === 'CRITICAL' ? 'bg-[#DC2626] animate-pulse' :
                        a.severity === 'HIGH' ? 'bg-[#EA580C]' :
                        a.severity === 'MEDIUM' ? 'bg-[#CA8A04]' : 'bg-[#16A34A]'
                      }`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <strong className="font-bold text-[#0F172A] text-[14px]">{a.wellId}</strong>
                          <span className="text-[11px] font-semibold text-[#64748B]">· {a.category}</span>
                          {!a.acknowledged && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FEE2E2] text-[#DC2626]">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-[#334155] mt-1 line-clamp-2">{a.message}</p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-[#94A3B8]">
                          <span>{a.timestamp}</span>
                          <span>•</span>
                          <span>{a.type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.severity === 'CRITICAL' ? 'bg-[#FEE2E2] text-[#DC2626]' :
                        a.severity === 'HIGH' ? 'bg-[#FFEDD5] text-[#C2410C]' :
                        a.severity === 'MEDIUM' ? 'bg-[#FEF9C3] text-[#A16207]' : 'bg-[#DCFCE7] text-[#15803D]'
                      }`}>
                        {a.severity}
                      </span>
                      <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-[#D32F2F]' : 'text-[#CBD5E1]'}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Right Column: Active Alert Deep Dive & AI Diagnostic (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-5">
          
          <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full ${
                activeAlert.severity === 'CRITICAL' ? 'bg-[#DC2626]' :
                activeAlert.severity === 'HIGH' ? 'bg-[#EA580C]' : 'bg-[#CA8A04]'
              }`} />
              <div>
                <h3 className="text-[17px] font-bold text-[#0F172A]">{activeAlert.wellName} Event</h3>
                <p className="text-[12px] text-[#64748B]">{activeAlert.category} · {activeAlert.type}</p>
              </div>
            </div>

            <span className="text-[12px] text-[#94A3B8] font-medium">{activeAlert.timestamp}</span>
          </div>

          {/* Metric Deviation Card */}
          <div className="p-4 rounded bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide">Telemetry Deviation</span>
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2 rounded bg-white border border-[#E2E8F0]">
                <span className="text-[10px] text-[#94A3B8] uppercase block">Parameter</span>
                <strong className="text-[12px] text-[#0F172A]">{activeAlert.metric}</strong>
              </div>
              <div className="p-2 rounded bg-white border border-[#E2E8F0]">
                <span className="text-[10px] text-[#94A3B8] uppercase block">Normal Limit</span>
                <strong className="text-[12px] text-[#16A34A]">{activeAlert.threshold}</strong>
              </div>
              <div className="p-2 rounded bg-white border border-[#FCA5A5] bg-[#FEF2F2]">
                <span className="text-[10px] text-[#DC2626] uppercase block">Actual</span>
                <strong className="text-[12px] text-[#DC2626] font-black">{activeAlert.actual}</strong>
              </div>
            </div>
          </div>

          {/* Root Cause Analysis (AI / Physics) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#0284C7]" />
              <h4 className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">Root Cause Diagnosis</h4>
            </div>
            <p className="text-[13px] text-[#334155] leading-relaxed p-3.5 bg-[#F0F9FF] border border-[#BAE6FD] rounded">
              {activeAlert.rootCause}
            </p>
          </div>

          {/* Recommended Action */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#D32F2F]" />
              <h4 className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">AI Recommended Action</h4>
            </div>
            <p className="text-[13px] text-[#334155] leading-relaxed p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded">
              {activeAlert.recommendedAction}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#F1F5F9] flex flex-col gap-2.5">
            {!activeAlert.acknowledged ? (
              <button
                onClick={() => handleAcknowledge(activeAlert.id)}
                className="w-full py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded text-[13px] font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Acknowledge Alert</span>
              </button>
            ) : (
              <div className="p-2 bg-[#DCFCE7] text-[#15803D] text-center text-[12px] font-bold rounded flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Acknowledged by Operational Staff</span>
              </div>
            )}

            <button
              onClick={() => navigate(`/app/digital-twin?well=${activeAlert.wellId}`)}
              className="w-full py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded text-[13px] font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Inspect in Digital Twin</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
