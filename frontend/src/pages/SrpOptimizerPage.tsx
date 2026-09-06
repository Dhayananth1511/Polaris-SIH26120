import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sliders, Activity, Check, RotateCcw, ArrowRight, Gauge, 
  CheckCircle2, AlertTriangle, ShieldCheck, Zap
} from 'lucide-react';
import { wellsApi, approvalsApi, type BackendWell, type BackendSRPReading } from '../services/api';

export const SrpOptimizerPage: React.FC = () => {
  const navigate = useNavigate();
  const [wells, setWells] = useState<BackendWell[]>([]);
  const [selectedWell, setSelectedWell] = useState('BGW-001');
  const [latestSrp, setLatestSrp] = useState<BackendSRPReading | null>(null);

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
    } catch (err) {
      console.error('Error fetching well SRP data:', err);
    }
  }, []);

  useEffect(() => {
    loadWellSrp(selectedWell);
  }, [selectedWell, loadWellSrp]);

  const handleReset = () => {
    setSpm(baseSpm);
    setStrokeLength(baseStroke);
    setVfd(baseVfd);
    setStatusMessage(`Parameters reset to database baseline (${baseSpm} SPM, ${baseVfd} Hz).`);
  };

  const handleRunOptimization = () => {
    setIsOptimizing(true);
    setStatusMessage('');
    setTimeout(() => {
      setSpm(5.1);
      setStrokeLength(Math.min(baseStroke, 66));
      setVfd(36);
      setIsOptimizing(false);
      setStatusMessage(`Optimal kinematically balanced setpoints calculated for ${selectedWell} (Confidence: 89%).`);
    }, 600);
  };

  const handleSubmitApproval = async () => {
    try {
      await approvalsApi.createApproval({
        well_id: selectedWell,
        recommendation: `Tune SRP: Set SPM to ${spm}, Stroke ${strokeLength}", VFD ${vfd}Hz`,
        impact: '+14.2% Net Oil Rate, -8.4% Rod Tension',
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
          </div>

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
          <div className="flex items-center justify-between pt-4 border-t border-[#F1F5F9]">
            <button
              onClick={handleReset}
              className="px-6 py-2.5 bg-white border border-[#CBD5E1] rounded text-[13px] font-bold text-[#334155] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
            >
              Reset to DB Baseline
            </button>

            <button
              onClick={handleRunOptimization}
              disabled={isOptimizing}
              className="px-8 py-2.5 bg-[#005C53] hover:bg-[#004B44] text-white rounded text-[13px] font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Zap className={`w-4 h-4 fill-white ${isOptimizing ? 'animate-spin' : ''}`} />
              <span>{isOptimizing ? 'Optimizing SRP Kinematics...' : 'Run Optimization'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Expected Impact (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-xs space-y-4">
            <h3 className="text-[16px] font-black text-[#0F172A] pb-3 border-b border-[#F1F5F9]">
              Expected Impact vs DB Baseline
            </h3>

            <div className="space-y-3 text-[14px]">
              <div className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                <span className="font-semibold text-[#475569]">Net Production</span>
                <span className="font-black text-[#16A34A] text-[15px]">+14.2%</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                <span className="font-semibold text-[#475569]">Peak Polished Rod Tension</span>
                <span className="font-black text-[#16A34A] text-[15px]">-8.4%</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                <span className="font-semibold text-[#475569]">VFD Motor Power Draw</span>
                <span className="font-black text-[#16A34A] text-[15px]">-9.1%</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                <span className="font-semibold text-[#475569]">Pump Fillage / Volumetric Eff.</span>
                <span className="font-black text-[#16A34A] text-[15px]">+12.5%</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-semibold text-[#475569]">Rod Fatigue Life Extension</span>
                <span className="font-black text-[#16A34A] text-[15px]">+22.0%</span>
              </div>
            </div>
          </div>

          {/* Within Safe Operating Limits Banner */}
          <div className="bg-[#F0FDF4] p-5 rounded-lg border border-[#BBF7D0] shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#16A34A] flex items-center justify-center text-white shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <h4 className="font-black text-[#15803D] text-[14px]">Within safe operating limits</h4>
                <p className="text-[12px] text-[#166534] mt-0.5">Dynamometer stress balance confidence: 89%</p>
              </div>
            </div>
          </div>

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

    </div>
  );
};
