import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, AlertTriangle, ArrowUpRight, CheckCircle2, ChevronRight, 
  Cpu, Download, Filter, Gauge, Layers, Play, RefreshCw, Search, ShieldAlert, Zap,
  Droplets, Flame, Settings, TrendingDown, Thermometer, Radio, Eye, Brain,
  Check, ArrowRight, X, Sliders, ShieldCheck, Compass
} from 'lucide-react';
import { WELLS, ALERTS, FIELD_STATS, FIELD_PRODUCTION_TREND } from '../data/mockData';
import { FieldMapBaghewala } from '../components/map/FieldMapBaghewala';

export const CommandCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [alertsList, setAlertsList] = useState(ALERTS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trendRange, setTrendRange] = useState('Last 30 Days');
  const [showExplainModal, setShowExplainModal] = useState(false);

  // Filter wells
  const filteredWells = WELLS.filter(w => {
    const matchStatus = selectedStatus === 'ALL' || w.status.toUpperCase() === selectedStatus.toUpperCase();
    const matchSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        w.reservoir.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleAcknowledge = (id: string) => {
    setAlertsList(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-white min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-[12px] font-black tracking-wider text-[#D32F2F] uppercase">Oil India Limited · Team POLARIS</span>
            <span className="text-[#CBD5E1]">|</span>
            <span className="text-[11px] font-bold text-[#64748B]">Digital Twin AI Platform</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            Baghewala Field — Operational Command Center
          </h1>
          <p className="text-[14px] text-[#64748B] mt-0.5">
            Real-time telemetry, spatial well mapping, CSS thermal cycles &amp; SRP optimization
          </p>
        </div>

      </div>

      {/* ── 4 Key Performance Metrics Row ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Production', val: '2,840', unit: 'BPD', sub: '+8.4% WoW', subColor: '#15803D', icon: <Layers className="w-5 h-5 text-[#15803D]" />, bg: '#E8F5E9' },
          { label: 'Average SOR', val: '5.8', unit: 'SOR', sub: '-10.2% Efficiency', subColor: '#15803D', icon: <Flame className="w-5 h-5 text-[#EA580C]" />, bg: '#FFEDD5' },
          { label: 'Energy Consumption', val: '42', unit: 'kWh/bbl', sub: '-7.1% Power', subColor: '#15803D', icon: <Zap className="w-5 h-5 text-[#D97706]" />, bg: '#FEF3C7' },
          { label: 'Equipment Health', val: '94%', unit: '23 Wells', sub: '23 Monitored Online', subColor: '#15803D', icon: <Activity className="w-5 h-5 text-[#0284C7]" />, bg: '#E0F2FE' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-5 rounded border border-[#E2E8F0] shadow-xs hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold text-[#64748B] uppercase tracking-wide">{kpi.label}</span>
              <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: kpi.bg }}>
                {kpi.icon}
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#0F172A]">{kpi.val}</span>
              <span className="text-[13px] text-[#64748B] font-bold">{kpi.unit}</span>
            </div>
            <p className="text-[12px] font-bold mt-2" style={{ color: kpi.subColor }}>
              {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* ── HIGH-LEVEL OPERATIONAL STATUS HIGHLIGHTS (CSS + SRP + AI REC) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* CSS Thermal Cycle Status */}
        <div className="bg-white p-4.5 rounded border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#EA580C]" />
                <h3 className="text-[14px] font-bold text-[#0F172A]">Current CSS Cycle Status</h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#FFEDD5] text-[#C2410C]">
                Cycle #3 Active
              </span>
            </div>
            <p className="text-[12px] text-[#475569] mb-3">
              Well <strong>BGW-014</strong> is currently in <strong>Production Phase</strong> following 735t steam injection &amp; 64h soak.
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px] p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
              <div>
                <span className="text-[#94A3B8] block text-[10px]">Steam Injected</span>
                <strong className="text-[#0F172A]">735 t</strong>
              </div>
              <div>
                <span className="text-[#94A3B8] block text-[10px]">Peak Temp</span>
                <strong className="text-[#EA580C]">142 °C</strong>
              </div>
              <div>
                <span className="text-[#94A3B8] block text-[10px]">Cumulative Oil</span>
                <strong className="text-[#16A34A]">1,840 bbl</strong>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/app/css-operations')}
            className="mt-3 text-[12px] font-bold text-[#D32F2F] hover:text-[#B71C1C] flex items-center gap-1"
          >
            <span>View CSS Operations</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* SRP Health & Diagnostics */}
        <div className="bg-white p-4.5 rounded border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#0284C7]" />
                <h3 className="text-[14px] font-bold text-[#0F172A]">SRP Mechanical Health</h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#E0F2FE] text-[#0369A1]">
                94% Overall Health
              </span>
            </div>
            <p className="text-[12px] text-[#475569] mb-3">
              Surface unit running at <strong>5.1 SPM</strong> with 66" stroke. Dynamometer card indicates minor fluid pound under high viscosity.
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px] p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
              <div>
                <span className="text-[#94A3B8] block text-[10px]">Polished Rod Load</span>
                <strong className="text-[#DC2626]">6.3 kN</strong>
              </div>
              <div>
                <span className="text-[#94A3B8] block text-[10px]">Pump Efficiency</span>
                <strong className="text-[#0F172A]">62 %</strong>
              </div>
              <div>
                <span className="text-[#94A3B8] block text-[10px]">VFD Inverter</span>
                <strong className="text-[#16A34A]">36 Hz</strong>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/app/srp-diagnostics')}
            className="mt-3 text-[12px] font-bold text-[#D32F2F] hover:text-[#B71C1C] flex items-center gap-1"
          >
            <span>Inspect SRP Diagnostics</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Latest AI Recommendation */}
        <div className="bg-white p-4.5 rounded border border-[#E2E8F0] shadow-sm flex flex-col justify-between border-l-4 border-l-[#D32F2F]">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#D32F2F]" />
                <h3 className="text-[14px] font-bold text-[#0F172A]">Latest AI Recommendation</h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#FEF2F2] text-[#DC2626]">
                Pending Approval
              </span>
            </div>
            <strong className="text-[13px] text-[#0F172A] block mb-1">
              Well BGW-014: Reduce SPM to 5.1 &amp; VFD to 36 Hz
            </strong>
            <p className="text-[12px] text-[#475569] leading-relaxed mb-3">
              Expected Impact: <strong className="text-[#15803D]">+14% Net Oil Rate</strong>, <strong className="text-[#15803D]">-8% Rod Tension</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-[#F1F5F9]">
            <button
              onClick={() => setShowExplainModal(true)}
              className="flex-1 py-1.5 px-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] rounded text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Explain Why (SHAP)</span>
            </button>
            <button
              onClick={() => navigate('/app/approvals')}
              className="flex-1 py-1.5 px-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Review / Approve</span>
            </button>
          </div>
        </div>

      </div>

      {/* ── Main 2-Column Grid: Field Map on Left, Trends & Alerts on Right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Column: Interactive Field Map */}
        <div className="h-full min-h-[520px]">
          <FieldMapBaghewala onSelectWell={(w) => navigate(`/app/digital-twin?well=${w.id}`)} />
        </div>

        {/* Right Column: Production Trend & Recent Alerts */}
        <div className="flex flex-col gap-6 justify-between">
          
          {/* Top Card: Production Trend (Field) */}
          <div className="bg-white p-5 rounded border border-[#E2E8F0] shadow-sm flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#F1F5F9]">
              <div>
                <h3 className="text-[16px] font-bold text-[#0F172A]">Field Production Trend vs AI Surrogate</h3>
                <span className="text-[11px] text-[#64748B]">Boberg-Lantz Thermal Baseline + XGBoost Residuals</span>
              </div>
              <select 
                value={trendRange}
                onChange={e => setTrendRange(e.target.value)}
                className="text-[12px] font-semibold text-[#475569] bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2.5 py-1 focus:outline-none cursor-pointer"
              >
                <option>Last 30 Days</option>
                <option>Last 14 Days</option>
                <option>Last 7 Days</option>
              </select>
            </div>

            {/* SVG Trend Chart */}
            <div className="relative h-48 w-full pt-2">
              <svg viewBox="0 0 500 170" className="w-full h-full overflow-visible">
                {[
                  { y: 20, label: '4K' },
                  { y: 60, label: '3K' },
                  { y: 100, label: '2K' },
                  { y: 140, label: '1K' },
                ].map(grid => (
                  <g key={grid.y}>
                    <line x1="35" y1={grid.y} x2="490" y2={grid.y} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                    <text x="5" y={grid.y + 4} fill="#94A3B8" fontSize="10" fontWeight="bold">{grid.label}</text>
                  </g>
                ))}

                <text 
                  x="-85" 
                  y="12" 
                  transform="rotate(-90)" 
                  fill="#64748B" 
                  fontSize="9" 
                  fontWeight="bold" 
                  textAnchor="middle"
                >
                  Production (BPD)
                </text>

                {/* Blue Trend Line */}
                <path
                  d="M 45,102 L 95,95 L 145,93 L 195,91 L 245,82 L 295,73 L 345,74 L 395,68 L 445,71 L 485,55"
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Circular Data Points */}
                {[
                  { x: 45, y: 102, val: '2,040' },
                  { x: 95, y: 95, val: '2,180' },
                  { x: 145, y: 93, val: '2,220' },
                  { x: 195, y: 91, val: '2,260' },
                  { x: 245, y: 82, val: '2,440' },
                  { x: 295, y: 73, val: '2,820' },
                  { x: 345, y: 74, val: '2,810' },
                  { x: 395, y: 68, val: '2,920' },
                  { x: 445, y: 71, val: '2,880' },
                  { x: 485, y: 55, val: '3,480' },
                ].map((pt, i) => (
                  <circle 
                    key={i} 
                    cx={pt.x} 
                    cy={pt.y} 
                    r="3.5" 
                    fill="#0284C7" 
                    stroke="#FFFFFF" 
                    strokeWidth="1.5" 
                    className="hover:r-5 cursor-pointer transition-all"
                  />
                ))}

                {[
                  { x: 45, label: '1 Oct' },
                  { x: 155, label: '8 Oct' },
                  { x: 265, label: '15 Oct' },
                  { x: 375, label: '22 Oct' },
                  { x: 485, label: '31 Oct' },
                ].map((d, i) => (
                  <text key={i} x={d.x} y="162" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="500">
                    {d.label}
                  </text>
                ))}
              </svg>
            </div>
          </div>

          {/* Bottom Card: Recent Alerts */}
          <div className="bg-white p-5 rounded border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D32F2F] animate-pulse" />
                <h3 className="text-[16px] font-bold text-[#0F172A]">Critical &amp; Active Alerts</h3>
              </div>
              <button 
                onClick={() => navigate('/app/alerts')}
                className="text-[12px] font-bold text-[#D32F2F] hover:underline"
              >
                View All Alerts ({alertsList.length}) →
              </button>
            </div>

            <div className="space-y-2.5">
              {[
                { well: 'BGW-014', desc: 'Elevated rod loading detected (6.3 kN)', time: '12 min ago', sev: 'CRITICAL', sevColor: '#DC2626', sevBg: '#FEE2E2', dotColor: '#DC2626' },
                { well: 'BGW-021', desc: 'Reservoir temperature declining faster than model', time: '34 min ago', sev: 'HIGH', sevColor: '#EA580C', sevBg: '#FFEDD5', dotColor: '#EA580C' },
                { well: 'BGW-007', desc: 'Production below expected range (-18%)', time: '1 hr ago', sev: 'MEDIUM', sevColor: '#CA8A04', sevBg: '#FEF9C3', dotColor: '#CA8A04' },
                { well: 'BGW-003', desc: 'Sensor calibration drift anomaly detected', time: '2 hrs ago', sev: 'LOW', sevColor: '#16A34A', sevBg: '#DCFCE7', dotColor: '#16A34A' },
              ].map((alert, i) => (
                <div 
                  key={i} 
                  onClick={() => navigate(`/app/digital-twin?well=${alert.well}`)}
                  className="p-2.5 rounded hover:bg-[#F8FAFC] border border-[#F1F5F9] flex items-center justify-between gap-3 text-[13px] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: alert.dotColor }} />
                    <strong className="font-bold text-[#0F172A] w-18 flex-shrink-0 group-hover:text-[#D32F2F] transition-colors">
                      {alert.well}
                    </strong>
                    <span className="text-[#475569] truncate text-[13px]">{alert.desc}</span>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[11px] text-[#94A3B8]">{alert.time}</span>
                    <span 
                      className="px-2 py-0.5 rounded font-bold text-[10px] tracking-wider"
                      style={{ color: alert.sevColor, backgroundColor: alert.sevBg }}
                    >
                      {alert.sev}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ── Field Wells Directory Grid ───────────────────────────── */}
      <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6">
        
        {/* Grid Controls Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-5 bg-[#D32F2F] rounded-full" />
            <div>
              <h3 className="text-[18px] font-bold text-[#0F172A]">Baghewala Well Status Matrix</h3>
              <p className="text-[13px] text-[#64748B]">Showing {filteredWells.length} of {WELLS.length} monitored wells</p>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status chips */}
            <div className="flex items-center bg-[#F1F5F9] p-1 rounded">
              {['ALL', 'PRODUCING', 'ATTENTION', 'CRITICAL'].map(status => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1 rounded text-[12px] font-bold transition-colors ${
                    selectedStatus === status 
                      ? 'bg-white text-[#0F172A] shadow-sm' 
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search well ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-[13px] bg-white border border-[#CBD5E1] rounded focus:outline-none focus:border-[#D32F2F] w-44"
              />
            </div>

            {/* Full Explorer link */}
            <button
              onClick={() => navigate('/app/well-intelligence')}
              className="px-3.5 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#334155] rounded text-[13px] font-semibold transition-colors"
            >
              Full Engineering Table →
            </button>
          </div>
        </div>

        {/* Wells Grid - Enlarged Layout & Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filteredWells.map(well => {
            const isHighRisk = well.failureRisk === 'High' || well.failureRisk === 'Critical';
            const isMedRisk = well.failureRisk === 'Medium';
            return (
              <div
                key={well.id}
                onClick={() => navigate(`/app/digital-twin?well=${well.id}`)}
                className="p-6 rounded-xl border border-[#CBD5E1] hover:border-[#D32F2F] bg-white hover:shadow-xl transition-all duration-200 cursor-pointer group flex flex-col justify-between relative overflow-hidden"
              >
                {/* Top Accent Line */}
                <div 
                  className={`absolute top-0 left-0 right-0 h-1.5 transition-all group-hover:h-2 ${
                    well.status === 'Producing' ? 'bg-[#16A34A]' :
                    well.status === 'Attention' ? 'bg-[#D97706]' :
                    well.status === 'Critical' ? 'bg-[#DC2626]' : 'bg-[#64748B]'
                  }`} 
                />

                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4 pt-1">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 animate-pulse ${
                          well.status === 'Producing' ? 'bg-[#16A34A]' :
                          well.status === 'Attention' ? 'bg-[#D97706]' :
                          well.status === 'Critical' ? 'bg-[#DC2626]' : 'bg-[#64748B]'
                        }`} />
                        <span className="font-black text-[#0F172A] text-xl md:text-2xl tracking-tight group-hover:text-[#D32F2F] transition-colors">
                          {well.name}
                        </span>
                      </div>
                      <span className="text-[12px] text-[#64748B] font-medium ml-6 block mt-0.5">
                        {well.reservoir || 'Baghewala Sand Member A'}
                      </span>
                    </div>

                    <span className={`text-[12px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-2xs ${
                      well.status === 'Producing' ? 'bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9]' :
                      well.status === 'Attention' ? 'bg-[#FFF8E1] text-[#B78103] border border-[#FFE082]' :
                      well.status === 'Critical' ? 'bg-[#FFEBEE] text-[#B71C1C] border border-[#FFCDD2]' : 'bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]'
                    }`}>
                      {well.status}
                    </span>
                  </div>

                  {/* 4 Large Metrics Micro-cards */}
                  <div className="grid grid-cols-2 gap-3.5 my-4">
                    {/* Oil Rate */}
                    <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] group-hover:border-[#CBD5E1] transition-colors">
                      <div className="flex items-center gap-1.5 text-[#64748B] text-[12px] font-bold uppercase tracking-wider mb-1">
                        <Droplets className="w-4 h-4 text-[#0284C7]" />
                        <span>Oil Rate</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-[#0F172A]">{well.oilProduction}</span>
                        <span className="text-[12px] font-bold text-[#64748B]">BOPD</span>
                      </div>
                    </div>

                    {/* Reservoir Temp */}
                    <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] group-hover:border-[#CBD5E1] transition-colors">
                      <div className="flex items-center gap-1.5 text-[#64748B] text-[12px] font-bold uppercase tracking-wider mb-1">
                        <Thermometer className="w-4 h-4 text-[#EA580C]" />
                        <span>Reservoir T</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-[#0F172A]">{well.temperature}</span>
                        <span className="text-[12px] font-bold text-[#64748B]">°C</span>
                      </div>
                    </div>

                    {/* Rod Load */}
                    <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] group-hover:border-[#CBD5E1] transition-colors">
                      <div className="flex items-center gap-1.5 text-[#64748B] text-[12px] font-bold uppercase tracking-wider mb-1">
                        <Sliders className="w-4 h-4 text-[#7C3AED]" />
                        <span>Rod Load</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-[#0F172A]">{well.rodLoad}</span>
                        <span className="text-[12px] font-bold text-[#64748B]">kN</span>
                      </div>
                    </div>

                    {/* Pump Efficiency */}
                    <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] group-hover:border-[#CBD5E1] transition-colors">
                      <div className="flex items-center gap-1.5 text-[#64748B] text-[12px] font-bold uppercase tracking-wider mb-1">
                        <Gauge className="w-4 h-4 text-[#16A34A]" />
                        <span>Pump Eff.</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-[#0F172A]">{well.pumpEfficiency}</span>
                        <span className="text-[12px] font-bold text-[#64748B]">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Pump Health Progress Bar */}
                  <div className="space-y-1.5 my-3">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-[#64748B] uppercase tracking-wider">Mechanical Health</span>
                      <span className={well.pumpEfficiency >= 70 ? 'text-[#16A34A]' : well.pumpEfficiency >= 60 ? 'text-[#D97706]' : 'text-[#DC2626]'}>
                        {well.pumpEfficiency}% Operating Index
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          well.pumpEfficiency >= 70 ? 'bg-[#16A34A]' : well.pumpEfficiency >= 60 ? 'bg-[#D97706]' : 'bg-[#DC2626]'
                        }`} 
                        style={{ width: `${Math.min(100, well.pumpEfficiency)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3.5 border-t border-[#F1F5F9] flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-1.5 font-bold text-[#475569]">
                    <Flame className="w-4 h-4 text-[#EA580C]" />
                    <span>{well.cssPhase}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] tracking-wide ${
                      isHighRisk ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]' : 
                      isMedRisk ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]' : 
                      'bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]'
                    }`}>
                      Risk: {well.failureRisk}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#D32F2F] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* ── SHAP EXPLAINABILITY MODAL ─────────────────────────────── */}
      {showExplainModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6 space-y-5 border border-[#E2E8F0]">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2.5">
                <Brain className="w-5 h-5 text-[#D32F2F]" />
                <div>
                  <h3 className="text-[17px] font-bold text-[#0F172A]">SHAP Explainability: Well BGW-014</h3>
                  <p className="text-[12px] text-[#64748B]">Feature attribution for recommended SPM 5.1 &amp; VFD 36 Hz</p>
                </div>
              </div>
              <button onClick={() => setShowExplainModal(false)} className="p-1 text-[#94A3B8] hover:text-[#0F172A] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-[13px] text-[#334155] leading-relaxed">
                TreeSHAP decomposition identifies that high polished rod tension under elevated oil viscosity (430 cP) was the primary factor driving the optimizer to reduce pumping speed to 5.1 SPM.
              </p>

              <div className="space-y-2 pt-2">
                {[
                  { factor: 'Polished Rod Tension (6.3 kN)', impact: '+38% Contribution', width: '85%', color: '#DC2626' },
                  { factor: 'Reservoir Viscosity (430 cP)', impact: '+26% Contribution', width: '65%', color: '#D97706' },
                  { factor: 'Pump Fluid Fillage / Pound', impact: '+18% Contribution', width: '48%', color: '#D32F2F' },
                  { factor: 'Thermal Soak Duration (64h)', impact: '-12% Contribution', width: '30%', color: '#16A34A' },
                  { factor: 'Inflow Performance Relationship', impact: '+6% Contribution', width: '18%', color: '#0284C7' },
                ].map((item, i) => (
                  <div key={i} className="text-[12px]">
                    <div className="flex justify-between font-semibold mb-1">
                      <span className="text-[#0F172A]">{item.factor}</span>
                      <span style={{ color: item.color }}>{item.impact}</span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: item.width, backgroundColor: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#F1F5F9] flex justify-end gap-3">
              <button
                onClick={() => setShowExplainModal(false)}
                className="px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] rounded text-[13px] font-semibold"
              >
                Close Explanation
              </button>
              <button
                onClick={() => { setShowExplainModal(false); navigate('/app/approvals'); }}
                className="px-4 py-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded text-[13px] font-bold"
              >
                Proceed to Approvals
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
