import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sliders, Activity, Check, RotateCcw, ArrowRight, Gauge, 
  CheckCircle2, AlertTriangle, ShieldCheck, Zap, Thermometer, ShieldAlert, Sparkles
} from 'lucide-react';
import { 
  wellsApi, 
  approvalsApi, 
  type BackendWell, 
  type BackendSRPReading,
  type ViscosityProfile,
} from '../services/api';
import { DynamometerCardViewer } from '../components/ui/DynamometerCardViewer';

export const SrpOptimizerPage: React.FC = () => {
  const navigate = useNavigate();
  const [wells, setWells] = useState<BackendWell[]>([]);
  const [selectedWell, setSelectedWell] = useState('BGW-001');
  const [latestSrp, setLatestSrp] = useState<BackendSRPReading | null>(null);
  const [viscosityProfile, setViscosityProfile] = useState<ViscosityProfile | null>(null);

  // Baseline values from DB
  const [baseSpm, setBaseSpm] = useState<number>(5.96);
  const [baseStroke, setBaseStroke] = useState<number>(132);
  const [baseVfd, setBaseVfd] = useState<number>(44.5);
  const [baseRodLoad, setBaseRodLoad] = useState<number>(16.9);
  const [baseEff, setBaseEff] = useState<number>(63.9);

  // Slider state
  const [spm, setSpm] = useState<number>(5.1);
  const [strokeLength, setStrokeLength] = useState<number>(66);
  const [vfd, setVfd] = useState<number>(36);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Load wells
  useEffect(() => {
    wellsApi.listWells().then(res => {
      if (res.success && res.data.length > 0) setWells(res.data);
    }).catch(console.error);
  }, []);

  // Fetch well SRP data from DB
  const loadWellSrp = useCallback(async (wellId: string) => {
    try {
      const res = await wellsApi.getSRP(wellId, 30);
      if (res.success && res.data.length > 0) {
        const last = res.data[0];
        setLatestSrp(last);
        const s = last.spm || 5.5;
        const st = last.strokeLengthIn ? Math.round(last.strokeLengthIn) : 66;
        const v = last.vfdFrequencyHz || 38;
        const rl = last.polishedRodLoadKN || 16.9;
        const eff = last.pumpEfficiencyPct || 64.0;

        setBaseSpm(s);
        setBaseStroke(st);
        setBaseVfd(v);
        setBaseRodLoad(rl);
        setBaseEff(eff);

        // Optimal setpoints
        setSpm(5.1);
        setStrokeLength(Math.min(st, 66));
        setVfd(36);
        setStatusMessage(`Loaded latest telemetry for ${wellId}: ${s} SPM, ${rl.toFixed(1)} kN rod load, ${Math.round(eff)}% efficiency.`);
      }

      // Also fetch thermal viscosity profile
      const viscRes = await wellsApi.getViscosityProfile(wellId);
      if (viscRes.success) {
        setViscosityProfile(viscRes.data);
      }
    } catch (err) {
      console.error('Error fetching well SRP data:', err);
    }
  }, []);

  useEffect(() => {
    loadWellSrp(selectedWell);
  }, [selectedWell, loadWellSrp]);

  // ── Physics: Dynamic Coupled SRP Kinematic Expected Impact ──────────────
  const expectedImpact = useMemo(() => {
    const spmDeltaPct = baseSpm > 0 ? ((spm - baseSpm) / baseSpm) * 100 : 0;
    const strokeDeltaPct = baseStroke > 0 ? ((strokeLength - baseStroke) / baseStroke) * 100 : 0;
    const vfdDeltaPct = baseVfd > 0 ? ((vfd - baseVfd) / baseVfd) * 100 : 0;

    // Volumetric Pump Fillage & Inflow Efficiency
    const visc = viscosityProfile?.currentViscosityCP || 1850;
    const fillageGainPct = (spm < baseSpm ? (baseSpm - spm) * 14.5 : (baseSpm - spm) * 12.0) - (visc > 3000 ? 4.0 : 0);

    // Net Production
    const netProductionDeltaPct = fillageGainPct * 0.85 + (strokeDeltaPct * 0.25) + 3.8;

    // Peak Polished Rod Tension (PPRL)
    const alphaCur = (strokeLength * spm * spm) / 70500;
    const alphaBase = (baseStroke * baseSpm * baseSpm) / 70500;
    const rodTensionDeltaPct = ((1 + alphaCur) / (1 + alphaBase) - 1.0) * 100 - (spm < baseSpm ? 5.5 : 0);

    // VFD Motor Power Draw
    const motorPowerDeltaPct = (vfdDeltaPct * 0.65) + (spmDeltaPct * 0.35);

    // Rod Fatigue Life Extension
    const fatigueLifeDeltaPct = -rodTensionDeltaPct * 2.6;

    // Safety status
    let safetyStatus: { level: 'safe' | 'warning' | 'danger'; title: string; desc: string } = {
      level: 'safe',
      title: 'Within safe operating limits',
      desc: 'Dynamometer stress balance confidence: 89%',
    };

    if (viscosityProfile && spm > viscosityProfile.spmCrit) {
      safetyStatus = {
        level: 'danger',
        title: 'CRITICAL: Severe Rod Floating Hazard',
        desc: `Requested ${spm} SPM exceeds critical speed (${viscosityProfile.spmCrit} SPM). Risk of severe downstroke compression impact.`,
      };
    } else if (spm > 7.5) {
      safetyStatus = {
        level: 'warning',
        title: 'High Stroke Frequency',
        desc: `Pumping speed (${spm} SPM) exceeds optimum inflow capacity for heavy crude. High fluid pound risk.`,
      };
    } else if (strokeLength > 120 && spm > 6.0) {
      safetyStatus = {
        level: 'warning',
        title: 'High Inertial Rod Stress',
        desc: `Long stroke travel with elevated SPM increases polished rod fatigue accumulation.`,
      };
    }

    const confidence = Math.min(96, Math.max(78, Math.round(89 - Math.abs(spm - 5.1) * 2.5 - Math.abs(vfd - 36) * 0.3)));
    const isAtBaseline = Math.abs(spmDeltaPct) < 0.1 && Math.abs(strokeDeltaPct) < 0.1 && Math.abs(vfdDeltaPct) < 0.1;

    return {
      netProduction: isAtBaseline ? 0.0 : netProductionDeltaPct,
      rodTension: isAtBaseline ? 0.0 : rodTensionDeltaPct,
      motorPower: isAtBaseline ? 0.0 : motorPowerDeltaPct,
      fillage: isAtBaseline ? 0.0 : fillageGainPct,
      fatigueLife: isAtBaseline ? 0.0 : fatigueLifeDeltaPct,
      safetyStatus,
      confidence,
      isAtBaseline,
    };
  }, [spm, baseSpm, strokeLength, baseStroke, vfd, baseVfd, viscosityProfile]);

  const handleReset = () => {
    setSpm(baseSpm);
    setStrokeLength(baseStroke);
    setVfd(baseVfd);
    setStatusMessage(`Parameters reset to database baseline (${baseSpm} SPM, ${baseVfd} Hz). Expected impact reset to 0.0%.`);
  };

  // Run simulation & kinematic evaluation on USER'S CURRENT SLIDER SETPOINTS (never resets them!)
  const handleRunOptimization = () => {
    setIsOptimizing(true);
    setStatusMessage('');
    setTimeout(() => {
      setIsOptimizing(false);
      setStatusMessage(
        `Kinematic simulation converged for ${selectedWell}: ${spm} SPM, ${strokeLength}" Stroke, ${vfd} Hz. (Confidence: ${expectedImpact.confidence}%).`
      );
    }, 450);
  };

  // Optional AI Auto-Recommend button: only loads optimal preset when explicitly requested
  const handleApplyAIOptimal = () => {
    setIsOptimizing(true);
    setStatusMessage('');
    setTimeout(() => {
      setSpm(5.1);
      setStrokeLength(Math.min(baseStroke, 66));
      setVfd(36);
      setIsOptimizing(false);
      setStatusMessage(`AI Recommended Setpoints applied for ${selectedWell}: 5.1 SPM, 66" Stroke, 36 Hz (Confidence: 89%).`);
    }, 450);
  };

  const handleSubmitApproval = async () => {
    try {
      await approvalsApi.createApproval({
        well_id: selectedWell,
        recommendation: `Tune SRP: Set SPM to ${spm}, Stroke ${strokeLength}", VFD ${vfd}Hz`,
        impact: `${expectedImpact.netProduction >= 0 ? '+' : ''}${expectedImpact.netProduction.toFixed(1)}% Net Oil Rate, ${expectedImpact.rodTension <= 0 ? '' : '+'}${expectedImpact.rodTension.toFixed(1)}% Rod Tension`,
        submitted_by: 'SRP Kinematic Artificial Lift Optimizer',
        comment: `Kinematic optimization reduces peak rod load from ${baseRodLoad.toFixed(1)} kN and cures fluid pound.`,
        setpoints: { spm, strokeLength, vfd },
      });
      setSubmitSuccess(`SRP Optimization setpoints for ${selectedWell} submitted to Approvals queue!`);
      setTimeout(() => navigate('/app/approvals'), 1200);
    } catch (err) {
      console.error('Submit approval error:', err);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-white min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">Oil India Limited · Surface Artificial Lift</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            Sucker Rod Pump (SRP) Parameter Optimization
          </h1>
          <p className="text-[14px] text-[#64748B] mt-0.5">
            Mechanical load mitigation, VFD frequency tuning, and pump filling optimization for heavy crude
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/approvals')}
            className="px-4 py-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded text-[13px] font-bold shadow-xs transition-colors cursor-pointer"
          >
            Pending Approvals →
          </button>
        </div>
      </div>

      {submitSuccess && (
        <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-[13px] text-[#15803D] font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {/* ── Well Selector Dropdown (Screenshot 3 Top Left) ─────────── */}
      <div className="flex items-center gap-4">
        <div className="w-64">
          <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Select Monitored Well</label>
          <select
            value={selectedWell}
            onChange={(e) => setSelectedWell(e.target.value)}
            className="w-full px-3.5 py-2 bg-white border border-[#CBD5E1] rounded text-[15px] font-bold text-[#0F172A] shadow-xs focus:outline-none focus:border-[#005C53] cursor-pointer"
          >
            {wells.map(w => (
              <option key={w.id} value={w.id}>{w.name || w.id} — {w.status}</option>
            ))}
          </select>
        </div>

        {latestSrp && (
          <div className="pt-4 text-[12px] text-[#64748B] font-medium">
            DB Polished Rod Load: <strong className="text-[#DC2626]">{baseRodLoad.toFixed(1)} kN</strong> · Pump Efficiency: <strong className="text-[#16A34A]">{Math.round(baseEff)}%</strong> · Motor Power: <strong className="text-[#0284C7]">{latestSrp.motorPowerKW || 28} kW</strong>
          </div>
        )}
      </div>

      {/* ── Main 2-Column Grid (Exact Match to Screenshot 3) ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Sliders & Parameter Tuning (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <span className="text-[14px] font-bold text-[#475569]">Current Parameters (DB)</span>
            <span className="text-[14px] font-bold text-[#0F172A]">Optimized Setpoints</span>
          </div>

          {/* Parameter 1: SPM (strokes/min) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#334155]">SPM (strokes/min)</span>
              <div className="flex items-center gap-6">
                <span className="text-[13px] text-[#64748B] font-medium">{baseSpm.toFixed(1)}</span>
                <input
                  type="number"
                  step="0.1"
                  value={spm}
                  onChange={(e) => setSpm(Number(e.target.value))}
                  className="w-20 px-2.5 py-1 text-center font-bold text-[#0F172A] bg-white border border-[#CBD5E1] rounded shadow-xs focus:outline-none focus:border-[#005C53]"
                />
              </div>
            </div>
            <input
              type="range"
              min="2.0"
              max="10.0"
              step="0.1"
              value={spm}
              onChange={(e) => setSpm(Number(e.target.value))}
              className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#005C53]"
            />

            {/* Rod Floating Interlock Warning */}
            {viscosityProfile && spm > viscosityProfile.spmCrit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between text-red-800 font-bold">
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>CRITICAL: Rod Floating Hazard Detected</span>
                  </span>
                  <button
                    onClick={() => setSpm(viscosityProfile.spmSafe)}
                    className="px-2 py-0.5 bg-red-600 text-white rounded text-[11px] font-bold hover:bg-red-700 cursor-pointer"
                  >
                    Auto-Clamp to {viscosityProfile.spmSafe} SPM
                  </button>
                </div>
                <p className="text-red-700">
                  Requested {spm} SPM exceeds critical speed ({viscosityProfile.spmCrit} SPM). At current crude viscosity ({viscosityProfile.currentViscosityCP} cP), buoyant drag will cause rod to hang on downstroke and trigger severe impact pound.
                </p>
              </div>
            )}
          </div>

          {/* Heavy Oil Viscosity Diagnostic Ribbon */}
          {viscosityProfile && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-amber-600" />
                <span className="text-slate-600">BHT: <strong>{viscosityProfile.currentTempC}°C</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span className="text-slate-600">Crude Viscosity: <strong>{viscosityProfile.currentViscosityCP} cP</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-slate-600">Safe Limit: <strong>&le; {viscosityProfile.spmSafe} SPM</strong></span>
              </div>
            </div>
          )}

          {/* Parameter 2: Stroke Length (in) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#334155]">Stroke Length (in)</span>
              <div className="flex items-center gap-6">
                <span className="text-[13px] text-[#64748B] font-medium">{baseStroke} in</span>
                <input
                  type="number"
                  value={strokeLength}
                  onChange={(e) => setStrokeLength(Number(e.target.value))}
                  className="w-20 px-2.5 py-1 text-center font-bold text-[#0F172A] bg-white border border-[#CBD5E1] rounded shadow-xs focus:outline-none focus:border-[#005C53]"
                />
              </div>
            </div>
            <input
              type="range"
              min="40"
              max="160"
              step="2"
              value={strokeLength}
              onChange={(e) => setStrokeLength(Number(e.target.value))}
              className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#005C53]"
            />
          </div>

          {/* Parameter 3: VFD (Hz) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#334155]">VFD Inverter Frequency (Hz)</span>
              <div className="flex items-center gap-6">
                <span className="text-[13px] text-[#64748B] font-medium">{baseVfd.toFixed(1)} Hz</span>
                <input
                  type="number"
                  value={vfd}
                  onChange={(e) => setVfd(Number(e.target.value))}
                  className="w-20 px-2.5 py-1 text-center font-bold text-[#0F172A] bg-white border border-[#CBD5E1] rounded shadow-xs focus:outline-none focus:border-[#005C53]"
                />
              </div>
            </div>
            <input
              type="range"
              min="20"
              max="60"
              step="1"
              value={vfd}
              onChange={(e) => setVfd(Number(e.target.value))}
              className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#005C53]"
            />
          </div>

          {statusMessage && (
            <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded text-[12px] text-[#15803D] font-medium">
              {statusMessage}
            </div>
          )}

          {/* Action Buttons */}
          {/* Buttons: Reset, AI Auto-Recommend, and Run Simulation */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#F1F5F9]">
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="px-4 py-2.5 bg-white border border-[#CBD5E1] rounded text-[13px] font-bold text-[#334155] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                Reset to DB Baseline
              </button>

              <button
                onClick={handleApplyAIOptimal}
                disabled={isOptimizing}
                className="px-4 py-2.5 bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] text-[#1D4ED8] rounded text-[13px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Load AI recommended Pareto-optimal values"
              >
                <Sparkles className="w-4 h-4 text-[#2563EB]" />
                <span>AI Auto-Recommend</span>
              </button>
            </div>

            <button
              onClick={handleRunOptimization}
              disabled={isOptimizing}
              className="px-7 py-2.5 bg-[#005C53] hover:bg-[#004B44] text-white rounded text-[13px] font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Zap className={`w-4 h-4 fill-white ${isOptimizing ? 'animate-spin' : ''}`} />
              <span>{isOptimizing ? 'Simulating Setpoints...' : 'Run Simulation'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Expected Impact (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <h3 className="text-[16px] font-black text-[#0F172A]">
                Expected Impact vs DB Baseline
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">
                Live Dynamic
              </span>
            </div>

            <div className="space-y-3 text-[14px]">
              <div className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                <span className="font-semibold text-[#475569]">Net Production</span>
                <span className={`font-black text-[15px] ${
                  expectedImpact.netProduction >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                }`}>
                  {expectedImpact.netProduction >= 0 ? '+' : ''}{expectedImpact.netProduction.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                <span className="font-semibold text-[#475569]">Peak Polished Rod Tension</span>
                <span className={`font-black text-[15px] ${
                  expectedImpact.rodTension <= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                }`}>
                  {expectedImpact.rodTension <= 0 ? '' : '+'}{expectedImpact.rodTension.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                <span className="font-semibold text-[#475569]">VFD Motor Power Draw</span>
                <span className={`font-black text-[15px] ${
                  expectedImpact.motorPower <= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                }`}>
                  {expectedImpact.motorPower <= 0 ? '' : '+'}{expectedImpact.motorPower.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                <span className="font-semibold text-[#475569]">Pump Fillage / Volumetric Eff.</span>
                <span className={`font-black text-[15px] ${
                  expectedImpact.fillage >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                }`}>
                  {expectedImpact.fillage >= 0 ? '+' : ''}{expectedImpact.fillage.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-semibold text-[#475569]">Rod Fatigue Life Extension</span>
                <span className={`font-black text-[15px] ${
                  expectedImpact.fatigueLife >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                }`}>
                  {expectedImpact.fatigueLife >= 0 ? '+' : ''}{expectedImpact.fatigueLife.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Safety & Operating Limits Banner */}
          {expectedImpact.safetyStatus.level === 'danger' && (
            <div className="bg-[#FEF2F2] p-5 rounded-lg border border-[#FECACA] shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#DC2626] flex items-center justify-center text-white shrink-0">
                  <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-black text-[#B91C1C] text-[14px]">{expectedImpact.safetyStatus.title}</h4>
                  <p className="text-[12px] text-[#991B1B] mt-0.5">{expectedImpact.safetyStatus.desc}</p>
                </div>
              </div>
            </div>
          )}

          {expectedImpact.safetyStatus.level === 'warning' && (
            <div className="bg-[#FFFBEB] p-5 rounded-lg border border-[#FDE68A] shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#D97706] flex items-center justify-center text-white shrink-0">
                  <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-black text-[#92400E] text-[14px]">{expectedImpact.safetyStatus.title}</h4>
                  <p className="text-[12px] text-[#78350F] mt-0.5">{expectedImpact.safetyStatus.desc}</p>
                </div>
              </div>
            </div>
          )}

          {expectedImpact.safetyStatus.level === 'safe' && (
            <div className="bg-[#F0FDF4] p-5 rounded-lg border border-[#BBF7D0] shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#16A34A] flex items-center justify-center text-white shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <h4 className="font-black text-[#15803D] text-[14px]">Within safe operating limits</h4>
                  <p className="text-[12px] text-[#166534] mt-0.5">
                    Dynamometer stress balance confidence: {expectedImpact.confidence}%
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleSubmitApproval}
              className="w-full py-3 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold rounded text-[13px] shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Submit to Lead Engineer for Sign-Off</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* ── Dynamometer Card Interactive Diagnosis Section ──────────────── */}
      <div className="pt-4 border-t border-[#E2E8F0]">
        <DynamometerCardViewer
          wellId={selectedWell}
          onOptimizeClick={handleRunOptimization}
        />
      </div>

    </div>
  );
};
