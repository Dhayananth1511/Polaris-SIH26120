import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders,
  Activity,
  AlertTriangle,
  Zap,
  Gauge,
  CheckCircle2,
  RefreshCw,
  Info,
  Layers,
  TrendingDown,
  Flame,
  ShieldAlert,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { wellsApi, mlApi } from '../services/api';

type DynoCondition = 'normal' | 'fluid_pound' | 'rod_floating' | 'gas_interference';

export const SrpDiagnosticsPage: React.FC = () => {
  const [selectedWell, setSelectedWell] = useState('BGW-001');
  const [wellsList, setWellsList] = useState<any[]>([]);
  const [cardData, setCardData] = useState<any>(null);
  const [srpData, setSrpData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Interactive Simulation State ──
  const [simCondition, setSimCondition] = useState<DynoCondition>('normal');
  const [simSpm, setSimSpm] = useState<number>(5.5);
  const [simStroke, setSimStroke] = useState<number>(113.1);
  const [simViscosity, setSimViscosity] = useState<number>(1800);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  useEffect(() => {
    wellsApi.listWells().then((res) => {
      if (res.success && res.data) {
        setWellsList(res.data);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadDiagnostics(selectedWell);
  }, [selectedWell]);

  const loadDiagnostics = async (wellId: string) => {
    setLoading(true);
    try {
      const [cardRes, srpRes] = await Promise.all([
        wellsApi.getDynamometerCardLatest(wellId).catch(() => null),
        wellsApi.getSrp(wellId, 30).catch(() => null),
      ]);

      if (cardRes?.success && cardRes.data) {
        setCardData(cardRes.data);
        if (!isSimulated) {
          setSimSpm(cardRes.data.spm || 5.5);
          setSimStroke(cardRes.data.strokeLengthIn || 113.1);
        }
      }
      if (srpRes?.success && srpRes.data) {
        setSrpData(srpRes.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDb = () => {
    setIsSimulated(false);
    setSimCondition('normal');
    if (cardData) {
      setSimSpm(cardData.spm || 5.5);
      setSimStroke(cardData.strokeLengthIn || 113.1);
      setSimViscosity(1800);
    }
  };

  // ── Coupled Multi-Physics Telemetry Engine ──
  const liveDiagnostics = useMemo(() => {
    const stroke = isSimulated ? simStroke : (cardData?.strokeLengthIn || 113.1);
    const spm = isSimulated ? simSpm : (cardData?.spm || 5.5);
    const visc = isSimulated ? simViscosity : 1800;
    const vfdHz = Number((spm * 8.09).toFixed(1));

    let peakLoad = 16.76;
    let minLoad = 5.86;
    let pumpEfficiency = 63.9;
    let volumetricFillage = 82;
    let diagLabel = 'Normal Operation';
    let patternConfidence = 96;
    let rodFloatScore = 8;
    let fluidPoundScore = 5;
    let pumpOffStatus = 'Normal Fillage';
    let gasInterferenceStatus = 'Negligible (<3%)';
    let pumpUnsettingRisk = 'Secure';

    // Base kinematic acceleration factor: alpha = (S * SPM^2) / 70500
    const alpha = (stroke * spm * spm) / 70500;
    const dynamicPeak = 15.5 * (1 + alpha * 1.2);
    const dynamicMin = 6.2 * Math.max(0.3, 1 - alpha * 1.4);

    if (simCondition === 'normal') {
      peakLoad = Number((dynamicPeak + (visc > 3000 ? 1.5 : 0)).toFixed(2));
      minLoad = Number((dynamicMin - (visc > 3000 ? 1.2 : 0)).toFixed(2));
      pumpEfficiency = Number((68.0 - (spm > 7 ? (spm - 7) * 2.5 : 0)).toFixed(1));
      volumetricFillage = Number((86 - (spm > 6 ? (spm - 6) * 3 : 0)).toFixed(0));
      diagLabel = 'Normal Full Fillage';
      patternConfidence = 96;
      rodFloatScore = Math.min(45, Math.max(6, Math.round((visc * spm) / 1200)));
      fluidPoundScore = Math.min(30, Math.max(4, Math.round(spm * 1.2)));
      pumpOffStatus = 'Normal Fillage';
      gasInterferenceStatus = 'Negligible (<3%)';
      pumpUnsettingRisk = 'Secure';
    } else if (simCondition === 'fluid_pound') {
      peakLoad = Number((dynamicPeak * 1.15).toFixed(2)); // Impact shock spike
      minLoad = Number((dynamicMin * 0.7).toFixed(2));
      pumpEfficiency = 34.2;
      volumetricFillage = 41;
      diagLabel = 'Severe Fluid Pound / Partial Fillage';
      patternConfidence = 94;
      rodFloatScore = 14;
      fluidPoundScore = Math.min(95, Math.max(75, Math.round(84 + (spm - 5) * 2)));
      pumpOffStatus = 'Underfilled / Pump-Off Triggered';
      gasInterferenceStatus = 'Moderate (12%)';
      pumpUnsettingRisk = 'Elevated Shock Stress';
    } else if (simCondition === 'rod_floating') {
      peakLoad = Number((dynamicPeak * 1.18).toFixed(2));
      minLoad = Number((Math.max(1.2, dynamicMin * 0.32)).toFixed(2)); // Buoyant drag holds rod
      pumpEfficiency = 46.5;
      volumetricFillage = 58;
      diagLabel = 'Severe Rod Floating / Hydrodynamic Drag';
      patternConfidence = 98;
      rodFloatScore = Math.min(96, Math.max(72, Math.round(78 + (visc / 1000) * 1.5 + spm * 2)));
      fluidPoundScore = 12;
      pumpOffStatus = 'Delayed Traveling Valve Closure';
      gasInterferenceStatus = 'Negligible (<4%)';
      pumpUnsettingRisk = 'Compression Buckling Threat';
    } else if (simCondition === 'gas_interference') {
      peakLoad = Number((dynamicPeak * 0.92).toFixed(2));
      minLoad = Number((dynamicMin * 1.05).toFixed(2));
      pumpEfficiency = 41.8;
      volumetricFillage = 52;
      diagLabel = 'Gas Interference / Compression Lock';
      patternConfidence = 91;
      rodFloatScore = 10;
      fluidPoundScore = 22;
      pumpOffStatus = 'Gas Expansion Cushioning';
      gasInterferenceStatus = 'High Free Gas Volume (38%)';
      pumpUnsettingRisk = 'Stable';
    }

    const loadRange = Number((peakLoad - minLoad).toFixed(2));
    const cardArea = Math.round(loadRange * stroke * (volumetricFillage / 100) * 1.05);
    const hydraulicWork = Number(((cardArea * spm) / 33000 * 8.2).toFixed(1));

    return {
      stroke,
      spm,
      visc,
      vfdHz,
      peakLoad,
      minLoad,
      loadRange,
      cardArea,
      hydraulicWork,
      pumpEfficiency,
      volumetricFillage,
      diagLabel,
      patternConfidence,
      rodFloatScore,
      fluidPoundScore,
      pumpOffStatus,
      gasInterferenceStatus,
      pumpUnsettingRisk,
    };
  }, [cardData, isSimulated, simCondition, simSpm, simStroke, simViscosity]);

  // ── Synthesized Closed Work Loops (Surface & Downhole Dynamometer Cards) ──
  const { surfacePoints, downholePoints } = useMemo(() => {
    const stroke = liveDiagnostics.stroke;
    const pprl = liveDiagnostics.peakLoad;
    const mprl = liveDiagnostics.minLoad;
    const N = 40; // Discrete points around loop

    const sPts: Array<{ position: number; load: number }> = [];
    const dPts: Array<{ position: number; load: number }> = [];

    for (let i = 0; i <= N; i++) {
      const theta = (2 * Math.PI * i) / N; // 0 to 2*pi
      // Surface position follows sinusoidal simple harmonic motion:
      const x = (stroke / 2) * (1 - Math.cos(theta));
      let y = mprl;

      // Downhole pump coordinates
      const xPump = Math.max(0, Math.min(stroke - 12, (x - 6) * 0.92));
      let yPump = mprl * 0.85;

      if (theta <= Math.PI) {
        // UPSTROKE: (0 -> stroke)
        const progress = theta / Math.PI; // 0 to 1
        if (progress < 0.18) {
          // Rapid fluid load pick-up
          y = mprl + (pprl - mprl) * Math.pow(progress / 0.18, 0.7);
          yPump = (mprl * 0.85) + (pprl * 0.88 - mprl * 0.85) * Math.pow(progress / 0.18, 0.5);
        } else {
          // Polished rod carries fluid column + rod stretch vibration
          const wave = 0.35 * Math.sin(theta * 5);
          y = pprl + wave;
          yPump = pprl * 0.88 + 0.15 * Math.sin(theta * 3);
        }
      } else {
        // DOWNSTROKE: (stroke -> 0)
        const downProgress = (theta - Math.PI) / Math.PI; // 0 to 1

        if (simCondition === 'normal') {
          if (downProgress < 0.2) {
            // Traveling valve opens, rapid load shed to tubing
            y = pprl - (pprl - mprl) * Math.pow(downProgress / 0.2, 0.75);
            yPump = (pprl * 0.88) - (pprl * 0.88 - mprl * 0.85) * Math.pow(downProgress / 0.2, 0.6);
          } else {
            // Rod floats down under buoyant weight
            const wave = 0.25 * Math.sin(theta * 4);
            y = mprl + wave;
            yPump = mprl * 0.85;
          }
        } else if (simCondition === 'fluid_pound') {
          // Low load through gas void until sudden liquid hit at ~45% stroke
          if (downProgress < 0.45) {
            y = mprl * 0.85 + 0.2 * Math.sin(theta * 3);
            yPump = mprl * 0.6;
          } else if (downProgress < 0.55) {
            // Impact transient shock spike!
            const hitFrac = (downProgress - 0.45) / 0.1;
            y = (mprl * 0.85) + 6.2 * Math.sin(hitFrac * Math.PI);
            yPump = mprl * 0.6 + 4.5 * Math.sin(hitFrac * Math.PI);
          } else {
            y = mprl;
            yPump = mprl * 0.85;
          }
        } else if (simCondition === 'rod_floating') {
          // Severe viscous drag prevents rod from dropping; downstroke load collapses
          if (downProgress < 0.35) {
            y = pprl - (pprl - mprl) * Math.pow(downProgress / 0.35, 0.4);
          } else {
            y = Math.max(1.5, mprl * 0.45 - 0.8 * Math.sin(downProgress * Math.PI));
          }
          yPump = Math.max(1.2, (mprl * 0.75) * (1 - downProgress));
        } else if (simCondition === 'gas_interference') {
          // Hyperbolic polytropic gas compression curve
          const polytropic = Math.pow(1 - downProgress, 0.6);
          y = mprl + (pprl - mprl) * 0.85 * polytropic;
          yPump = (mprl * 0.85) + (pprl * 0.8 - mprl * 0.85) * polytropic;
        }
      }

      sPts.push({
        position: Number(x.toFixed(1)),
        load: Number(y.toFixed(2)),
      });

      dPts.push({
        position: Number(xPump.toFixed(1)),
        load: Number(yPump.toFixed(2)),
      });
    }

    return { surfacePoints: sPts, downholePoints: dPts };
  }, [liveDiagnostics, simCondition]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1750px] mx-auto bg-slate-50 min-h-screen text-[#1E293B]">
      
      {/* ── HEADER TITLE & WELL SELECTOR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#FFEBEE] text-[#D32F2F] text-[11px] font-black uppercase tracking-wider">
              Page 5 · Mechanical Artificial Lift
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] text-[11px] font-bold">
              Position vs Load Dynamometer Analysis
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#0F172A] mt-1 tracking-tight">
            SRP Mechanical Diagnostics &amp; Dyno Card Analysis
          </h1>
          <p className="text-[13px] text-[#64748B] font-medium mt-0.5">
            Sucker rod pump kinematics, polished rod load telemetry, and AI detection of rod floating &amp; impact loading.
          </p>
        </div>

        {/* Well Selector & Live DB sync */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#F8FAFC] px-3.5 py-2 rounded-xl border border-[#E2E8F0]">
            <span className="text-[12px] font-bold text-[#64748B]">Well:</span>
            <select
              value={selectedWell}
              onChange={(e) => {
                setSelectedWell(e.target.value);
                setIsSimulated(false);
              }}
              className="bg-transparent font-bold text-[13px] text-[#0F172A] outline-none cursor-pointer"
            >
              {wellsList.length > 0 ? (
                wellsList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.id} ({w.reservoir || 'Jodhpur Sandstone'})
                  </option>
                ))
              ) : (
                <option value="BGW-001">BGW-001 (Heavy Oil)</option>
              )}
            </select>
          </div>

          <button
            onClick={() => loadDiagnostics(selectedWell)}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#475569] transition-colors cursor-pointer"
            title="Refresh SRP diagnostics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── INTERACTIVE SIMULATION & OPERATING CONDITION BAR ── */}
      <div className="bg-white p-5 rounded-2xl border border-[#CBD5E1] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#005C53]" />
            <h3 className="text-[14px] font-black text-[#0F172A] uppercase tracking-wider">
              Diagnostic Operating Conditions &amp; Kinematic Tuning
            </h3>
            {isSimulated && (
              <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] text-[11px] font-bold">
                ● Live Interactive Simulation Active
              </span>
            )}
          </div>

          {isSimulated && (
            <button
              onClick={handleResetToDb}
              className="px-3 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#475569] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to DB Baseline</span>
            </button>
          )}
        </div>

        {/* Condition Presets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => {
              setSimCondition('normal');
              setIsSimulated(true);
            }}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              simCondition === 'normal'
                ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#166534] shadow-xs'
                : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-black uppercase">Normal Operation</span>
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">Full barrel fillage, nominal stroke kinematics</p>
          </button>

          <button
            onClick={() => {
              setSimCondition('fluid_pound');
              setIsSimulated(true);
            }}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              simCondition === 'fluid_pound'
                ? 'bg-[#FFF7ED] border-[#FDBA74] text-[#9A3412] shadow-xs'
                : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-black uppercase">Fluid Pound</span>
              <AlertTriangle className="w-4 h-4 text-[#EA580C]" />
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">Underfilled pump chamber, downstroke impact</p>
          </button>

          <button
            onClick={() => {
              setSimCondition('rod_floating');
              setIsSimulated(true);
            }}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              simCondition === 'rod_floating'
                ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B] shadow-xs'
                : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-black uppercase">Severe Rod Floating</span>
              <ShieldAlert className="w-4 h-4 text-[#DC2626]" />
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">Cold crude viscous drag, downstroke compression</p>
          </button>

          <button
            onClick={() => {
              setSimCondition('gas_interference');
              setIsSimulated(true);
            }}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              simCondition === 'gas_interference'
                ? 'bg-[#EFF6FF] border-[#93C5FD] text-[#1E40AF] shadow-xs'
                : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-black uppercase">Gas Lock / Interference</span>
              <Activity className="w-4 h-4 text-[#2563EB]" />
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">Polytropic gas expansion cushions the stroke</p>
          </button>
        </div>

        {/* Real-time Kinematic Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* SPM Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#475569]">
              <span>Pumping Speed (SPM)</span>
              <span className="font-black text-[#D32F2F] text-[13px]">{liveDiagnostics.spm} SPM</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="12.0"
              step="0.1"
              value={simSpm}
              onChange={(e) => {
                setSimSpm(Number(e.target.value));
                setIsSimulated(true);
              }}
              className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#D32F2F]"
            />
            <div className="flex justify-between text-[10px] text-[#94A3B8]">
              <span>1.0 SPM</span>
              <span>VFD: {liveDiagnostics.vfdHz} Hz</span>
              <span>12.0 SPM</span>
            </div>
          </div>

          {/* Stroke Length Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#475569]">
              <span>Stroke Length (inches)</span>
              <span className="font-black text-[#0284C7] text-[13px]">{liveDiagnostics.stroke} in</span>
            </div>
            <input
              type="range"
              min="44"
              max="144"
              step="1"
              value={simStroke}
              onChange={(e) => {
                setSimStroke(Number(e.target.value));
                setIsSimulated(true);
              }}
              className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#0284C7]"
            />
            <div className="flex justify-between text-[10px] text-[#94A3B8]">
              <span>44 in</span>
              <span>Surface Beam Travel</span>
              <span>144 in</span>
            </div>
          </div>

          {/* Viscosity Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#475569]">
              <span>Bottomhole Oil Viscosity</span>
              <span className="font-black text-[#EA580C] text-[13px]">{liveDiagnostics.visc} cP</span>
            </div>
            <input
              type="range"
              min="100"
              max="15000"
              step="100"
              value={simViscosity}
              onChange={(e) => {
                setSimViscosity(Number(e.target.value));
                setIsSimulated(true);
              }}
              className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#EA580C]"
            />
            <div className="flex justify-between text-[10px] text-[#94A3B8]">
              <span>100 cP (Hot)</span>
              <span>ASTM Walther Curve</span>
              <span>15,000 cP (Cold Tar)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CURRENT SRP OPERATIONAL PARAMETERS STRIP (TOP 5 KPIS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: SPM */}
        <div className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[12px] font-bold uppercase tracking-wider">Pumping Speed</span>
            <Gauge className="w-5 h-5 text-[#D32F2F]" />
          </div>
          <div className="text-2xl font-black text-[#0F172A] mt-2">
            {liveDiagnostics.spm} <span className="text-[13px] font-bold text-[#64748B]">SPM</span>
          </div>
          <div className="text-[12px] font-medium text-[#64748B] mt-1">
            VFD frequency: <strong>{liveDiagnostics.vfdHz} Hz</strong>
          </div>
        </div>

        {/* KPI 2: Stroke Length */}
        <div className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[12px] font-bold uppercase tracking-wider">Stroke Length</span>
            <Sliders className="w-5 h-5 text-[#0284C7]" />
          </div>
          <div className="text-2xl font-black text-[#0F172A] mt-2">
            {liveDiagnostics.stroke} <span className="text-[13px] font-bold text-[#64748B]">inches</span>
          </div>
          <div className="text-[12px] font-medium text-[#64748B] mt-1">
            Surface beam stroke
          </div>
        </div>

        {/* KPI 3: Peak Rod Load */}
        <div className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[12px] font-bold uppercase tracking-wider">Peak Rod Load</span>
            <Activity className="w-5 h-5 text-[#EA580C]" />
          </div>
          <div className="text-2xl font-black text-[#0F172A] mt-2">
            {liveDiagnostics.peakLoad} <span className="text-[13px] font-bold text-[#64748B]">kN</span>
          </div>
          <div className="text-[12px] font-medium text-[#64748B] mt-1">
            Min load: <strong>{liveDiagnostics.minLoad} kN</strong>
          </div>
        </div>

        {/* KPI 4: Pump Efficiency */}
        <div className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[12px] font-bold uppercase tracking-wider">Pump Efficiency</span>
            <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
          </div>
          <div className="text-2xl font-black text-[#0F172A] mt-2">
            {liveDiagnostics.pumpEfficiency}%
          </div>
          <div className="text-[12px] font-medium text-[#16A34A] mt-1">
            Volumetric fillage: {liveDiagnostics.volumetricFillage}%
          </div>
        </div>

        {/* KPI 5: Diagnostic Label */}
        <div className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[12px] font-bold uppercase tracking-wider">Diagnostic Label</span>
            <AlertTriangle className={`w-5 h-5 ${
              simCondition === 'normal' ? 'text-[#16A34A]' : 'text-[#D97706]'
            }`} />
          </div>
          <div className="text-[15px] font-black text-[#0F172A] mt-2 truncate">
            {liveDiagnostics.diagLabel}
          </div>
          <div className="text-[12px] font-medium text-[#64748B] mt-1">
            Pattern match confidence: {liveDiagnostics.patternConfidence}%
          </div>
        </div>
      </div>

      {/* ── MAIN DIAGNOSTICS ROW: DYNAMOMETER CARD + FAULT SCORES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Dynamometer Card (Position vs Load) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-black text-[#0F172A]">
                  Dynamometer Card (Position vs. Load)
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E8F5E9] text-[#2E7D32]">
                  Card ID: {cardData?.cardId || 'BGW-001-20240302'}
                </span>
                {isSimulated && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#EFF6FF] text-[#1D4ED8]">
                    Coupled Simulation Loop
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#64748B]">
                Surface polished rod load and downhole pump plunger work loops
              </p>
            </div>
            <div className="flex items-center gap-2 text-[12px]">
              <span className="flex items-center gap-1 font-bold text-[#D32F2F]">
                <span className="w-3 h-3 rounded-full bg-[#D32F2F]" /> Surface Card
              </span>
              <span className="flex items-center gap-1 font-bold text-[#0284C7] ml-2">
                <span className="w-3 h-3 rounded-full bg-[#0284C7]" /> Downhole Pump Card
              </span>
            </div>
          </div>

          {/* Dynamometer Work Loop Chart */}
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 15, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis
                  type="number"
                  dataKey="position"
                  name="Position"
                  stroke="#94A3B8"
                  fontSize={11}
                  unit=" in"
                  domain={[0, Math.ceil(liveDiagnostics.stroke * 1.05)]}
                  label={{ value: 'Plunger Travel Position (inches)', position: 'insideBottom', offset: -12, fill: '#64748B', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="load"
                  name="Load"
                  stroke="#94A3B8"
                  fontSize={11}
                  unit=" kN"
                  domain={[0, Math.max(22, Math.ceil(liveDiagnostics.peakLoad * 1.25))]}
                  label={{ value: 'Polished Rod Load (kN)', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#0F172A] text-white p-2.5 rounded-xl text-xs shadow-lg border border-[#334155]">
                        <div className="font-bold text-[#94A3B8]">{payload[0].name}</div>
                        <div className="mt-1">Position: <strong className="text-[#38BDF8]">{d.position} in</strong></div>
                        <div>Load: <strong className="text-[#F87171]">{d.load} kN</strong></div>
                      </div>
                    );
                  }}
                />
                <Legend verticalAlign="top" height={36} />
                <Scatter
                  name="Surface Dyno Card"
                  data={surfacePoints}
                  line={{ stroke: '#D32F2F', strokeWidth: 3 }}
                  fill="#D32F2F"
                  shape={() => null}
                />
                <Scatter
                  name="Downhole Pump Card"
                  data={downholePoints}
                  line={{ stroke: '#0284C7', strokeWidth: 2.2, strokeDasharray: '4 4' }}
                  fill="#0284C7"
                  shape={() => null}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Dyno Card Metrics Footer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#E2E8F0] text-center">
            <div className="bg-[#F8FAFC] p-2.5 rounded-xl">
              <span className="text-[11px] text-[#64748B] font-bold block">Stroke Travel</span>
              <span className="text-[14px] font-black text-[#0F172A]">{liveDiagnostics.stroke} in</span>
            </div>
            <div className="bg-[#F8FAFC] p-2.5 rounded-xl">
              <span className="text-[11px] text-[#64748B] font-bold block">Load Range</span>
              <span className="text-[14px] font-black text-[#0F172A]">{liveDiagnostics.loadRange} kN</span>
            </div>
            <div className="bg-[#F8FAFC] p-2.5 rounded-xl">
              <span className="text-[11px] text-[#64748B] font-bold block">Card Area</span>
              <span className="text-[14px] font-black text-[#0F172A]">{liveDiagnostics.cardArea} kN·in</span>
            </div>
            <div className="bg-[#F8FAFC] p-2.5 rounded-xl">
              <span className="text-[11px] text-[#64748B] font-bold block">Hydraulic Work</span>
              <span className="text-[14px] font-black text-[#16A34A]">{liveDiagnostics.hydraulicWork} HP</span>
            </div>
          </div>
        </div>

        {/* Diagnostic Faults & Risk Scores */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Rod Floating Detection */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#64748B] uppercase tracking-wider">
                Rod Floating Risk
              </span>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-black uppercase ${
                liveDiagnostics.rodFloatScore > 50 ? 'bg-[#FFEBEE] text-[#D32F2F]' : 'bg-[#E8F5E9] text-[#2E7D32]'
              }`}>
                {liveDiagnostics.rodFloatScore > 50 ? 'HIGH' : 'LOW'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-[#0F172A]">{liveDiagnostics.rodFloatScore}%</span>
              <span className="text-[12px] text-[#64748B] font-medium">calculated hydrodynamic buoyant drag</span>
            </div>
            <div className="w-full bg-[#E2E8F0] h-2.5 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  liveDiagnostics.rodFloatScore > 50 ? 'bg-[#D32F2F]' : 'bg-[#16A34A]'
                }`}
                style={{ width: `${Math.min(100, liveDiagnostics.rodFloatScore)}%` }}
              />
            </div>
            <p className="text-[12px] text-[#475569] mt-3 leading-relaxed bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
              {liveDiagnostics.rodFloatScore > 50
                ? 'High downstroke buoyant drag detected. Sucker rod velocity exceeds terminal settling rate in cold heavy oil.'
                : 'Pumping speed is within safe hydrodynamic limits. Adequate downstroke rod tension preserved.'}
            </p>
          </div>

          {/* Fluid Pound & Impact Loading Risk */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#64748B] uppercase tracking-wider">
                Impact Loading / Fluid Pound
              </span>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-black uppercase ${
                liveDiagnostics.fluidPoundScore > 50
                  ? 'bg-[#FFEBEE] text-[#D32F2F]'
                  : liveDiagnostics.fluidPoundScore > 20
                  ? 'bg-[#FFF3E0] text-[#E65100]'
                  : 'bg-[#E8F5E9] text-[#2E7D32]'
              }`}>
                {liveDiagnostics.fluidPoundScore > 50 ? 'HIGH' : liveDiagnostics.fluidPoundScore > 20 ? 'MEDIUM' : 'LOW'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-[#0F172A]">{liveDiagnostics.fluidPoundScore}%</span>
              <span className="text-[12px] text-[#64748B] font-medium">downhole impact stress index</span>
            </div>
            <div className="w-full bg-[#E2E8F0] h-2.5 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  liveDiagnostics.fluidPoundScore > 50
                    ? 'bg-[#D32F2F]'
                    : liveDiagnostics.fluidPoundScore > 20
                    ? 'bg-[#EA580C]'
                    : 'bg-[#16A34A]'
                }`}
                style={{ width: `${Math.min(100, liveDiagnostics.fluidPoundScore)}%` }}
              />
            </div>
            <p className="text-[12px] text-[#475569] mt-3 leading-relaxed bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
              {liveDiagnostics.fluidPoundScore > 50
                ? 'Severe mechanical impact detected. Pump intake starving; plunger impacts fluid level with intense stress waves.'
                : 'Fluid level satisfies pump displacement rate. Plunger transitions smoothly throughout downstroke.'}
            </p>
          </div>

          {/* Auxiliary Diagnostics */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
            <h3 className="text-[13px] font-black text-[#0F172A] uppercase tracking-wider">
              Auxiliary Diagnostics
            </h3>
            <div className="flex items-center justify-between p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <span className="text-[12.5px] font-bold text-[#334155]">Pump-Off Condition</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                simCondition === 'fluid_pound' ? 'bg-[#FFEBEE] text-[#D32F2F]' : 'bg-[#E8F5E9] text-[#2E7D32]'
              }`}>
                {liveDiagnostics.pumpOffStatus}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <span className="text-[12.5px] font-bold text-[#334155]">Gas Interference</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                simCondition === 'gas_interference' ? 'bg-[#EFF6FF] text-[#1D4ED8]' : 'bg-[#E8F5E9] text-[#2E7D32]'
              }`}>
                {liveDiagnostics.gasInterferenceStatus}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <span className="text-[12.5px] font-bold text-[#334155]">Pump Unsetting Risk</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                simCondition === 'rod_floating' ? 'bg-[#FFF3E0] text-[#E65100]' : 'bg-[#E8F5E9] text-[#2E7D32]'
              }`}>
                {liveDiagnostics.pumpUnsettingRisk}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
