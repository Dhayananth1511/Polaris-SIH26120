import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, BarChart2, Download, Filter, Calendar, 
  Droplets, Flame, Activity, ArrowUpRight, ArrowDownRight, Layers
} from 'lucide-react';
import { wellsApi, type BackendWell } from '../services/api';

export const ProductionPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRange, setSelectedRange] = useState('30d');
  const [productionTrend, setProductionTrend] = useState<any[]>([]);
  const [fieldStats, setFieldStats] = useState<any>(null);
  const [wells, setWells] = useState<BackendWell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      wellsApi.fieldStats(),
      wellsApi.listWells(),
    ]).then(([statsRes, wellsRes]) => {
      if (statsRes.success) setFieldStats(statsRes.data);
      if (wellsRes.success) setWells(wellsRes.data);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const days = selectedRange === '7d' ? 7 : selectedRange === '14d' ? 14 : selectedRange === '90d' ? 90 : 30;
    wellsApi.fieldProductionTrend(days).then(res => {
      if (res.success) setProductionTrend(res.data);
    }).catch(err => console.error('ProductionPage fetch error:', err))
      .finally(() => setLoading(false));
  }, [selectedRange]);

  // Dynamic SVG Area & Line computation
  const { pts, areaPath, linePath, gridMarks, xLabels } = useMemo(() => {
    if (!productionTrend || productionTrend.length === 0) {
      return { pts: [], areaPath: '', linePath: '', gridMarks: [], xLabels: [] };
    }
    const vals = productionTrend.map(p => Number(p.production) || 0);
    const maxV = Math.max(...vals, 50);
    const minV = Math.min(...vals, 0);
    const range = Math.max(1, maxV - minV);

    const step = range / 3;
    const marks = [
      { y: 40, label: `${Math.round(maxV)}` },
      { y: 80, label: `${Math.round(maxV - step)}` },
      { y: 120, label: `${Math.round(maxV - step * 2)}` },
      { y: 160, label: `${Math.round(minV)}` },
    ];

    const points = productionTrend.map((pt, i) => {
      const cx = 50 + (i / Math.max(1, productionTrend.length - 1)) * (770 - 50);
      const cy = 160 - (((Number(pt.production) || 0) - minV) / range) * 120;
      return { cx: Math.round(cx), cy: Math.round(cy), val: Math.round(Number(pt.production) || 0), date: pt.date };
    });

    const lPath = 'M ' + points.map(p => `${p.cx} ${p.cy}`).join(' L ');
    const aPath = `${lPath} L ${points[points.length - 1].cx} 170 L ${points[0].cx} 170 Z`;

    const dates = [];
    const count = points.length;
    if (count > 0) {
      const idxs = [0, Math.floor(count * 0.2), Math.floor(count * 0.4), Math.floor(count * 0.6), Math.floor(count * 0.8), count - 1];
      for (const idx of Array.from(new Set(idxs))) {
        const item = points[idx];
        if (item) {
          const d = new Date(item.date);
          const lbl = isNaN(d.getTime()) ? item.date : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
          dates.push({ cx: item.cx, label: lbl });
        }
      }
    }

    return { pts: points, areaPath: aPath, linePath: lPath, gridMarks: marks, xLabels: dates };
  }, [productionTrend]);

  // Sorted wells by production
  const sortedWells = [...wells].sort((a, b) => b.oilProduction - a.oilProduction);

  return (
    <div className="p-6 md:p-8 space-y-6 bg-white min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
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
          <div className="text-3xl font-black text-[#0F172A] mt-1">
            {fieldStats?.totalProduction ? Number(fieldStats.totalProduction).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '194.9'}{' '}
            <span className="text-[14px] font-normal text-[#64748B]">BPD</span>
          </div>
          <div className="text-[12px] font-bold text-[#16A34A] flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{fieldStats?.productionDelta || '+6.4% WoW'}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Gross Liquid Rate</span>
          <div className="text-3xl font-black text-[#0F172A] mt-1">
            {fieldStats?.totalProduction ? Math.round(Number(fieldStats.totalProduction) * 2.15).toLocaleString() : '418'}{' '}
            <span className="text-[14px] font-normal text-[#64748B]">BFPD</span>
          </div>
          <div className="text-[12px] font-bold text-[#64748B] mt-1">Avg Water cut: 44.5%</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Average Field SOR</span>
          <div className="text-3xl font-black text-[#0F172A] mt-1">
            {fieldStats?.averageSOR ? Number(fieldStats.averageSOR).toFixed(2) : '0.22'}{' '}
            <span className="text-[14px] font-normal text-[#64748B]">SOR</span>
          </div>
          <div className="text-[12px] font-bold text-[#16A34A] flex items-center gap-1 mt-1">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>{fieldStats?.sorDelta || '-8.2% efficiency gain'}</span>
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
            <p className="text-[12px] text-[#64748B]">Daily aggregate production (BPD) across all monitored Baghewala heavy oil wells</p>
          </div>
          <span className="text-[12px] font-bold text-[#15803D] bg-[#F0FDF4] px-2.5 py-1 rounded border border-[#BBF7D0]">
            Target: 220 BPD
          </span>
        </div>

        <div className="h-64 w-full pt-4">
          <svg viewBox="0 0 800 200" className="w-full h-full overflow-visible">
            {gridMarks.map(m => (
              <g key={m.y}>
                <line x1="40" y1={m.y} x2="780" y2={m.y} stroke="#F1F5F9" strokeWidth="1" />
                <text x="30" y={m.y + 4} fill="#94A3B8" fontSize="10" textAnchor="end">{m.label}</text>
              </g>
            ))}

            <defs>
              <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284C7" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {areaPath && (
              <path d={areaPath} fill="url(#prodGrad)" />
            )}

            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#0284C7"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            )}

            {pts.map((p, idx) => (
              <g key={idx} className="group/pt">
                <circle cx={p.cx} cy={p.cy} r="4.5" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2.5" className="hover:r-6 transition-all cursor-pointer" />
                <title>{`${p.val} BPD on ${p.date}`}</title>
              </g>
            ))}

            {xLabels.map((xl, idx) => (
              <text key={idx} x={xl.cx} y="190" fill="#94A3B8" fontSize="10" textAnchor="middle">{xl.label}</text>
            ))}
          </svg>
        </div>
      </div>

      {/* ── Well Production Ranking Table ────────────────────────── */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h4 className="text-[14px] font-bold text-[#0F172A]">Well-by-Well Extraction Performance ({sortedWells.length} Wells)</h4>
          <span className="text-[12px] text-[#64748B]">Sorted by live daily crude volume</span>
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
              {sortedWells.map(w => (
                <tr key={w.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 px-4 font-bold text-[#0F172A]">{w.name || w.id}</td>
                  <td className="py-3 px-4 text-[#64748B]">{w.reservoir || 'Jodhpur Sandstone'}</td>
                  <td className="py-3 px-4 text-right font-black text-[#0F172A]">{w.oilProduction}</td>
                  <td className="py-3 px-4 text-right font-medium text-[#475569]">{w.sor || 0.22}</td>
                  <td className="py-3 px-4 text-right font-medium text-[#475569]">{w.temperature}°C</td>
                  <td className="py-3 px-4 text-right font-bold text-[#0F172A]">{w.rodLoad}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                      w.status.toUpperCase() === 'CRITICAL' ? 'bg-[#FEF2F2] text-[#DC2626]' :
                      w.status.toUpperCase() === 'ATTENTION' ? 'bg-[#FEFCE8] text-[#CA8A04]' :
                      'bg-[#F0FDF4] text-[#16A34A]'
                    }`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => navigate(`/app/digital-twin?well=${w.id}`)}
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
