import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Download, ArrowUpDown, ChevronRight, 
  Layers, Activity, Eye, Zap, AlertTriangle, ShieldCheck 
} from 'lucide-react';
import { wellsApi, type BackendWell } from '../services/api';
import { useReplayStore } from '../store/replayStore';

export const WellExplorerPage: React.FC = () => {
  const navigate = useNavigate();
  const { allWellsReadings } = useReplayStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [wells, setWells] = useState<BackendWell[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWellId, setSelectedWellId] = useState<string>('BGW-001');

  const fetchWells = useCallback(async () => {
    try {
      const res = await wellsApi.listWells();
      if (res.success) {
        setWells(res.data);
        if (!selectedWellId && res.data.length > 0) {
          setSelectedWellId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('WellExplorer fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedWellId]);

  useEffect(() => {
    fetchWells();
    const interval = setInterval(fetchWells, 30_000);
    return () => clearInterval(interval);
  }, [fetchWells]);

  // Dynamic well data: overlay real-time replay telemetry when active
  const displayWells = React.useMemo(() => {
    if (!wells || wells.length === 0) return [];
    if (!allWellsReadings || Object.keys(allWellsReadings).length === 0) return wells;

    return wells.map(w => {
      const dyn = allWellsReadings[w.id];
      if (!dyn) return w;
      return {
        ...w,
        oilProduction: dyn.oilProduction ?? w.oilProduction,
        temperature: dyn.temperature ?? w.temperature,
        pressure: dyn.pressure ?? w.pressure,
        rodLoad: dyn.rodLoad ?? w.rodLoad,
        pumpEfficiency: dyn.pumpEfficiency ?? w.pumpEfficiency,
        status: dyn.status ?? w.status,
        failureRisk: dyn.failureRisk ?? w.failureRisk,
        failureRiskScore: dyn.failureRiskScore ?? w.failureRiskScore,
        cssPhase: dyn.cssPhase ?? w.cssPhase,
      };
    });
  }, [wells, allWellsReadings]);

  // Filtering
  const filtered = displayWells.filter(w => {
    const matchSearch = w.name.toLowerCase().includes(search.toLowerCase()) ||
                        w.reservoir.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || w.status.toUpperCase() === statusFilter.toUpperCase();
    const matchRisk   = riskFilter === 'ALL' || w.failureRisk.toUpperCase() === riskFilter.toUpperCase();
    return matchSearch && matchStatus && matchRisk;
  });

  const activeSelectedWell = displayWells.find(w => w.id === selectedWellId) || displayWells[0];

  const exportCSV = () => {
    const headers = 'Well ID,Status,CSS Phase,Oil BOPD,Temp C,Pressure MPa,Rod Load kN,Pump Eff %,Water Cut %,SOR,Risk\n';
    const rows = filtered.map(w => 
      `${w.id},${w.status},${w.cssPhase},${w.oilProduction},${w.temperature},${w.pressure},${w.rodLoad},${w.pumpEfficiency},${w.waterCut},${w.sor},${w.failureRisk}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oil_india_baghewala_wells_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-white min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32]" />
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">Oil India Limited · Well Directory</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            Baghewala Field Well Explorer
          </h1>
          <p className="text-[15px] text-[#64748B] mt-1">
            Engineering telemetry and operational status for all CSS + SRP installations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#CBD5E1] rounded text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#D32F2F]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => navigate(`/app/wells/${activeSelectedWell?.id || 'BGW-001'}`)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0284C7] text-white rounded text-[13px] font-semibold hover:bg-[#0369A1] shadow-sm transition-colors cursor-pointer"
            title="Open comprehensive engineering telemetry & diagnostics view"
          >
            <Eye className="w-4 h-4" />
            <span>{activeSelectedWell ? `View ${activeSelectedWell.id} Page` : 'View Well Page'}</span>
          </button>
          <button
            onClick={() => navigate(`/app/digital-twin?well=${activeSelectedWell?.id || 'BGW-001'}`)}
            className="flex items-center gap-2 px-4 py-2 bg-[#D32F2F] text-white rounded text-[13px] font-semibold hover:bg-[#B71C1C] shadow-sm transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>{activeSelectedWell ? `Open ${activeSelectedWell.id} Twin` : 'Open Digital Twin'}</span>
          </button>
        </div>
      </div>

      {/* ── Filter Toolbar ──────────────────────────────────────── */}
      <div className="bg-white p-4 rounded border border-[#E2E8F0] shadow-sm flex flex-wrap items-center justify-between gap-4">
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by Well ID or Reservoir..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[13px] text-[#0F172A] focus:outline-none focus:border-[#D32F2F] w-64"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="text-[#64748B] font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded text-[13px] font-medium text-[#0F172A] focus:outline-none focus:border-[#D32F2F] cursor-pointer"
            >
              <option value="ALL">All Statuses ({displayWells.length})</option>
              <option value="PRODUCING">Producing ({displayWells.filter(w => w.status.toUpperCase() === 'PRODUCING').length})</option>
              <option value="ATTENTION">Attention ({displayWells.filter(w => w.status.toUpperCase() === 'ATTENTION').length})</option>
              <option value="CRITICAL">Critical ({displayWells.filter(w => w.status.toUpperCase() === 'CRITICAL').length})</option>
            </select>
          </div>

          {/* Risk Filter */}
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="text-[#64748B] font-medium">Risk:</span>
            <select
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded text-[13px] font-medium text-[#0F172A] focus:outline-none focus:border-[#D32F2F] cursor-pointer"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="LOW">Low Risk ({displayWells.filter(w => w.failureRisk.toUpperCase() === 'LOW').length})</option>
              <option value="MEDIUM">Medium Risk ({displayWells.filter(w => w.failureRisk.toUpperCase() === 'MEDIUM').length})</option>
              <option value="HIGH">High Risk ({displayWells.filter(w => w.failureRisk.toUpperCase() === 'HIGH').length})</option>
            </select>
          </div>
        </div>

        <div className="text-[13px] text-[#64748B]">
          Showing <strong className="text-[#0F172A]">{filtered.length}</strong> of {displayWells.length} wells
        </div>
      </div>

      {/* ── Table + Quick Inspector Layout ──────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Main Engineering Data Table (3 cols) */}
        <div className="xl:col-span-3 bg-white rounded border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Well ID</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">CSS Phase</th>
                  <th className="py-3 px-3 text-right">Oil (BOPD)</th>
                  <th className="py-3 px-3 text-right">Temp (°C)</th>
                  <th className="py-3 px-3 text-right">Pressure (bar)</th>
                  <th className="py-3 px-3 text-right">Rod Load (kN)</th>
                  <th className="py-3 px-3 text-right">Pump Eff.</th>
                  <th className="py-3 px-3 text-right">SOR</th>
                  <th className="py-3 px-3 text-center">Failure Risk</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.map(well => {
                  const isSelected = activeSelectedWell?.id === well.id;
                  return (
                    <tr
                      key={well.id}
                      onClick={() => setSelectedWellId(well.id)}
                      className={`hover:bg-[#F8FAFC] transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#FFEBEE]/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                            well.status === 'Producing' ? 'bg-[#16A34A]' :
                            well.status === 'Attention' ? 'bg-[#D97706]' :
                            well.status === 'Critical' ? 'bg-[#DC2626]' : 'bg-[#94A3B8]'
                          }`} />
                          <span className={isSelected ? 'text-[#D32F2F]' : ''}>{well.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                          well.status === 'Producing' ? 'bg-[#E8F5E9] text-[#1B5E20]' :
                          well.status === 'Attention' ? 'bg-[#FFF8E1] text-[#B78103]' :
                          well.status === 'Critical' ? 'bg-[#FFEBEE] text-[#B71C1C]' : 'bg-[#F1F5F9] text-[#475569]'
                        }`}>
                          {well.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-[#64748B] font-medium">{well.cssPhase}</td>
                      <td className="py-3.5 px-3 text-right font-black text-[#0F172A]">{well.oilProduction}</td>
                      <td className="py-3.5 px-3 text-right text-[#475569]">{well.temperature}</td>
                      <td className="py-3.5 px-3 text-right text-[#475569]">{well.pressure}</td>
                      <td className="py-3.5 px-3 text-right font-bold text-[#0F172A]">
                        <span className={well.rodLoad > 18.0 ? 'text-[#D32F2F]' : ''}>
                          {well.rodLoad}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right text-[#475569]">{well.pumpEfficiency}%</td>
                      <td className="py-3.5 px-3 text-right text-[#475569]">{well.sor}</td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          well.failureRisk === 'Low' ? 'bg-[#E8F5E9] text-[#1B5E20]' :
                          well.failureRisk === 'Medium' ? 'bg-[#FFF8E1] text-[#B78103]' : 'bg-[#FFEBEE] text-[#B71C1C]'
                        }`}>
                          {well.failureRisk} ({Math.round(well.failureRiskScore * 100)}%)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/app/wells/${well.id}`);
                            }}
                            className="px-2.5 py-1 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                            title={`Open full engineering telemetry & diagnostics view for ${well.id}`}
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/app/digital-twin?well=${well.id}`);
                            }}
                            className="px-2 py-1 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded text-[11px] font-bold transition-colors cursor-pointer"
                            title={`Open 3D digital twin for ${well.id}`}
                          >
                            Twin
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Well Quick Inspector (1 col) */}
        {activeSelectedWell && (
          <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#F1F5F9]">
                <div>
                  <span className="text-[11px] font-bold text-[#D32F2F] uppercase tracking-wider">Live Quick Inspector</span>
                  <h3 className="text-xl font-black text-[#0F172A] mt-0.5">{activeSelectedWell.name}</h3>
                </div>
                <span className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase ${
                  activeSelectedWell.status === 'Producing' ? 'bg-[#E8F5E9] text-[#1B5E20]' :
                  activeSelectedWell.status === 'Attention' ? 'bg-[#FFF8E1] text-[#B78103]' :
                  activeSelectedWell.status === 'Critical' ? 'bg-[#FFEBEE] text-[#B71C1C]' : 'bg-[#F1F5F9] text-[#475569]'
                }`}>
                  {activeSelectedWell.status}
                </span>
              </div>

              <div className="space-y-3.5 text-[13px]">
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Reservoir Zone</span>
                  <span className="font-semibold text-[#0F172A]">{activeSelectedWell.reservoir}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Oil Rate</span>
                  <span className="font-bold text-[#16A34A]">{activeSelectedWell.oilProduction} BOPD</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Reservoir Temp</span>
                  <span className="font-bold text-[#EA580C]">{activeSelectedWell.temperature} °C</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Polished Rod Load</span>
                  <span className={`font-bold ${activeSelectedWell.rodLoad > 18.0 ? 'text-[#D32F2F]' : 'text-[#0F172A]'}`}>
                    {activeSelectedWell.rodLoad} kN
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Pump Efficiency</span>
                  <span className="font-semibold text-[#0F172A]">{activeSelectedWell.pumpEfficiency}%</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Water Cut</span>
                  <span className="font-semibold text-[#0F172A]">{activeSelectedWell.waterCut}%</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">CSS Phase</span>
                  <span className="font-semibold text-[#0F172A]">{activeSelectedWell.cssPhase}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Failure Risk Score</span>
                  <span className="font-bold text-[#D32F2F]">{Math.round(activeSelectedWell.failureRiskScore * 100)}%</span>
                </div>
              </div>

              {(activeSelectedWell.failureRiskScore > 0.35 || activeSelectedWell.status === 'Attention' || activeSelectedWell.status === 'Critical') && (
                <div className="mt-5 p-3 rounded bg-[#FFEBEE] border border-[#FFCDD2] text-[12px] text-[#B71C1C]">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Optimization Candidate</span>
                  </div>
                  <span>Elevated risk score ({Math.round(activeSelectedWell.failureRiskScore * 100)}%) and thermal decline indicate CSS cycle renewal and SPM dampening required.</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#F1F5F9] space-y-2">
              <button
                onClick={() => navigate(`/app/wells/${activeSelectedWell.id}`)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0284C7] text-white font-bold rounded text-[13px] hover:bg-[#0369A1] transition-colors cursor-pointer shadow-xs"
              >
                <Eye className="w-4 h-4" />
                <span>View Full {activeSelectedWell.id} Dossier</span>
              </button>
              <button
                onClick={() => navigate(`/app/digital-twin?well=${activeSelectedWell.id}`)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-[#CBD5E1] text-[#334155] font-semibold rounded text-[13px] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4 text-[#D32F2F]" />
                <span>Launch Digital Twin</span>
              </button>
              <button
                onClick={() => navigate('/app/joint-optimizer')}
                className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-[#CBD5E1] text-[#334155] font-semibold rounded text-[13px] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                <Zap className="w-4 h-4 text-[#D32F2F]" />
                <span>Run Joint Optimization</span>
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
