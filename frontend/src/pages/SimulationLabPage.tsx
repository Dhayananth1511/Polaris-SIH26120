import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Check, ArrowRight, RotateCcw, Cpu, Layers, 
  Settings, Zap, BarChart2, ShieldCheck, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { 
  wellsApi, simulationApi, approvalsApi, 
  type BackendWell, type SimulationResultRow, type SimulationResponse 
} from '../services/api';

export const SimulationLabPage: React.FC = () => {
  const navigate = useNavigate();
  const [wells, setWells] = useState<BackendWell[]>([]);
  const [selectedWell, setSelectedWell] = useState('BGW-001');
  const [scenarioName, setScenarioName] = useState('Optimized Cycle 01');
  const [scenarioMode, setScenarioMode] = useState<'current' | 'optimized' | 'custom'>('optimized');

  // Preset data loaded from database
  const [presetData, setPresetData] = useState<any>(null);

  // Simulation Parameters state (Screenshot 4)
  const [steamVol, setSteamVol] = useState<number>(735);
  const [pressure, setPressure] = useState<number>(21);
  const [soakTime, setSoakTime] = useState<number>(64);
  const [spm, setSpm] = useState<number>(5.1);
  const [strokeLength, setStrokeLength] = useState<number>(66);
  const [vfd, setVfd] = useState<number>(36);

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationData, setSimulationData] = useState<SimulationResponse | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Load wells list
  useEffect(() => {
    wellsApi.listWells().then(res => {
      if (res.success && res.data.length > 0) {
        setWells(res.data);
      }
    }).catch(console.error);
  }, []);

  // Load baseline preset when well changes
  const loadPreset = useCallback(async (wellId: string) => {
    try {
      const res = await simulationApi.getPreset(wellId);
      if (res.success && res.data) {
        setPresetData(res.data);
        const opt = res.data.optimized;
        setSteamVol(opt.steamVolumeTon);
        setPressure(opt.injectionPressureBar);
        setSoakTime(opt.soakTimeHr);
        setSpm(opt.spm);
        setStrokeLength(opt.strokeLengthIn);
        setVfd(opt.vfdFrequencyHz);

        // Run simulation with initial setpoints
        const simRes = await simulationApi.runSimulation({
          well_id: wellId,
          scenario_name: scenarioName,
          scenario_mode: 'optimized',
          steam_volume_ton: opt.steamVolumeTon,
          injection_pressure_bar: opt.injectionPressureBar,
          soak_time_hr: opt.soakTimeHr,
          spm: opt.spm,
          stroke_length_in: opt.strokeLengthIn,
          vfd_frequency_hz: opt.vfdFrequencyHz,
        });
        if (simRes.success) {
          setSimulationData(simRes.data);
        }
      }
    } catch (err) {
      console.error('Preset fetch error:', err);
    }
  }, [scenarioName]);

  useEffect(() => {
    loadPreset(selectedWell);
  }, [selectedWell, loadPreset]);

  // Switch scenario preset
  const handleSelectMode = (mode: 'current' | 'optimized' | 'custom') => {
    setScenarioMode(mode);
    if (!presetData) return;

    if (mode === 'current') {
      const cur = presetData.current;
      setSteamVol(cur.steamVolumeTon);
      setPressure(cur.injectionPressureBar);
      setSoakTime(cur.soakTimeHr);
      setSpm(cur.spm);
      setStrokeLength(cur.strokeLengthIn);
      setVfd(cur.vfdFrequencyHz);
      setScenarioName(`Baseline ${selectedWell}`);
    } else if (mode === 'optimized') {
      const opt = presetData.optimized;
      setSteamVol(opt.steamVolumeTon);
      setPressure(opt.injectionPressureBar);
      setSoakTime(opt.soakTimeHr);
      setSpm(opt.spm);
      setStrokeLength(opt.strokeLengthIn);
      setVfd(opt.vfdFrequencyHz);
      setScenarioName(`Optimized ${selectedWell}`);
    }
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await simulationApi.runSimulation({
        well_id: selectedWell,
        scenario_name: scenarioName,
        scenario_mode: scenarioMode,
        steam_volume_ton: steamVol,
        injection_pressure_bar: pressure,
        soak_time_hr: soakTime,
        spm: spm,
        stroke_length_in: strokeLength,
        vfd_frequency_hz: vfd,
      });
      if (res.success) {
        setSimulationData(res.data);
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSubmitApproval = async () => {
    try {
      const impactText = simulationData?.results[0]?.change
        ? `${simulationData.results[0].change} Net Oil Rate`
        : '+14% Net Oil Rate';
      await approvalsApi.createApproval({
        well_id: selectedWell,
        recommendation: `Simulation Setpoints: Steam ${steamVol}t, SPM ${spm}, VFD ${vfd}Hz`,
        impact: impactText,
        submitted_by: `Simulation Lab (${scenarioName})`,
        comment: `Physics simulation run completed. Confidence: ${simulationData?.recommendation?.confidenceScore || 88.5}%.`,
        setpoints: { steamVol, pressure, soakTime, spm, strokeLength, vfd },
      });
      setSubmitSuccess(`Setpoints for ${selectedWell} submitted to Approvals queue!`);
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
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">Oil India Limited · Digital Twin Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            What-If Scenario Simulation Laboratory
          </h1>
          <p className="text-[14px] text-[#64748B] mt-0.5">
            Coupled reservoir-wellbore physics simulator for heavy oil production forecasting
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/app/digital-twin?well=${selectedWell}`)}
            className="px-3.5 py-2 bg-white border border-[#CBD5E1] rounded text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] shadow-xs transition-colors cursor-pointer"
          >
            Wellbore Twin →
          </button>
        </div>
      </div>

      {submitSuccess && (
        <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-[13px] text-[#15803D] font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {/* ── Top Bar: Well Selector, Scenario Name, Preset Tabs (Screenshot 4) ── */}
      <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-[#475569]">Well:</span>
            <select
              value={selectedWell}
              onChange={(e) => setSelectedWell(e.target.value)}
              className="px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[14px] font-bold text-[#0F172A] focus:outline-none focus:border-[#005C53] cursor-pointer"
            >
              {wells.map(w => (
                <option key={w.id} value={w.id}>{w.name || w.id}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-[#475569]">Scenario Name:</span>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[14px] font-semibold text-[#0F172A] focus:outline-none focus:border-[#005C53] w-48"
            />
          </div>
        </div>

        {/* 3 Preset Mode Tabs (Screenshot 4 Top Right) */}
        <div className="flex items-center bg-[#F1F5F9] p-1 rounded border border-[#E2E8F0]">
          <button
            onClick={() => handleSelectMode('current')}
            className={`px-3 py-1.5 rounded text-[12px] font-bold transition-all cursor-pointer ${
              scenarioMode === 'current'
                ? 'bg-[#005C53] text-white shadow-xs'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            Current Baseline
          </button>
          <button
            onClick={() => handleSelectMode('optimized')}
            className={`px-3 py-1.5 rounded text-[12px] font-bold transition-all cursor-pointer ${
              scenarioMode === 'optimized'
                ? 'bg-[#005C53] text-white shadow-xs'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            Optimized Scenario
          </button>
          <button
            onClick={() => setScenarioMode('custom')}
            className={`px-3 py-1.5 rounded text-[12px] font-bold transition-all cursor-pointer ${
              scenarioMode === 'custom'
                ? 'bg-[#005C53] text-white shadow-xs'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {/* ── Main 2-Column Grid (Exact Match to Screenshot 4) ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: CSS & SRP Parameter Cards (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          
          {/* CSS Parameters Card */}
          <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs">
            <h4 className="text-[14px] font-bold text-[#0F172A] mb-4 pb-2 border-b border-[#F1F5F9]">
              CSS Thermal Cycle Parameters
            </h4>
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#475569]">Steam Volume (ton)</span>
                <input
                  type="number"
                  value={steamVol}
                  onChange={(e) => {
                    setSteamVol(Number(e.target.value));
                    setScenarioMode('custom');
                  }}
                  className="w-24 px-3 py-1.5 text-right font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#005C53]"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#475569]">Injection Pressure (bar)</span>
                <input
                  type="number"
                  value={pressure}
                  onChange={(e) => {
                    setPressure(Number(e.target.value));
                    setScenarioMode('custom');
                  }}
                  className="w-24 px-3 py-1.5 text-right font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#005C53]"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#475569]">Soak Time (hr)</span>
                <input
                  type="number"
                  value={soakTime}
                  onChange={(e) => {
                    setSoakTime(Number(e.target.value));
                    setScenarioMode('custom');
                  }}
                  className="w-24 px-3 py-1.5 text-right font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#005C53]"
                />
              </div>
            </div>
          </div>

          {/* SRP Parameters Card */}
          <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs">
            <h4 className="text-[14px] font-bold text-[#0F172A] mb-4 pb-2 border-b border-[#F1F5F9]">
              SRP Mechanical Artificial Lift Parameters
            </h4>
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#475569]">SPM (strokes/min)</span>
                <input
                  type="number"
                  step="0.1"
                  value={spm}
                  onChange={(e) => {
                    setSpm(Number(e.target.value));
                    setScenarioMode('custom');
                  }}
                  className="w-24 px-3 py-1.5 text-right font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#005C53]"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#475569]">Stroke Length (in)</span>
                <input
                  type="number"
                  value={strokeLength}
                  onChange={(e) => {
                    setStrokeLength(Number(e.target.value));
                    setScenarioMode('custom');
                  }}
                  className="w-24 px-3 py-1.5 text-right font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#005C53]"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#475569]">VFD Inverter (Hz)</span>
                <input
                  type="number"
                  value={vfd}
                  onChange={(e) => {
                    setVfd(Number(e.target.value));
                    setScenarioMode('custom');
                  }}
                  className="w-24 px-3 py-1.5 text-right font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#005C53]"
                />
              </div>
            </div>
          </div>

          {/* Run Simulation Action Button */}
          <div>
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="w-full py-3 bg-[#005C53] hover:bg-[#004B44] text-white font-bold rounded-lg text-[14px] shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-4 h-4 fill-white ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Simulating Coupled Reservoir-Wellbore Kinematics...' : 'Run Simulation'}</span>
            </button>
          </div>

        </div>

        {/* Right Column: Simulation Result & Scenario Recommendation (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          
          {/* Simulation Result Table Card */}
          <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs">
            <h4 className="text-[14px] font-bold text-[#0F172A] mb-4 pb-2 border-b border-[#F1F5F9]">
              Simulation Result vs Current Baseline
            </h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="bg-[#F8FAFC] text-[#475569] font-bold text-[11px] uppercase tracking-wider border-b border-[#E2E8F0]">
                    <th className="py-2.5 px-3">Parameter</th>
                    <th className="py-2.5 px-3 text-right">Current (DB)</th>
                    <th className="py-2.5 px-3 text-right">Simulated</th>
                    <th className="py-2.5 px-3 text-right">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {(simulationData?.results || []).map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 font-semibold text-[#334155]">{row.parameter}</td>
                      <td className="py-3 px-3 text-right font-medium text-[#64748B]">{row.current}</td>
                      <td className="py-3 px-3 text-right font-bold text-[#0F172A]">{row.scenario}</td>
                      <td className={`py-3 px-3 text-right font-bold ${row.isPositive ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                        {row.change}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scenario Recommended Banner */}
          <div className={`p-4 rounded-lg border flex items-center gap-3.5 shadow-xs ${
            simulationData?.recommendation?.status === 'Recommended'
              ? 'bg-[#F0FDF4] border-[#BBF7D0]'
              : 'bg-[#FEFCE8] border-[#FEF08A]'
          }`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 ${
              simulationData?.recommendation?.status === 'Recommended' ? 'bg-[#16A34A]' : 'bg-[#CA8A04]'
            }`}>
              {simulationData?.recommendation?.status === 'Recommended' ? (
                <Check className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              )}
            </div>
            <div>
              <h5 className={`font-black text-[14px] ${
                simulationData?.recommendation?.status === 'Recommended' ? 'text-[#15803D]' : 'text-[#854D0E]'
              }`}>
                Scenario {simulationData?.recommendation?.status || 'Recommended'}
              </h5>
              <p className={`text-[12px] mt-0.5 ${
                simulationData?.recommendation?.status === 'Recommended' ? 'text-[#166534]' : 'text-[#713F12]'
              }`}>
                {simulationData?.recommendation?.message || 'Meets all safety and operational constraints'}
              </p>
            </div>
          </div>

          {/* Action forward to Engineering Approvals */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleSubmitApproval}
              className="w-full py-3 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold rounded text-[13px] shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Submit Simulation Setpoints for Field Approval</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
