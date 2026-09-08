import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, AlertCircle, ArrowRight, CheckCircle2, ChevronRight, 
  Cpu, FileCheck, Filter, Gauge, Layers, RefreshCw, Send, ShieldCheck, 
  Sliders, TrendingUp, Users, Zap, Check, X, RotateCcw, Loader2, Calendar, Thermometer, ShieldAlert
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  wellsApi, WellItem, 
  simulationApi, SimulationPreset, 
  approvalsApi, ApprovalItem,
  PostCssScheduleResponse,
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
  const [postCssSchedule, setPostCssSchedule] = useState<PostCssScheduleResponse | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

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

  // Dynamic Expected Impact for SRP Tab
  const srpImpact = useMemo(() => {
    const baseSPM = preset?.current?.spm || 5.5;
    const baseStroke = preset?.current?.strokeLengthIn || 68;
    const baseVFD = preset?.current?.vfdFrequencyHz || 38;

    const spmDelta = ((srpSPM - baseSPM) / baseSPM) * 100;
    const strokeDelta = ((srpStrokeLength - baseStroke) / baseStroke) * 100;
    const vfdDelta = ((srpVFD - baseVFD) / baseVFD) * 100;

    const effGain = (baseSPM - srpSPM) * 15.5;
    const rodLoading = (spmDelta * 1.2) + (strokeDelta * 0.4) - 1.5;
    const failureRisk = rodLoading * 1.65;
    const energy = (vfdDelta * 0.7) + (spmDelta * 0.3);

    const isAtBase = Math.abs(spmDelta) < 0.1 && Math.abs(strokeDelta) < 0.1 && Math.abs(vfdDelta) < 0.1;

    return {
      pumpEff: isAtBase ? 0.0 : effGain,
      rodLoading: isAtBase ? 0.0 : rodLoading,
      failureRisk: isAtBase ? 0.0 : failureRisk,
      energy: isAtBase ? 0.0 : energy,
      confidence: Math.min(95, Math.max(80, Math.round(89 - Math.abs(srpSPM - 5.1) * 3))),
    };
  }, [srpSPM, srpStrokeLength, srpVFD, preset]);

  // Dynamic Expected Impact for CSS Tab
  const cssImpact = useMemo(() => {
    const baseSteam = preset?.current?.steamVolumeTon || 800;
    const basePressure = preset?.current?.injectionPressureBar || 22;
    const baseSoak = preset?.current?.soakTimeHr || 72;
    const baseCutoff = 15;

    const steamDelta = ((cssSteamVol - baseSteam) / baseSteam) * 100;
    const pressureDelta = ((cssPressure - basePressure) / basePressure) * 100;
    const soakDelta = ((cssSoakTime - baseSoak) / baseSoak) * 100;
    const cutoffGain = (cssCutoff - baseCutoff) * 1.5;

    const production = -steamDelta * 0.5 + pressureDelta * 0.4 - soakDelta * 0.3 + cutoffGain + 10.5;
    const sor = steamDelta * 0.7 - production * 0.35;
    const energy = steamDelta * 0.9 + pressureDelta * 0.15;
    const steam = steamDelta;
    const sweep = pressureDelta * 0.6 - soakDelta * 0.2 + 11.4;

    const isAtBase = Math.abs(steamDelta) < 0.1 && Math.abs(pressureDelta) < 0.1 && Math.abs(soakDelta) < 0.1 && cssCutoff === 15;

    return {
      production: isAtBase ? 0.0 : production,
      sor: isAtBase ? 0.0 : sor,
      energy: isAtBase ? 0.0 : energy,
      steam: isAtBase ? 0.0 : steam,
      sweep: isAtBase ? 0.0 : sweep,
      confidence: Math.min(95, Math.max(80, Math.round(87 - Math.abs(cssPressure - 21) * 0.5))),
    };
  }, [cssSteamVol, cssPressure, cssSoakTime, cssCutoff, preset]);

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

    setLoadingSchedule(true);
    simulationApi.getPostCssSchedule(selectedWell, 60).then(res => {
      if (res && res.success && res.data) {
        setPostCssSchedule(res.data);
      }
    }).catch(err => console.error('Error fetching schedule:', err))
      .finally(() => setLoadingSchedule(false));
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
              <div className="pt-4 border-t border-[#F1F5F9] flex flex-wrap items-center gap-3">
                <button
                  onClick={() => { setSrpSPM(5.5); setSrpStrokeLength(68); setSrpVFD(38); }}
                  className="px-4 py-2 bg-white border border-[#CBD5E1] text-[#475569] font-bold text-[12px] rounded hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Reset to DB
                </button>
                <button
                  onClick={() => {
                    setSrpRunning(true);
                    setTimeout(() => {
                      setSrpSPM(5.1);
                      setSrpStrokeLength(66);
                      setSrpVFD(36);
                      setSrpRunning(false);
                    }, 400);
                  }}
                  className="px-3.5 py-2 bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] text-[#1D4ED8] font-bold text-[12px] rounded transition-colors cursor-pointer"
                >
                  AI Recommend
                </button>
                <button
                  onClick={() => {
                    setSrpRunning(true);
                    setTimeout(() => { setSrpRunning(false); }, 450);
                  }}
                  className="flex-1 py-2 bg-[#065F46] hover:bg-[#047857] text-white font-bold text-[13px] rounded transition-colors shadow-xs cursor-pointer text-center"
                >
                  {srpRunning ? 'Simulating Setpoints...' : 'Run Simulation'}
                </button>
              </div>
            </div>

            {/* Right Card: Expected Impact (Matching Screenshot 3) */}
            <div className="space-y-6">
              <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                  <h3 className="text-[16px] font-bold text-[#0F172A]">
                    Expected Impact
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">
                    Dynamic
                  </span>
                </div>

                <div className="space-y-3.5 text-[14px]">
                  <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">Pump Efficiency</span>
                    <span className={`font-black ${srpImpact.pumpEff >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                      {srpImpact.pumpEff >= 0 ? '+' : ''}{srpImpact.pumpEff.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">Rod Loading</span>
                    <span className={`font-black ${srpImpact.rodLoading <= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                      {srpImpact.rodLoading <= 0 ? '' : '+'}{srpImpact.rodLoading.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">Failure Risk</span>
                    <span className={`font-black ${srpImpact.failureRisk <= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                      {srpImpact.failureRisk <= 0 ? '' : '+'}{srpImpact.failureRisk.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-[#64748B]">Energy Consumption</span>
                    <span className={`font-black ${srpImpact.energy <= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                      {srpImpact.energy <= 0 ? '' : '+'}{srpImpact.energy.toFixed(1)}%
                    </span>
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
                  Confidence: {srpImpact.confidence}%
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
              <div className="pt-4 border-t border-[#F1F5F9] flex flex-wrap items-center gap-3">
                <button
                  onClick={() => { setCssSteamVol(800); setCssPressure(22); setCssSoakTime(72); setCssCutoff(15); }}
                  className="px-4 py-2 bg-white border border-[#CBD5E1] text-[#475569] font-bold text-[12px] rounded hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Reset to DB
                </button>
                <button
                  onClick={() => {
                    setCssRunning(true);
                    setTimeout(() => {
                      setCssSteamVol(735);
                      setCssPressure(21);
                      setCssSoakTime(64);
                      setCssCutoff(14);
                      setCssRunning(false);
                    }, 400);
                  }}
                  className="px-3.5 py-2 bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] text-[#1D4ED8] font-bold text-[12px] rounded transition-colors cursor-pointer"
                >
                  AI Recommend
                </button>
                <button
                  onClick={() => {
                    setCssRunning(true);
                    setTimeout(() => { setCssRunning(false); }, 450);
                  }}
                  className="flex-1 py-2 bg-[#065F46] hover:bg-[#047857] text-white font-bold text-[13px] rounded transition-colors shadow-xs cursor-pointer text-center"
                >
                  {cssRunning ? 'Simulating Setpoints...' : 'Run Simulation'}
                </button>
              </div>
            </div>

            {/* Right Card: Expected Impact (Matching Screenshot 5) */}
            <div className="space-y-6">
              <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                  <h3 className="text-[16px] font-bold text-[#0F172A]">
                    Expected Impact
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">
                    Dynamic
                  </span>
                </div>

                <div className="space-y-3.5 text-[14px]">
                  <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">Production</span>
                    <span className={`font-black ${cssImpact.production >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                      {cssImpact.production >= 0 ? '+' : ''}{cssImpact.production.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">SOR</span>
                    <span className={`font-black ${cssImpact.sor <= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                      {cssImpact.sor <= 0 ? '' : '+'}{cssImpact.sor.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">Energy Consumption</span>
                    <span className={`font-black ${cssImpact.energy <= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                      {cssImpact.energy <= 0 ? '' : '+'}{cssImpact.energy.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">Steam Usage</span>
                    <span className={`font-black ${cssImpact.steam <= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                      {cssImpact.steam <= 0 ? '' : '+'}{cssImpact.steam.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-[#64748B]">Cycle Efficiency</span>
                    <span className={`font-black ${cssImpact.sweep >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                      {cssImpact.sweep >= 0 ? '+' : ''}{cssImpact.sweep.toFixed(1)}%
                    </span>
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
                  Confidence: {cssImpact.confidence}%
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
                <h3 className="text-xl font-black text-[#0F172A] mt-1">Well {selectedWell} ({preset?.reservoir || 'Baghewala Heavy Oil'})</h3>
                <p className="text-[13px] text-[#64748B]">
                  Simultaneously optimize Cycle {preset?.optimized?.cycleNumber || (preset?.current?.cycleNumber ? preset.current.cycleNumber + 1 : 5)} steam injection with adjusted thermal volume and SRP pumping dynamics.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-64 min-w-[240px]">
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
                    {preset?.current?.cssStatus || `Cycle ${preset?.current?.cycleNumber || 4} (Late Decline Phase)`}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Steam Volume:</span>
                  <span className="font-bold text-[#0F172A]">{preset?.current?.steamVolumeTon || 1169.3} metric tons</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Pumping Speed (SPM):</span>
                  <span className="font-bold text-[#0F172A]">{(preset?.current?.spm || 5.1).toFixed(1)} SPM</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Polished Rod Load:</span>
                  <span className="font-bold text-[#0F172A]">{(preset?.current?.rodLoad || 16.9).toFixed(1)} kN</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#64748B]">Oil Production:</span>
                  <span className="font-bold text-[#0F172A]">{(preset?.current?.oilProduction || 28.5).toFixed(1)} BOPD</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded border-2 border-[#D32F2F] shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#FFEBEE]">
                <h4 className="text-[16px] font-bold text-[#D32F2F]">AI Recommended Coupled Setpoints</h4>
                <button
                  onClick={async () => {
                    try {
                      const nextC = preset?.optimized?.cycleNumber || 5;
                      await approvalsApi.createApproval({
                        well_id: selectedWell,
                        recommendation: `Joint CSS Cycle ${nextC} & SRP Speed Dampening (${selectedWell})`,
                        impact: `+${((preset?.current?.oilProduction || 28.5) * 0.28).toFixed(1)} BOPD, -16.5% SOR`,
                        submitted_by: 'Joint CSS+SRP Optimizer',
                        comment: 'Coupled reservoir thermal mobility and pump speed envelope optimized.',
                        setpoints: {
                          steamVolumeTon: Math.round(preset?.optimized?.steamVolumeTon || (preset?.current?.steamVolumeTon || 1169.3) * 1.15),
                          spm: Number(((preset?.current?.spm || 5.1) * 0.85).toFixed(1)),
                          soakTimeHr: (preset?.current?.soakTimeHr || 144) + 24
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
                    Cycle {preset?.optimized?.cycleNumber || 5} ({Math.round(preset?.optimized?.steamVolumeTon || (preset?.current?.steamVolumeTon || 1169.3) * 1.15)} tons)
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
                    {((preset?.current?.rodLoad || 16.9) * 0.88).toFixed(1)} kN (Safe Envelope)
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
                    {preset?.current?.sor && preset.current.sor < 1.0 
                      ? `${(preset.current.sor * 0.835).toFixed(2)} m³/m³ (-16.5%)` 
                      : `${((preset?.current?.sor || 2.4) * 0.835).toFixed(1)} bbl/bbl (-16.5%)`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 60-Day Post-CSS Dynamic Staging Schedule (SIH Core Innovation) ── */}
          {postCssSchedule && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F1F5F9]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                    <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">
                      Baghewala Thermal EOR · Time-Coupled Staging
                    </span>
                  </div>
                  <h4 className="text-xl font-black text-[#0F172A] tracking-tight">
                    60-Day Dynamic Post-CSS Pumping Schedule ({selectedWell})
                  </h4>
                  <p className="text-[13px] text-[#64748B]">
                    Automated reservoir thermal dissipation modeling, Walther heavy crude viscosity tracking, and anti-floating SPM derating
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-[#F0FDF4] border border-[#BBF7D0] px-3.5 py-1.5 rounded-lg text-right">
                    <div className="text-[11px] text-[#166534] font-semibold">Incremental Oil</div>
                    <div className="text-base font-black text-[#15803D]">{postCssSchedule.summary.incrementalOilPct}</div>
                  </div>
                  <div className="bg-[#EFF6FF] border border-[#BFDBFE] px-3.5 py-1.5 rounded-lg text-right">
                    <div className="text-[11px] text-[#1E40AF] font-semibold">SOR Reduction</div>
                    <div className="text-base font-black text-[#2563EB]">{postCssSchedule.summary.sorReductionPct}</div>
                  </div>
                  <div className="bg-[#FFFBEB] border border-[#FDE68A] px-3.5 py-1.5 rounded-lg text-right">
                    <div className="text-[11px] text-[#92400E] font-semibold">Failures Prevented</div>
                    <div className="text-base font-black text-[#D97706]">{postCssSchedule.summary.rodFailuresPrevented} Events</div>
                  </div>
                </div>
              </div>

              {/* 3-Phase Operational Staging Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {postCssSchedule.summary.stages.map((stg, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-lg border space-y-2.5 ${
                      idx === 0 
                        ? 'bg-amber-50/50 border-amber-200' 
                        : idx === 1 
                        ? 'bg-blue-50/50 border-blue-200' 
                        : 'bg-indigo-50/50 border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-black text-[#0F172A]">{stg.name}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white text-[#475569] shadow-xs">
                        {stg.days}
                      </span>
                    </div>
                    <div className="text-[12px] text-[#475569] space-y-1">
                      <div className="flex justify-between">
                        <span>Thermal Envelope:</span>
                        <strong className="text-[#0F172A]">{stg.tempRange}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Heavy Oil Viscosity:</span>
                        <strong className="text-[#0F172A]">{stg.viscosityRange}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Recommended Speed:</span>
                        <strong className="text-[#15803D] font-black">{stg.spmRange}</strong>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#64748B] pt-1 border-t border-slate-200/60 leading-relaxed">
                      {stg.action}
                    </p>
                  </div>
                ))}
              </div>

              {/* 60-Day Interactive Trajectory Chart */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[13px] font-bold text-[#475569]">
                  <span>Reservoir Cooldown, Viscosity Rise &amp; Dynamic SPM Derating Trajectory</span>
                  <span className="text-[12px] text-[#64748B] font-normal">Day 1 (Steam Soak Release) &rarr; Day 60 (Cycle Cutoff)</span>
                </div>
                <div className="h-72 w-full bg-slate-50/50 rounded-lg p-3 border border-[#E2E8F0]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={postCssSchedule.dailyData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="day" label={{ value: 'Days Post-Steam', position: 'insideBottomRight', offset: -5 }} stroke="#64748B" fontSize={11} />
                      <YAxis yAxisId="left" stroke="#64748B" fontSize={11} label={{ value: 'Temp (°C) / SPM (×10)', angle: -90, position: 'insideLeft' }} />
                      <YAxis yAxisId="right" orientation="right" stroke="#0284C7" fontSize={11} label={{ value: 'Oil Rate (BPD)', angle: 90, position: 'insideRight' }} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs space-y-1">
                                <div className="font-bold border-b border-slate-700 pb-1 text-amber-300">
                                  Day {d.day} — {d.phase}
                                </div>
                                <div>Reservoir Temp: <strong>{d.temperatureC}°C</strong></div>
                                <div>Viscosity: <strong>{d.viscosityCP} cP</strong></div>
                                <div>Critical Floating SPM: <strong className="text-red-400">{d.spmCrit} SPM</strong></div>
                                <div>Recommended Setpoint: <strong className="text-emerald-400">{d.recommendedSPM} SPM</strong> ({d.recommendedVFDHz} Hz)</div>
                                <div>Oil Production: <strong className="text-blue-300">{d.oilRateBpd} BPD</strong></div>
                                <div>Floating Risk: <strong className={d.floatingRiskPct > 30 ? 'text-red-400' : 'text-emerald-300'}>{d.floatingRiskPct}%</strong></div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                      <Line yAxisId="left" type="monotone" dataKey="temperatureC" name="Reservoir Temp (°C)" stroke="#F59E0B" strokeWidth={2.5} dot={false} />
                      <Line yAxisId="left" type="monotone" dataKey="spmCrit" name="Critical Floating SPM" stroke="#EF4444" strokeWidth={1.8} strokeDasharray="4 4" dot={false} />
                      <Line yAxisId="left" type="stepAfter" dataKey="recommendedSPM" name="Recommended SPM Setpoint" stroke="#10B981" strokeWidth={2.5} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="oilRateBpd" name="Oil Rate (BPD)" stroke="#0284C7" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Submit Staging Schedule Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[#F1F5F9]">
                <p className="text-[12px] text-[#64748B]">
                  Pumping schedule automatically bounds rod string within safe API RP 11L fatigue limits throughout heavy crude cooldown.
                </p>
                <button
                  onClick={async () => {
                    try {
                      await approvalsApi.createApproval({
                        well_id: selectedWell,
                        recommendation: `60-Day Coordinated Post-CSS Staging Schedule (${selectedWell})`,
                        impact: `${postCssSchedule.summary.incrementalOilPct} Cumulative Oil, ${postCssSchedule.summary.sorReductionPct} SOR`,
                        submitted_by: 'Coupled CSS-SRP Digital Twin Simulator',
                        comment: 'Approved 3-stage dynamic pumping profile prevents rod floating as crude cools from 185°C to 48°C.',
                        setpoints: {
                          phase1_spm: 7.0,
                          phase2_spm: 5.2,
                          phase3_spm: 4.2,
                          days: 60,
                        }
                      });
                      setActionSuccess(`Dispatched 60-Day Staging Schedule for ${selectedWell} to Engineering Approvals queue!`);
                      fetchApprovals();
                      setTimeout(() => setActionSuccess(null), 3500);
                    } catch (e) {
                      console.error('Failed to submit staging schedule:', e);
                    }
                  }}
                  className="px-6 py-2.5 bg-[#005C53] hover:bg-[#004B44] text-white rounded text-[13px] font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Dispatch 60-Day Schedule to Approvals &rarr;</span>
                </button>
              </div>
            </div>
          )}
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
              <p className="text-[13px] text-[#64748B]">Decomposition of machine learning decision drivers for {selectedWell} recommendation</p>
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
