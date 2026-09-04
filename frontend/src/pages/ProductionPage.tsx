import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, BarChart2, Download, Filter, Calendar, 
  Droplets, Flame, Activity, ArrowUpRight, ArrowDownRight, Layers
} from 'lucide-react';
import { FIELD_PRODUCTION_TREND } from '../data/mockData';
import { BAGHEWALA_MAP_WELLS } from '../components/map/FieldMapBaghewala';

export const ProductionPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRange, setSelectedRange] = useState('30d');

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#F4F6F8] min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">Oil India Limited · Heavy Oil Production Core</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            Baghewala Field Production Monitoring
          </h1>
          <p className="text-[14px] text-[#64748B] mt-0.5">
            Heavy crude extraction, multiphase liquid rates, and thermal decline analytics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-[#CBD5E1] rounded text-[12px] p-0.5 shadow-xs">
            {['7d', '14d', '30d', '90d'].map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRange(r)}
                className={`px-3 py-1 font-bold rounded cursor-pointer transition-colors ${
                  selectedRange === r ? 'bg-[#005C53] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate('/app/css-optimizer')}
            className="px-4 py-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded text-[13px] font-bold shadow-xs transition-colors cursor-pointer"
          >
            Optimize CSS Cycles →
          </button>
        </div>
      </div>

      {/* ── 4 Production KPIs ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Net Crude Production</span>
          <div className="text-3xl font-black text-[#0F172A] mt-1">2,840 <span className="text-[14px] font-normal text-[#64748B]">BPD</span></div>
          <div className="text-[12px] font-bold text-[#16A34A] flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+8.4% vs last month</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Gross Liquid Rate</span>
          <div className="text-3xl font-black text-[#0F172A] mt-1">5,120 <span className="text-[14px] font-normal text-[#64748B]">BFPD</span></div>
          <div className="text-[12px] font-bold text-[#64748B] mt-1">Water cut: 44.5%</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Average Field SOR</span>
          <div className="text-3xl font-black text-[#0F172A] mt-1">5.8 <span className="text-[14px] font-normal text-[#64748B]">bbl/bbl</span></div>
          <div className="text-[12px] font-bold text-[#16A34A] flex items-center gap-1 mt-1">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>-10.2% efficiency gain</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Heavy Oil API Gravity</span>
          <div className="text-3xl font-black text-[#0F172A] mt-1">17.5° <span className="text-[14px] font-normal text-[#64748B]">API</span></div>
          <div className="text-[12px] font-bold text-[#0284C7] mt-1">Viscosity: ~1,820 cP @ 60°C</div>
        </div>
      </div>

      {/* ── Main Production Chart ───────────────────────────────── */}
      <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
          <div>
            <h3 className="text-[16px] font-bold text-[#0F172A]">Field Total Net Oil Production Trend</h3>
            <p className="text-[12px] text-[#64748B]">Daily aggregate production (BPD) from all 23 Baghewala heavy oil wells</p>
          </div>
          <span className="text-[12px] font-bold text-[#15803D] bg-[#F0FDF4] px-2.5 py-1 rounded border border-[#BBF7D0]">
            Target: 3,000 BPD
          </span>
        </div>

        <div className="h-64 w-full pt-4">
          <svg viewBox="0 0 800 200" className="w-full h-full overflow-visible">
            {/* Grid lines */}
            {[40, 80, 120, 160].map(y => (
              <line key={y} x1="40" y1={y} x2="780" y2={y} stroke="#F1F5F9" strokeWidth="1" />
            ))}

            {/* Y axis labels */}
            <text x="30" y="45" fill="#94A3B8" fontSize="10" textAnchor="end">4K</text>
            <text x="30" y="85" fill="#94A3B8" fontSize="10" textAnchor="end">3K</text>
            <text x="30" y="125" fill="#94A3B8" fontSize="10" textAnchor="end">2K</text>
            <text x="30" y="165" fill="#94A3B8" fontSize="10" textAnchor="end">1K</text>

            {/* Gradient Fill */}
            <defs>
              <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284C7" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Area */}
            <path
              d="M 50 120 Q 150 115, 250 112 T 450 90 T 650 75 T 770 45 L 770 170 L 50 170 Z"
              fill="url(#prodGrad)"
            />

            {/* Production Trend Line */}
            <path
              d="M 50 120 Q 150 115, 250 112 T 450 90 T 650 75 T 770 45"
              fill="none"
              stroke="#0284C7"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Points */}
            {[
              { cx: 50, cy: 120, label: '1 Oct' },
              { cx: 170, cy: 115, label: '8 Oct' },
              { cx: 310, cy: 110, label: '15 Oct' },
              { cx: 470, cy: 90, label: '22 Oct' },
              { cx: 630, cy: 75, label: '29 Oct' },
              { cx: 770, cy: 45, label: '04 Nov' },
            ].map((p, idx) => (
              <g key={idx}>
                <circle cx={p.cx} cy={p.cy} r="4.5" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2.5" />
                <text x={p.cx} y="190" fill="#94A3B8" fontSize="10" textAnchor="middle">{p.label}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* ── Well Production Ranking Table ────────────────────────── */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h4 className="text-[14px] font-bold text-[#0F172A]">Well-by-Well Extraction Performance (23 Wells)</h4>
          <span className="text-[12px] text-[#64748B]">Sorted by daily crude volume</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Well ID</th>
                <th className="py-3 px-4">Formation</th>
                <th className="py-3 px-4 text-right">Production (BPD)</th>
                <th className="py-3 px-4 text-right">SOR</th>
                <th className="py-3 px-4 text-right">Temp (°C)</th>
                <th className="py-3 px-4 text-right">Rod Load (kN)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {BAGHEWALA_MAP_WELLS.map(w => (
                <tr key={w.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 px-4 font-bold text-[#0F172A]">{w.name}</td>
                  <td className="py-3 px-4 text-[#64748B]">{w.formation}</td>
                  <td className="py-3 px-4 text-right font-black text-[#0F172A]">{w.oilProduction}</td>
                  <td className="py-3 px-4 text-right font-medium text-[#475569]">{w.sor}</td>
                  <td className="py-3 px-4 text-right font-medium text-[#475569]">{w.temperature}°C</td>
                  <td className="py-3 px-4 text-right font-bold text-[#0F172A]">{w.rodLoad}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                      w.status === 'Critical' ? 'bg-[#FEF2F2] text-[#DC2626]' :
                      w.status === 'Attention' ? 'bg-[#FEFCE8] text-[#CA8A04]' :
                      'bg-[#F0FDF4] text-[#16A34A]'
                    }`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => navigate(`/app/wells/${w.id}`)}
                      className="text-[12px] font-bold text-[#D32F2F] hover:underline cursor-pointer"
                    >
                      Digital Twin →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
