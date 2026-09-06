import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, AlertCircle, ArrowRight, CheckCircle2, ChevronRight, 
  Cpu, FileCheck, Filter, Gauge, Layers, RefreshCw, Send, ShieldCheck, 
  Sliders, TrendingUp, Users, Zap, Check, X, RotateCcw, Loader2
} from 'lucide-react';
import { 
  wellsApi, WellItem, 
  simulationApi, SimulationPreset, 
  approvalsApi, ApprovalItem 
} from '../services/api';

interface OptimizationPageProps {
  tab?: 'joint' | 'css' | 'srp' | 'recommendations' | 'approvals' | 'ai';
}

export const OptimizationPage: React.FC<OptimizationPageProps> = ({ tab = 'joint' }) => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState<'joint' | 'css' | 'srp' | 'recommendations' | 'approvals' | 'ai'>(
    tab as any || 'joint'
  );

  useEffect(() => {
    if (tab) {
      setCurrentTab(tab as any);
    }
  }, [tab]);
  
  // Real Wells from DB
  const [wells, setWells] = useState<WellItem[]>([]);
  const [selectedWell, setSelectedWell] = useState('BGW-001');
  const [preset, setPreset] = useState<SimulationPreset | null>(null);
  const [loadingPreset, setLoadingPreset] = useState(false);

  // Approval Subtabs & State
  const [approvalSubTab, setApprovalSubTab] = useState<'pending' | 'approved' | 'rejected' | 'audit'>('pending');
  const [approvalList, setApprovalList] = useState<ApprovalItem[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [engineerComment, setEngineerComment] = useState('Looks good. Within operating limits. -- Field Engineer');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // SRP Optimization Parameters State
  const [srpSPM, setSrpSPM] = useState(5.1);
  const [srpStrokeLength, setSrpStrokeLength] = useState(66);
  const [srpVFD, setSrpVFD] = useState(36);
  const [srpRunning, setSrpRunning] = useState(false);

  // CSS Optimization Parameters State
  const [cssSteamVol, setCssSteamVol] = useState(735);
  const [cssPressure, setCssPressure] = useState(21);
  const [cssSoakTime, setCssSoakTime] = useState(64);
  const [cssCutoff, setCssCutoff] = useState(14);
  const [cssRunning, setCssRunning] = useState(false);

  // Load wells on mount
  useEffect(() => {
    wellsApi.listWells().then(res => {
      if (res && res.data && res.data.length > 0) {
        setWells(res.data);
        setSelectedWell(res.data[0].id);
      }
    }).catch(err => console.error('Error fetching wells:', err));
  }, []);

  // Load preset whenever selected well changes
  useEffect(() => {
    if (!selectedWell) return;
    setLoadingPreset(true);
    simulationApi.getPreset(selectedWell).then(res => {
      if (res && res.data) {
        const p = res.data;
        setPreset(p);
        if (p.current) {
          setSrpSPM(p.current.spm || 5.1);
          setSrpStrokeLength(p.current.strokeLengthIn || 66);
          setSrpVFD(p.current.vfdFrequencyHz || 36);
          setCssSteamVol(p.current.steamVolumeTon || 735);
          setCssPressure(p.current.injectionPressureBar || 21);
          setCssSoakTime(p.current.soakTimeHr || 64);
        }
      }
    }).catch(err => console.error('Error fetching preset:', err))
      .finally(() => setLoadingPreset(false));
  }, [selectedWell]);

  // Load approvals
  const fetchApprovals = async () => {
    setLoadingApprovals(true);
    try {
      const res = await approvalsApi.listApprovals();
      if (res && res.data) {
        setApprovalList(res.data);
        if (res.data.length > 0 && activeReviewId === null) {
          setActiveReviewId(res.data[0].id);
          setEngineerComment(res.data[0].comment || 'Reviewed setpoint change. Parameters verified. -- Field Engineer');
        }
      }
    } catch (err) {
      console.error('Error loading approvals:', err);
    } finally {
      setLoadingApprovals(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  // Handle Approve / Reject
  const handleApproveWell = async (id: string) => {
    try {
      const res = await approvalsApi.updateStatus(id, 'Approved', engineerComment);
      if (res && res.data) {
        setApprovalList(prev => prev.map(item => item.id === id ? res.data : item));
        setActionSuccess(`Successfully approved recommendation #${id}`);
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  const handleRejectWell = async (id: string) => {
    try {
      const res = await approvalsApi.updateStatus(id, 'Rejected', engineerComment);
      if (res && res.data) {
        setApprovalList(prev => prev.map(item => item.id === id ? res.data : item));
        setActionSuccess(`Successfully rejected recommendation #${id}`);
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Rejection failed:', err);
    }
  };

  const activeReviewItem = approvalList.find(a => a.id === activeReviewId) || approvalList[0];

  return (
    <div className="p-6 md:p-8 space-y-6 bg-white min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32]" />
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">Oil India Limited · AI Optimization Core</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            Baghewala Field Parameter Optimization
          </h1>
          <p className="text-[14px] text-[#64748B] mt-0.5">
            Physics-informed multi-variable optimization for Cyclic Steam Stimulation &amp; Sucker Rod Pump operations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/digital-twin')}
            className="px-3.5 py-2 bg-white border border-[#CBD5E1] rounded text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] shadow-xs transition-all cursor-pointer"
          >
            Digital Twin →
          </button>
          <button
            onClick={() => setCurrentTab('approvals')}
            className="flex items-center gap-2 px-4 py-2 bg-[#D32F2F] text-white rounded text-[13px] font-semibold hover:bg-[#B71C1C] shadow-xs transition-colors cursor-pointer"
          >
            <FileCheck className="w-4 h-4" />
            <span>Pending Approvals ({approvalList.filter(a => a.status === 'Pending').length})</span>
          </button>
        </div>
      </div>

      {/* ── Tab Navigation ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E8F0] pb-2 text-[14px]">
        {[
          { key: 'joint', label: 'Joint CSS + SRP Optimizer' },
          { key: 'srp', label: 'SRP Optimizer' },
          { key: 'css', label: 'CSS Optimizer' },
          { key: 'approvals', label: 'Pending Approvals' },
          { key: 'ai', label: 'XGBoost & SHAP Explainability' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setCurrentTab(t.key as any)}
            className={`px-4 py-2 font-bold rounded-t transition-all cursor-pointer ${
              currentTab === t.key
                ? 'border-b-2 border-[#D32F2F] text-[#D32F2F] bg-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: SRP PARAMETER OPTIMIZATION (MATCHING SCREENSHOT 3)
         ══════════════════════════════════════════════════════════════ */}
      {currentTab === 'srp' && (
        <div className="space-y-6">
          {/* Well selector */}
          <div className="w-56">
            <select
              value={selectedWell}
              onChange={e => setSelectedWell(e.target.value)}
              className="w-full bg-white border border-[#CBD5E1] rounded px-3.5 py-2 text-[14px] font-bold text-[#0F172A] shadow-xs cursor-pointer focus:outline-none focus:border-[#D32F2F]"
            >
              {wells.map(w => (
                <option key={w.id} value={w.id}>{w.id} - {w.reservoir || 'Baghewala'}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left Card: Current vs Optimized Sliders */}
            <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] text-[13px] font-bold text-[#64748B]">
                <span>Current Parameters</span>
                <span>Optimized Parameters</span>
              </div>

              {/* Slider 1: SPM */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-[#0F172A]">SPM (strokes/min)</span>
                  <div className="flex items-center gap-6">
                    <span className="text-[#64748B] font-bold">5.5</span>
                    <span className="px-3 py-1 bg-white border border-[#CBD5E1] rounded font-black text-[#0F172A] min-w-14 text-center">
                      {srpSPM.toFixed(1)}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="0.1"
                  value={srpSPM}
                  onChange={e => setSrpSPM(Number(e.target.value))}
                  className="w-full accent-[#0284C7] cursor-pointer"
                />
              </div>

              {/* Slider 2: Stroke Length */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-[#0F172A]">Stroke Length (in)</span>
                  <div className="flex items-center gap-6">
                    <span className="text-[#64748B] font-bold">68</span>
                    <span className="px-3 py-1 bg-white border border-[#CBD5E1] rounded font-black text-[#0F172A] min-w-14 text-center">
                      {srpStrokeLength}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="48"
                  max="84"
                  step="2"
                  value={srpStrokeLength}
                  onChange={e => setSrpStrokeLength(Number(e.target.value))}
                  className="w-full accent-[#0284C7] cursor-pointer"
                />
              </div>

              {/* Slider 3: VFD */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-[#0F172A]">VFD (Hz)</span>
                  <div className="flex items-center gap-6">
                    <span className="text-[#64748B] font-bold">38</span>
                    <span className="px-3 py-1 bg-white border border-[#CBD5E1] rounded font-black text-[#0F172A] min-w-14 text-center">
                      {srpVFD}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="25"
                  max="50"
                  step="1"
                  value={srpVFD}
                  onChange={e => setSrpVFD(Number(e.target.value))}
                  className="w-full accent-[#0284C7] cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#F1F5F9] flex items-center gap-4">
                <button
                  onClick={() => { setSrpSPM(5.5); setSrpStrokeLength(68); setSrpVFD(38); }}
                  className="px-5 py-2.5 bg-white border border-[#CBD5E1] text-[#475569] font-bold text-[13px] rounded hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Reset
                </button>
                <button
                  onClick={() => {
                    setSrpRunning(true);
                    setTimeout(() => { setSrpRunning(false); setSrpSPM(5.1); setSrpStrokeLength(66); setSrpVFD(36); }, 500);
                  }}
                  className="flex-1 py-2.5 bg-[#065F46] hover:bg-[#047857] text-white font-bold text-[13px] rounded transition-colors shadow-xs cursor-pointer text-center"
                >
                  {srpRunning ? 'Optimizing...' : 'Run Optimization'}
                </button>
              </div>
            </div>

            {/* Right Card: Expected Impact (Matching Screenshot 3) */}
            <div className="space-y-6">
              <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-4">
                <h3 className="text-[16px] font-bold text-[#0F172A] pb-3 border-b border-[#F1F5F9]">
                  Expected Impact
                </h3>

                <div className="space-y-3.5 text-[14px]">
                  <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">Pump Efficiency</span>
                    <span className="font-black text-[#15803D]">+6.2%</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">Rod Loading</span>
                    <span className="font-black text-[#15803D]">-11.0%</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">Failure Risk</span>
                    <span className="font-black text-[#15803D]">-18.4%</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-[#64748B]">Energy Consumption</span>
                    <span className="font-black text-[#15803D]">-7.6%</span>
                  </div>
                </div>
              </div>

              {/* Status Box (Matching Screenshot 3) */}
              <div className="p-4 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[#065F46] font-bold text-[14px]">
                  <CheckCircle2 className="w-5 h-5 text-[#059669]" />
                  <span>Within equipment limits</span>
                </div>
                <p className="text-[12px] text-[#065F46]/80 font-medium pl-7">
                  Confidence: 89%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: CSS PARAMETER OPTIMIZATION (MATCHING SCREENSHOT 5)
         ══════════════════════════════════════════════════════════════ */}
      {currentTab === 'css' && (
        <div className="space-y-6">
          {/* Well selector */}
          <div className="w-56">
            <select
              value={selectedWell}
              onChange={e => setSelectedWell(e.target.value)}
              className="w-full bg-white border border-[#CBD5E1] rounded px-3.5 py-2 text-[14px] font-bold text-[#0F172A] shadow-xs cursor-pointer focus:outline-none focus:border-[#D32F2F]"
            >
              {wells.map(w => (
                <option key={w.id} value={w.id}>{w.id} - {w.reservoir || 'Baghewala'}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left Card: Current vs Optimized Sliders */}
            <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] text-[13px] font-bold text-[#64748B]">
                <span>Current Parameters</span>
                <span>Optimized Parameters</span>
              </div>

              {/* Slider 1: Steam Volume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-[#0F172A]">Steam Volume (ton)</span>
                  <div className="flex items-center gap-6">
                    <span className="text-[#64748B] font-bold">800</span>
                    <span className="px-3 py-1 bg-white border border-[#CBD5E1] rounded font-black text-[#0F172A] min-w-14 text-center">
                      {cssSteamVol}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="500"
                  max="1200"
                  step="25"
                  value={cssSteamVol}
                  onChange={e => setCssSteamVol(Number(e.target.value))}
                  className="w-full accent-[#0284C7] cursor-pointer"
                />
              </div>

              {/* Slider 2: Injection Pressure */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-[#0F172A]">Injection Pressure (bar)</span>
                  <div className="flex items-center gap-6">
                    <span className="text-[#64748B] font-bold">22</span>
                    <span className="px-3 py-1 bg-white border border-[#CBD5E1] rounded font-black text-[#0F172A] min-w-14 text-center">
                      {cssPressure}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="15"
                  max="40"
                  step="1"
                  value={cssPressure}
                  onChange={e => setCssPressure(Number(e.target.value))}
                  className="w-full accent-[#0284C7] cursor-pointer"
                />
              </div>

              {/* Slider 3: Soak Time */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-[#0F172A]">Soak Time (hr)</span>
                  <div className="flex items-center gap-6">
                    <span className="text-[#64748B] font-bold">72</span>
                    <span className="px-3 py-1 bg-white border border-[#CBD5E1] rounded font-black text-[#0F172A] min-w-14 text-center">
                      {cssSoakTime}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="36"
                  max="120"
                  step="4"
                  value={cssSoakTime}
                  onChange={e => setCssSoakTime(Number(e.target.value))}
                  className="w-full accent-[#0284C7] cursor-pointer"
                />
              </div>

              {/* Slider 4: Production Cutoff */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-[#0F172A]">Production Cutoff (days)</span>
                  <div className="flex items-center gap-6">
                    <span className="text-[#64748B] font-bold">15</span>
                    <span className="px-3 py-1 bg-white border border-[#CBD5E1] rounded font-black text-[#0F172A] min-w-14 text-center">
                      {cssCutoff}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="8"
                  max="30"
                  step="1"
                  value={cssCutoff}
                  onChange={e => setCssCutoff(Number(e.target.value))}
                  className="w-full accent-[#0284C7] cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#F1F5F9] flex items-center gap-4">
                <button
                  onClick={() => { setCssSteamVol(800); setCssPressure(22); setCssSoakTime(72); setCssCutoff(15); }}
                  className="px-5 py-2.5 bg-white border border-[#CBD5E1] text-[#475569] font-bold text-[13px] rounded hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Reset
                </button>
                <button
                  onClick={() => {
                    setCssRunning(true);
                    setTimeout(() => { setCssRunning(false); setCssSteamVol(735); setCssPressure(21); setCssSoakTime(64); setCssCutoff(14); }, 500);
                  }}
                  className="flex-1 py-2.5 bg-[#065F46] hover:bg-[#047857] text-white font-bold text-[13px] rounded transition-colors shadow-xs cursor-pointer text-center"
                >
                  {cssRunning ? 'Optimizing...' : 'Run Optimization'}
                </button>
              </div>
            </div>

            {/* Right Card: Expected Impact (Matching Screenshot 5) */}
            <div className="space-y-6">
              <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-4">
                <h3 className="text-[16px] font-bold text-[#0F172A] pb-3 border-b border-[#F1F5F9]">
                  Expected Impact
                </h3>

                <div className="space-y-3.5 text-[14px]">
                  <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">Production</span>
                    <span className="font-black text-[#15803D]">+14.2%</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">SOR</span>
                    <span className="font-black text-[#15803D]">-10.6%</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">Energy Consumption</span>
                    <span className="font-black text-[#15803D]">-8.1%</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">Steam Usage</span>
                    <span className="font-black text-[#15803D]">-8.2%</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-[#64748B]">Cycle Efficiency</span>
                    <span className="font-black text-[#15803D]">+11.4%</span>
                  </div>
                </div>
              </div>

              {/* Status Box (Matching Screenshot 5) */}
              <div className="p-4 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[#065F46] font-bold text-[14px]">
                  <CheckCircle2 className="w-5 h-5 text-[#059669]" />
                  <span>Within safe operating limits</span>
                </div>
                <p className="text-[12px] text-[#065F46]/80 font-medium pl-7">
                  Confidence: 87%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: PENDING APPROVALS & COMMENTS (MATCHING SCREENSHOT 2)
         ══════════════════════════════════════════════════════════════ */}
      {currentTab === 'approvals' && (
        <div className="space-y-6">
          
          {/* Subtabs: Pending Approvals | Approved | Rejected | Audit Logs */}
          <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-6 border-b border-[#E2E8F0] pb-3 text-[14px]">
              {[
                { key: 'pending', label: 'Pending Approvals' },
                { key: 'approved', label: 'Approved' },
                { key: 'rejected', label: 'Rejected' },
                { key: 'audit', label: 'Audit Logs' },
              ].map(sub => (
                <button
                  key={sub.key}
                  onClick={() => setApprovalSubTab(sub.key as any)}
                  className={`font-bold pb-2 transition-colors cursor-pointer border-b-2 ${
                    approvalSubTab === sub.key
                      ? 'border-[#0284C7] text-[#0284C7]'
                      : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Table matching Screenshot 2 */}
            <div className="overflow-x-auto">
              {loadingApprovals ? (
                <div className="py-12 flex flex-col items-center justify-center text-[#64748B] gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#0284C7]" />
                  <span className="text-[13px]">Loading governance approvals...</span>
                </div>
              ) : approvalList.length === 0 ? (
                <div className="py-8 text-center text-[#64748B] text-[13px]">No records found.</div>
              ) : (
                <table className="w-full text-left text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[#64748B] font-bold">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Well ID</th>
                      <th className="py-3 px-4">Recommendation</th>
                      <th className="py-3 px-4">Expected Impact</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {approvalList
                      .filter(item => approvalSubTab === 'audit' ? true : item.status.toLowerCase() === approvalSubTab)
                      .map(item => {
                        return (
                          <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                            <td className="py-3.5 px-4 text-[#64748B]">{item.date}</td>
                            <td className="py-3.5 px-4 font-bold text-[#0F172A]">{item.wellId}</td>
                            <td className="py-3.5 px-4 text-[#334155]">
                              <div className="font-semibold">{item.recommendation}</div>
                              <div className="text-[11px] text-[#64748B]">
                                {Object.entries(item.setpoints || {}).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-[#15803D]">
                              {item.impact}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                                item.status === 'Approved' ? 'bg-[#ECFDF5] text-[#065F46]' :
                                item.status === 'Rejected' ? 'bg-[#FEF2F2] text-[#991B1B]' :
                                'bg-[#FFFBEB] text-[#B45309]'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {item.status === 'Pending' ? (
                                <button
                                  onClick={() => {
                                    setActiveReviewId(item.id);
                                    setEngineerComment(item.comment || `Reviewed setpoint change for ${item.wellId}. -- Field Engineer`);
                                  }}
                                  className="px-3.5 py-1 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded text-[12px] font-bold transition-colors cursor-pointer shadow-xs"
                                >
                                  Review
                                </button>
                              ) : (
                                <span className="text-[#94A3B8] text-[12px]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Bottom Card: Comments & Approve / Reject (Matching Screenshot 2) */}
          {activeReviewItem && (
            <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[15px] font-bold text-[#0F172A]">
                  Comments ({activeReviewItem.wellId} · Recommendation #{activeReviewItem.id})
                </h4>
                {actionSuccess && (
                  <span className="text-[12px] font-bold text-[#16A34A] animate-fade-in">{actionSuccess}</span>
                )}
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="w-full md:flex-1">
                  <input
                    type="text"
                    value={engineerComment}
                    onChange={e => setEngineerComment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[13px] text-[#334155] focus:bg-white focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <button
                    onClick={() => handleApproveWell(activeReviewItem.id)}
                    disabled={activeReviewItem.status === 'Approved'}
                    className="flex items-center gap-1.5 px-6 py-2.5 bg-[#065F46] hover:bg-[#047857] disabled:opacity-50 text-white font-bold text-[13px] rounded transition-colors shadow-xs cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleRejectWell(activeReviewItem.id)}
                    disabled={activeReviewItem.status === 'Rejected'}
                    className="flex items-center gap-1.5 px-6 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-50 text-white font-bold text-[13px] rounded transition-colors shadow-xs cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 4: JOINT CSS + SRP OPTIMIZER (Baseline)
         ══════════════════════════════════════════════════════════════ */}
      {currentTab === 'joint' && (
        <div className="space-y-6">
          <div className="p-5 rounded border border-[#CBD5E1] bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded bg-[#FFEBEE] border border-[#FFCDD2] flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-[#D32F2F]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#FFEBEE] text-[#B71C1C]">PRIORITY WELL CANDIDATE</span>
                  <span className="text-[12px] text-[#64748B]">Well: <strong className="text-[#0F172A]">{selectedWell}</strong></span>
                </div>
                <h3 className="text-xl font-black text-[#0F172A] mt-1">Well {selectedWell} ({preset?.formation || 'Baghewala Heavy Oil'})</h3>
                <p className="text-[13px] text-[#64748B]">
                  Simultaneously optimize Cycle {(preset?.css_baseline?.cycle_number || 14) + 1} steam injection with adjusted thermal volume and SRP pumping dynamics.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-48">
                <select
                  value={selectedWell}
                  onChange={e => setSelectedWell(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded px-3 py-2 text-[13px] font-bold text-[#0F172A] shadow-xs cursor-pointer focus:outline-none focus:border-[#D32F2F]"
                >
                  {wells.map(w => (
                    <option key={w.id} value={w.id}>{w.id} - {w.reservoir || 'Baghewala'}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setCurrentTab('srp')}
                className="px-4 py-2 bg-[#0284C7] text-white font-bold text-[13px] rounded hover:bg-[#0369A1] transition-colors"
              >
                Fine-Tune SRP →
              </button>
              <button
                onClick={() => setCurrentTab('css')}
                className="px-4 py-2 bg-[#065F46] text-white font-bold text-[13px] rounded hover:bg-[#047857] transition-colors"
              >
                Fine-Tune CSS →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-4">
              <h4 className="text-[16px] font-bold text-[#0F172A] pb-3 border-b border-[#F1F5F9]">Current Operational Baseline</h4>
              <div className="space-y-3 text-[13px]">
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">CSS Status:</span>
                  <span className="font-bold text-[#0F172A]">
                    Cycle 14 (Late Decline Phase)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Steam Volume:</span>
                  <span className="font-bold text-[#0F172A]">{preset?.current?.steamVolumeTon || 735} metric tons</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Pumping Speed (SPM):</span>
                  <span className="font-bold text-[#0F172A]">{preset?.current?.spm || 5.1} SPM</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Polished Rod Load:</span>
                  <span className="font-bold text-[#0F172A]">{preset?.current?.rodLoad || 5.8} kN</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#64748B]">Oil Production:</span>
                  <span className="font-bold text-[#0F172A]">{preset?.current?.oilProduction || 28.5} BOPD</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded border-2 border-[#D32F2F] shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#FFEBEE]">
                <h4 className="text-[16px] font-bold text-[#D32F2F]">AI Recommended Coupled Setpoints</h4>
                <button
                  onClick={async () => {
                    try {
                      await approvalsApi.createApproval({
                        well_id: selectedWell,
                        recommendation: `Joint CSS Cycle 15 & SRP Speed Dampening (${selectedWell})`,
                        impact: `+${((preset?.current?.oilProduction || 28.5) * 0.28).toFixed(1)} BOPD, -16.5% SOR`,
                        submitted_by: 'Joint CSS+SRP Optimizer',
                        comment: 'Coupled reservoir thermal mobility and pump speed envelope optimized.',
                        setpoints: {
                          steamVolumeTon: Math.round((preset?.current?.steamVolumeTon || 735) * 1.15),
                          spm: Number(((preset?.current?.spm || 5.1) * 0.85).toFixed(1)),
                          soakTimeHr: (preset?.current?.soakTimeHr || 64) + 24
                        }
                      });
                      setActionSuccess(`Submitted Joint Optimization for ${selectedWell} to Approvals Queue`);
                      fetchApprovals();
                      setTimeout(() => setActionSuccess(null), 3000);
                    } catch (e) {
                      console.error('Failed to submit joint approval:', e);
                    }
                  }}
                  className="px-3 py-1 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold text-[11px] rounded shadow-xs cursor-pointer transition-colors"
                >
                  Submit for Approval
                </button>
              </div>
              <div className="space-y-3 text-[13px]">
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Recommended CSS:</span>
                  <span className="font-bold text-[#15803D]">
                    Cycle 15 ({Math.round((preset?.current?.steamVolumeTon || 735) * 1.15)} tons)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Optimized SPM:</span>
                  <span className="font-bold text-[#15803D]">
                    {((preset?.current?.spm || 5.1) * 0.85).toFixed(1)} SPM (Fluid Pound Suppression)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Expected Rod Load:</span>
                  <span className="font-bold text-[#15803D]">
                    {((preset?.current?.rodLoad || 5.8) * 0.88).toFixed(1)} kN (Safe Envelope)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Projected Oil Rate:</span>
                  <span className="font-black text-[#15803D] text-[15px]">
                    {((preset?.current?.oilProduction || 28.5) * 1.28).toFixed(1)} BOPD (+{((preset?.current?.oilProduction || 28.5) * 0.28).toFixed(1)} BOPD)
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#64748B]">Projected SOR:</span>
                  <span className="font-black text-[#15803D]">
                    {((preset?.current?.sor || 3.5) * 0.835).toFixed(1)} bbl/bbl (-16.5%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 5: EXPLAINABLE AI & SHAP
         ══════════════════════════════════════════════════════════════ */}
      {currentTab === 'ai' && (
        <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-[18px] font-bold text-[#0F172A]">XGBoost Model Explainability &amp; SHAP Feature Attribution</h3>
              <p className="text-[13px] text-[#64748B]">Decomposition of machine learning decision drivers for BGW-014 recommendation</p>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#E8F5E9] text-[#166534] text-[12px] font-bold">
              Model R² Score: 0.942
            </span>
          </div>

          <div className="space-y-4">
            <h5 className="text-[14px] font-bold text-[#0F172A]">SHAP Factor Contributions to +9.6 BOPD Forecast Uplift:</h5>
            {[
              { factor: 'Steam Volume Increase (800t → 1100t)', impact: '+5.2 BOPD', percentage: 54, desc: 'Increases reservoir heat sphere radius from 42m to 56m, cutting heavy oil viscosity from 1820 cP to 640 cP.' },
              { factor: 'Pumping Speed Dampening (10 SPM → 7.5 SPM)', impact: '+2.6 BOPD', percentage: 27, desc: 'Eliminates fluid pound and allows full volumetric intake of heavy oil into the pump barrel.' },
              { factor: 'Extended Soak Duration (18d → 20d)', impact: '+1.8 BOPD', percentage: 19, desc: 'Improves heat diffusion through low-permeability silt streaks in Baghewala Sand Member A.' },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded border border-[#E2E8F0] bg-[#F8FAFC]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-[#0F172A] text-[14px]">{item.factor}</span>
                  <span className="font-black text-[#15803D] text-[15px]">{item.impact}</span>
                </div>
                <div className="w-full h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-[#15803D] rounded-full" style={{ width: `${item.percentage}%` }} />
                </div>
                <p className="text-[12px] text-[#64748B] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
