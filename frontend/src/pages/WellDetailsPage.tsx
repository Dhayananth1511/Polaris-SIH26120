import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Activity, ArrowUpRight, ArrowDownRight, Layers, Sliders, 
  Zap, Calendar, Clock, AlertTriangle, ShieldCheck, Thermometer,
  Gauge, TrendingUp, Cpu, Eye, CheckCircle2
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { WELLS, BGW014_PRODUCTION, BGW014_CSS_CYCLES, BGW014_SRP } from '../data/mockData';

// Chart Data for 3 side-by-side graphs (Matching Panel 4 in Design)
const TREND_DATA = [
  { date: '1 Oct',  production: 42.1, temperature: 86, rodLoad: 4.8 },
  { date: '8 Oct',  production: 38.6, temperature: 83, rodLoad: 5.1 },
  { date: '15 Oct', production: 35.2, temperature: 80, rodLoad: 5.5 },
  { date: '22 Oct', production: 31.2, temperature: 77, rodLoad: 5.8 },
  { date: '31 Oct', production: 24.8, temperature: 74, rodLoad: 6.3 },
];

export const WellDetailsPage: React.FC = () => {
  const { wellId = 'BGW-014' } = useParams<{ wellId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'telemetry' | 'production' | 'srp' | 'cycles' | 'insights'>('overview');

  const well = WELLS.find(w => w.id.toUpperCase() === wellId.toUpperCase()) || WELLS.find(w => w.id === 'BGW-014') || WELLS[0];

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#F4F6F8] min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header (OIL INDIA LIMITED | Well Details) ───────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">
              OIL INDIA LIMITED
            </span>
            <span className="text-[#94A3B8]">|</span>
            <span className="text-[12px] font-bold tracking-wider text-[#64748B] uppercase">
              Well Details
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
              {well.id}
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[12px] font-bold bg-[#FFEBEE] text-[#D32F2F] border border-[#FFCDD2]">
              High Risk
            </span>
          </div>

          <p className="text-[14px] text-[#64748B] mt-1">
            {well.status} | Last Updated: 04 Nov 2024, 14:32 IST
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/digital-twin')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] rounded text-[13px] font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4 text-[#D32F2F]" />
            <span>Open Digital Twin</span>
          </button>
          <button
            onClick={() => navigate('/app/srp-optimizer')}
            className="flex items-center gap-2 px-4 py-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded text-[13px] font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>Run Joint Optimizer</span>
          </button>
        </div>
      </div>

      {/* ── Tabs Navigation (Matching Panel 4) ───────────────────── */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 text-[14px]">
        {[
          { key: 'overview',   label: 'Overview' },
          { key: 'telemetry',  label: 'Telemetry' },
          { key: 'production', label: 'Production' },
          { key: 'srp',        label: 'SRP' },
          { key: 'cycles',     label: 'CSS Cycles' },
          { key: 'insights',   label: 'AI Insights' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`px-4 py-2 font-bold rounded-t transition-all cursor-pointer ${
              activeTab === t.key
                ? 'border-b-2 border-[#D32F2F] text-[#D32F2F] bg-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: OVERVIEW (Matching Panel 4 Exactly) ───────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Production */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#64748B]">Production</span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +12.4%
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#0F172A]">24.8</span>
                <span className="text-[14px] font-bold text-[#64748B]">BPD</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span>Target: 28.0 BPD</span>
                <span>Water Cut: 42%</span>
              </div>
            </div>

            {/* Card 2: Temperature */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#64748B]">Temperature</span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +2.1%
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#0F172A]">74</span>
                <span className="text-[14px] font-bold text-[#64748B]">°C</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span>Formation: 852m MD</span>
                <span>Steam Peak: 86°C</span>
              </div>
            </div>

            {/* Card 3: Rod Load */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#64748B]">Rod Load</span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +10.2%
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#DC2626]">6.3</span>
                <span className="text-[14px] font-bold text-[#64748B]">kN</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#DC2626] font-semibold">
                <span>Exceeds 6.0 kN Threshold</span>
              </div>
            </div>

            {/* Card 4: Pump Efficiency */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#64748B]">Pump Efficiency</span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded">
                  <ArrowDownRight className="w-3.5 h-3.5" /> -5.4%
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#D97706]">62</span>
                <span className="text-[14px] font-bold text-[#64748B]">%</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span>SPM: 10.0</span>
                <span>Stroke: 72 in</span>
              </div>
            </div>

          </div>

          {/* 3 Side-by-Side Trend Charts (Matching Panel 4) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart 1: Production Trend */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                <h4 className="text-[14px] font-bold text-[#0F172A]">Production Trend</h4>
                <span className="text-[11px] font-semibold text-[#0284C7]">BPD</span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={TREND_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <YAxis domain={[20, 45]} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="production" 
                      stroke="#0284C7" 
                      strokeWidth={2.5} 
                      dot={{ r: 3.5, fill: '#0284C7' }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Temperature Trend */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                <h4 className="text-[14px] font-bold text-[#0F172A]">Temperature Trend</h4>
                <span className="text-[11px] font-semibold text-[#EA580C]">°C</span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={TREND_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <YAxis domain={[70, 90]} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#EA580C" 
                      strokeWidth={2.5} 
                      dot={{ r: 3.5, fill: '#EA580C' }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Rod Load Trend */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                <h4 className="text-[14px] font-bold text-[#0F172A]">Rod Load Trend</h4>
                <span className="text-[11px] font-semibold text-[#8B5CF6]">kN</span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={TREND_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <YAxis domain={[4.0, 7.0]} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rodLoad" 
                      stroke="#8B5CF6" 
                      strokeWidth={2.5} 
                      dot={{ r: 3.5, fill: '#8B5CF6' }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Bottom Split Section: Recent Activity & Well Information (Matching Panel 4) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Card: Recent Activity */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                <h4 className="text-[15px] font-bold text-[#0F172A]">Recent Activity</h4>
                <span className="text-[12px] text-[#64748B]">Real-time telemetry event stream</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-[#64748B] text-[11px] font-bold uppercase tracking-wider border-b border-[#E2E8F0]">
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Event</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    <tr className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 font-semibold text-[#0F172A]">14:12</td>
                      <td className="py-3 px-3 text-[#334155]">Rod load exceeded threshold</td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]">
                          Warning
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 font-semibold text-[#0F172A]">13:55</td>
                      <td className="py-3 px-3 text-[#334155]">Telemetry received</td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#F0FDF4] text-[#15803D] border border-[#DCFCE7]">
                          Normal
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 font-semibold text-[#0F172A]">12:30</td>
                      <td className="py-3 px-3 text-[#334155]">AI prediction updated</td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#F0FDF4] text-[#15803D] border border-[#DCFCE7]">
                          Normal
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 font-semibold text-[#0F172A]">10:15</td>
                      <td className="py-3 px-3 text-[#334155]">Steam injection cycle completed</td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#F0FDF4] text-[#15803D] border border-[#DCFCE7]">
                          Normal
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 font-semibold text-[#0F172A]">08:00</td>
                      <td className="py-3 px-3 text-[#334155]">Daily sensor self-test passed</td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#F0FDF4] text-[#15803D] border border-[#DCFCE7]">
                          Normal
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Card: Well Information */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                <h4 className="text-[15px] font-bold text-[#0F172A]">Well Information</h4>
                <span className="text-[12px] text-[#64748B]">Asset Specifications</span>
              </div>

              <div className="space-y-3 text-[13px]">
                <div className="flex items-center justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Field</span>
                  <span className="font-bold text-[#0F172A]">Baghewala</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Well Type</span>
                  <span className="font-bold text-[#0F172A]">CSS + SRP</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Spud Date</span>
                  <span className="font-bold text-[#0F172A]">12 Mar 2018</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Current Cycle</span>
                  <span className="font-bold text-[#0F172A]">Cycle 14 (Production)</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Next Steam</span>
                  <span className="font-bold text-[#D32F2F]">18 Nov 2024</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Perforations</span>
                  <span className="font-bold text-[#0F172A]">842 - 856 m MD</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[#64748B]">Reservoir Formation</span>
                  <span className="font-bold text-[#0F172A]">Baghewala Sand Member A</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ── TAB 2: TELEMETRY ─────────────────────────────────────── */}
      {activeTab === 'telemetry' && (
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-[#0F172A] pb-2 border-b border-[#F1F5F9]">
            Comprehensive Sensor Telemetry Matrix
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px]">
            {[
              { l: 'Bottomhole Pressure', v: '28.5 bar', s: 'Depletion: -0.4 bar/mo' },
              { l: 'Wellhead Casing Pressure', v: '14.2 bar', s: 'Flowline backpressure normal' },
              { l: 'Bottomhole Temperature', v: '61.4 °C', s: 'Steam dissipation stage' },
              { l: 'Production Tubing Temp', v: '71.0 °C', s: 'Heavy oil mobile' },
              { l: 'Gross Fluid Production', v: '42.8 BFPD', s: '42% Water Cut' },
              { l: 'Net Heavy Oil Rate', v: '24.8 BOPD', s: '1,820 cP dynamic viscosity' },
              { l: 'Polished Rod Peak Load', v: '6.3 kN', s: 'Overload warning active' },
              { l: 'Min Downstroke Load', v: '1.8 kN', s: 'Fluid pound signature' },
              { l: 'VFD Driver Frequency', v: '38.0 Hz', s: 'Current motor speed' },
            ].map((row, i) => (
              <div key={i} className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <span className="text-[11px] font-bold text-[#64748B] uppercase block">{row.l}</span>
                <span className="text-xl font-black text-[#0F172A] mt-1 block">{row.v}</span>
                <span className="text-[11px] text-[#64748B] mt-0.5 block">{row.s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: PRODUCTION DECLINE ────────────────────────────── */}
      {activeTab === 'production' && (
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-[#0F172A] pb-2 border-b border-[#F1F5F9]">
            30-Day Production History &amp; Water Cut
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={BGW014_PRODUCTION}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '6px', color: '#fff', fontSize: '12px' }} />
                <Line type="monotone" dataKey="oilRate" name="Oil Rate (BPD)" stroke="#16A34A" strokeWidth={2.5} />
                <Line type="monotone" dataKey="waterRate" name="Water Rate (BPD)" stroke="#0284C7" strokeWidth={2} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── TAB 4: SRP & DYNO ────────────────────────────────────── */}
      {activeTab === 'srp' && (
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <h3 className="text-lg font-bold text-[#0F172A]">Surface &amp; Downhole Dynamometer Card</h3>
            <span className="px-3 py-1 bg-[#FEE2E2] text-[#DC2626] font-bold text-[12px] rounded">
              High Overload Warning: 6.3 kN
            </span>
          </div>
          <div className="h-64 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] p-4 flex items-center justify-center">
            <svg viewBox="0 0 400 220" className="w-full h-full">
              <line x1="40" y1="20" x2="40" y2="180" stroke="#94A3B8" strokeWidth="1.5" />
              <line x1="40" y1="180" x2="380" y2="180" stroke="#94A3B8" strokeWidth="1.5" />
              <text x="30" y="15" fill="#64748B" fontSize="10" textAnchor="end">Load (kN)</text>
              <text x="375" y="195" fill="#64748B" fontSize="10" textAnchor="end">Displacement (in)</text>
              <path
                d="M 60 150 L 60 60 Q 180 55 320 50 L 340 55 L 340 140 L 220 145 L 140 165 Z"
                fill="none"
                stroke="#D32F2F"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M 80 135 L 80 80 L 300 80 L 320 135 L 190 135 Z"
                fill="none"
                stroke="#0284C7"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              <circle cx="220" cy="145" r="4" fill="#D32F2F" />
              <text x="230" y="145" fill="#B91C1C" fontSize="11" fontWeight="bold">Fluid Impact (Pound)</text>
            </svg>
          </div>
        </div>
      )}

      {/* ── TAB 5: CSS CYCLES ────────────────────────────────────── */}
      {activeTab === 'cycles' && (
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-[#0F172A] pb-2 border-b border-[#F1F5F9]">
            Cyclic Steam Stimulation Multi-Cycle Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#64748B] text-[11px] font-bold uppercase tracking-wider border-b border-[#E2E8F0]">
                  <th className="py-2.5 px-3">Cycle #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Steam Vol (t)</th>
                  <th className="py-2.5 px-3 text-right">Soak (Days)</th>
                  <th className="py-2.5 px-3 text-right">Peak Rate</th>
                  <th className="py-2.5 px-3 text-right">SOR</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {BGW014_CSS_CYCLES.map(c => (
                  <tr key={c.cycleNumber} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-3 font-bold text-[#0F172A]">Cycle {c.cycleNumber}</td>
                    <td className="py-3 px-3 text-[#64748B]">{c.injectionDate}</td>
                    <td className="py-3 px-3 text-right font-bold text-[#0F172A]">{c.steamVolume}</td>
                    <td className="py-3 px-3 text-right text-[#64748B]">{c.soakTime}</td>
                    <td className="py-3 px-3 text-right font-bold text-[#15803D]">{c.peakProduction} BOPD</td>
                    <td className="py-3 px-3 text-right text-[#64748B]">{c.sor}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        c.status === 'Active' ? 'bg-[#FFEBEE] text-[#B71C1C]' : 'bg-[#E8F5E9] text-[#1B5E20]'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 6: AI INSIGHTS ───────────────────────────────────── */}
      {activeTab === 'insights' && (
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <h3 className="text-lg font-bold text-[#0F172A]">Physics-Informed Machine Learning Diagnostics</h3>
            <span className="px-3 py-1 bg-[#F0FDF4] text-[#15803D] font-bold text-[12px] rounded">
              Model: XGBoost + PINN Coupled
            </span>
          </div>

          <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
              <div>
                <strong className="text-[14px] text-[#15803D] block">AI Recommendation Available</strong>
                <p className="text-[12px] text-[#166534]">
                  Production can increase by +12.4% (to 31.8 BPD) by adjusting SPM from 10.0 to 5.1 and steam injection to 735 tons.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/app/joint-optimizer')}
              className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded text-[13px] shadow-sm transition-colors cursor-pointer"
            >
              Apply Setpoints
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
