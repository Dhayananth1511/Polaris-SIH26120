import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, AlertTriangle, ArrowUpRight, CheckCircle2, ChevronRight, 
  Cpu, Download, Filter, Gauge, Layers, Play, RefreshCw, Search, ShieldAlert, Zap,
  Droplets, Flame, Settings, TrendingDown
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
    <div className="p-6 md:p-8 space-y-6 bg-[#F4F6F8] min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header (Matching Screenshot 1) ─────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32]" />
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">Oil India Limited · Real-Time Operations</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            Baghewala Field — Operational Command Center
          </h1>
          <p className="text-[14px] text-[#64748B] mt-0.5">
            Real-time telemetry, spatial well mapping, CSS thermal cycles &amp; SRP optimization
          </p>
        </div>

        {/* Status & Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded border border-[#E2E8F0] shadow-xs text-[13px] text-[#475569]">
            <span className="font-semibold text-[#0F172A]">Mon, 04 Nov 2024 | 14:32 IST</span>
            <span className="text-[#CBD5E1]">|</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#166534] font-bold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              System Operational
            </span>
          </div>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#CBD5E1] rounded text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#D32F2F] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync SCADA'}</span>
          </button>

          <button
            onClick={() => navigate('/app/joint-optimizer')}
            className="flex items-center gap-2 px-4 py-2 bg-[#D32F2F] text-white rounded text-[13px] font-semibold hover:bg-[#B71C1C] shadow-xs transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Joint Optimizer</span>
          </button>
        </div>
      </div>

      {/* ── 4 Top Key Performance Metrics (Matching Screenshot 1) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Production */}
        <div className="bg-white p-5 rounded border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-[#64748B] uppercase tracking-wide">Total Production</span>
            <div className="w-9 h-9 rounded bg-[#E8F5E9] flex items-center justify-center text-[#15803D]">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0F172A]">2,840</span>
            <span className="text-[14px] text-[#64748B] font-bold">BPD</span>
          </div>
          <p className="text-[12px] font-bold mt-2 text-[#15803D] flex items-center gap-1">
            <span>+ 8.4%</span>
          </p>
        </div>

        {/* Average SOR */}
        <div className="bg-white p-5 rounded border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-[#64748B] uppercase tracking-wide">Average SOR</span>
            <div className="w-9 h-9 rounded bg-[#F3E8FF] flex items-center justify-center text-[#7E22CE]">
              <Droplets className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0F172A]">5.8</span>
          </div>
          <p className="text-[12px] font-bold mt-2 text-[#DC2626] flex items-center gap-1">
            <span>- 10.2%</span>
          </p>
        </div>

        {/* Energy Consumption */}
        <div className="bg-white p-5 rounded border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-[#64748B] uppercase tracking-wide">Energy Consumption</span>
            <div className="w-9 h-9 rounded bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0F172A]">42</span>
            <span className="text-[14px] text-[#64748B] font-bold">kWh/bbl</span>
          </div>
          <p className="text-[12px] font-bold mt-2 text-[#15803D] flex items-center gap-1">
            <span>- 7.1%</span>
          </p>
        </div>

        {/* Equipment Health */}
        <div className="bg-white p-5 rounded border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-[#64748B] uppercase tracking-wide">Equipment Health</span>
            <div className="w-9 h-9 rounded bg-[#F1F5F9] flex items-center justify-center text-[#334155]">
              <Settings className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0F172A]">94 %</span>
          </div>
          <p className="text-[12px] font-bold mt-2 text-[#15803D]">
            23 Wells Online
          </p>
        </div>

      </div>

      {/* ── Main 2-Column Grid: Field Map on Left, Trends & Alerts on Right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Column: Interactive Field Map (No raster image used) */}
        <div className="h-full min-h-[520px]">
          <FieldMapBaghewala onSelectWell={(w) => navigate(`/app/digital-twin?well=${w.id}`)} />
        </div>

        {/* Right Column: Production Trend & Recent Alerts */}
        <div className="flex flex-col gap-6 justify-between">
          
          {/* Top Card: Production Trend (Field) */}
          <div className="bg-white p-5 rounded border border-[#E2E8F0] shadow-sm flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#F1F5F9]">
              <h3 className="text-[16px] font-bold text-[#0F172A]">Production Trend (Field)</h3>
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

            {/* Clean SVG Trend Chart matching Screenshot 1 */}
            <div className="relative h-48 w-full pt-2">
              <svg viewBox="0 0 500 170" className="w-full h-full overflow-visible">
                {/* Horizontal Grid lines with Y labels */}
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

                {/* Y-axis label */}
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

                {/* X-axis date labels matching Screenshot 1 */}
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

          {/* Bottom Card: Recent Alerts matching Screenshot 1 */}
          <div className="bg-white p-5 rounded border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D32F2F] animate-pulse" />
                <h3 className="text-[16px] font-bold text-[#0F172A]">Recent Alerts</h3>
              </div>
              <span className="text-[12px] text-[#64748B]">Real-time field events</span>
            </div>

            <div className="space-y-2.5">
              {[
                { well: 'BGW-014', desc: 'Elevated rod loading detected', time: '12 min ago', sev: 'HIGH', sevColor: '#DC2626', sevBg: '#FEE2E2', dotColor: '#DC2626' },
                { well: 'BGW-021', desc: 'Reservoir temperature declining', time: '34 min ago', sev: 'MEDIUM', sevColor: '#D97706', sevBg: '#FEF3C7', dotColor: '#DC2626' },
                { well: 'BGW-007', desc: 'Production below expected range', time: '1 hr ago', sev: 'MEDIUM', sevColor: '#D97706', sevBg: '#FEF3C7', dotColor: '#EAB308' },
                { well: 'BGW-003', desc: 'Sensor anomaly detected', time: '2 hrs ago', sev: 'LOW', sevColor: '#16A34A', sevBg: '#DCFCE7', dotColor: '#16A34A' },
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
              onClick={() => navigate('/app/well-explorer')}
              className="px-3.5 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#334155] rounded text-[13px] font-semibold transition-colors"
            >
              Full Engineering Table →
            </button>
          </div>
        </div>

        {/* Wells Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
          {filteredWells.map(well => {
            const isHighRisk = well.failureRisk === 'High';
            return (
              <div
                key={well.id}
                onClick={() => navigate(well.id === 'BGW-014' ? '/app/digital-twin' : '/app/well-explorer')}
                className="p-4 rounded border border-[#E2E8F0] hover:border-[#D32F2F] bg-white hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      well.status === 'Producing' ? 'bg-[#16A34A]' :
                      well.status === 'Attention' ? 'bg-[#D97706]' :
                      well.status === 'Critical' ? 'bg-[#DC2626]' : 'bg-[#64748B]'
                    }`} />
                    <span className="font-black text-[#0F172A] text-[16px] group-hover:text-[#D32F2F] transition-colors">
                      {well.name}
                    </span>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    well.status === 'Producing' ? 'bg-[#E8F5E9] text-[#1B5E20]' :
                    well.status === 'Attention' ? 'bg-[#FFF8E1] text-[#B78103]' :
                    well.status === 'Critical' ? 'bg-[#FFEBEE] text-[#B71C1C]' : 'bg-[#F1F5F9] text-[#475569]'
                  }`}>
                    {well.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px] py-2 border-y border-[#F8FAFC]">
                  <div>
                    <span className="text-[#94A3B8] block">Oil Rate</span>
                    <span className="font-bold text-[#1E293B] text-[13px]">{well.oilProduction} BOPD</span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block">Reservoir T</span>
                    <span className="font-bold text-[#1E293B] text-[13px]">{well.temperature} °C</span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block">Rod Load</span>
                    <span className="font-bold text-[#1E293B] text-[13px]">{well.rodLoad} kN</span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block">Pump Eff.</span>
                    <span className="font-bold text-[#1E293B] text-[13px]">{well.pumpEfficiency}%</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-[#64748B]">{well.cssPhase}</span>
                  <span className={`font-semibold ${isHighRisk ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
                    Risk: {well.failureRisk}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
