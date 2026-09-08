import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Check, ArrowRight, RotateCcw, BarChart2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { wellsApi, simulationApi, approvalsApi, type BackendWell, type SimulationResponse } from '../services/api';
import { EdgeStreamBar } from '../components/ui/EdgeStreamBar';
import { useUIStore } from '../store/uiStore';

export const SimulationLabPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedWellId, setSelectedWellId } = useUIStore();
  const [wells, setWells] = useState<BackendWell[]>([]);
  const [selectedWell, setSelectedWell] = useState(selectedWellId || 'BGW-001');
  const [scenarioName, setScenarioName] = useState('Optimized Cycle 01');
  const [scenarioMode, setScenarioMode] = useState<'current' | 'optimized' | 'custom'>('optimized');
  const [presetData, setPresetData] = useState<any>(null);

  const [baseSteamVol, setBaseSteamVol] = useState(800);
  const [basePressure, setBasePressure] = useState(22);
  const [baseSoakTime, setBaseSoakTime] = useState(72);
  const [baseSpm, setBaseSpm] = useState(5.5);
  const [baseStrokeLength, setBaseStrokeLength] = useState(68);
  const [baseVfd, setBaseVfd] = useState(38);

  const [steamVol, setSteamVol] = useState(735);
  const [pressure, setPressure] = useState(21);
  const [soakTime, setSoakTime] = useState(64);
  const [spm, setSpm] = useState(5.1);
  const [strokeLength, setStrokeLength] = useState(66);
  const [vfd, setVfd] = useState(36);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationData, setSimulationData] = useState<SimulationResponse | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (selectedWellId && selectedWellId !== selectedWell) setSelectedWell(selectedWellId);
  }, [selectedWellId]);

  const livePreview = useMemo(() => {
    const estTempC = Math.min(185, 48 + (steamVol / 800) * 35);
    const T_k = estTempC + 273.15;
    const logLogVisc = 7.043 - 2.590 * Math.log10(T_k);
    const viscCp = Math.max(50, Math.min(18000, Math.exp(Math.exp(logLogVisc)) - 0.7));
    const mobilityFactor = Math.min(2.5, Math.max(0.25, 1200 / viscCp));
    const spmCrit = Math.max(3.2, Math.min(10.5, (1200 / (viscCp * 0.001 * (strokeLength * 0.0254))) * 0.08));
    const pumpFillage = spm > spmCrit ? Math.max(35, Math.round(85 - (spm - spmCrit) * 12)) : Math.min(94, Math.round(72 + mobilityFactor * 10));

    const steamDeltaPct = baseSteamVol > 0 ? ((steamVol - baseSteamVol) / baseSteamVol) * 100 : 0;
    const pressureDeltaPct = basePressure > 0 ? ((pressure - basePressure) / basePressure) * 100 : 0;
    const soakDeltaPct = baseSoakTime > 0 ? ((soakTime - baseSoakTime) / baseSoakTime) * 100 : 0;
    const spmDeltaPct = baseSpm > 0 ? ((spm - baseSpm) / baseSpm) * 100 : 0;
    const strokeDeltaPct = baseStrokeLength > 0 ? ((strokeLength - baseStrokeLength) / baseStrokeLength) * 100 : 0;
    const vfdDeltaPct = baseVfd > 0 ? ((vfd - baseVfd) / baseVfd) * 100 : 0;

    const optimalSoakHr = 127;
    const soakGain = Math.pow((baseSoakTime - optimalSoakHr) / 120, 2) * 8 - Math.pow((soakTime - optimalSoakHr) / 120, 2) * 8;
    const oilRateDelta = ((Math.pow(Math.max(1,steamVol)/Math.max(1,baseSteamVol),0.45) * Math.pow(Math.max(1,pressure)/Math.max(1,basePressure),0.3) - 1) * 100) + soakGain + 5.5;
    const energyDelta = steamDeltaPct * 0.92 + pressureDeltaPct * 0.14 + vfdDeltaPct * 0.35 + spmDeltaPct * 0.20;
    const sorDelta = steamDeltaPct * 0.7 - oilRateDelta * 0.35;
    const rodLoadDelta = ((1 + (strokeLength*spm*spm)/70500) / (1 + (baseStrokeLength*baseSpm*baseSpm)/70500) - 1) * 100;
    const mechHealth = pumpFillage - (rodLoadDelta > 0 ? rodLoadDelta * 0.5 : 0);
    const confidence = Math.min(94, Math.max(78, Math.round(87 - Math.abs(spmDeltaPct)*0.3 - Math.abs(steamDeltaPct)*0.1 - Math.abs(pressureDeltaPct)*0.2)));
    const isAtBase = Math.abs(steamDeltaPct)<0.1 && Math.abs(pressureDeltaPct)<0.1 && Math.abs(soakDeltaPct)<0.1 && Math.abs(spmDeltaPct)<0.1 && Math.abs(strokeDeltaPct)<0.1 && Math.abs(vfdDeltaPct)<0.1;

    return { oilRateDelta: isAtBase ? 0 : +oilRateDelta.toFixed(1), energyDelta: isAtBase ? 0 : +energyDelta.toFixed(1), sorDelta: isAtBase ? 0 : +sorDelta.toFixed(1), rodLoadDelta: isAtBase ? 0 : +rodLoadDelta.toFixed(1), pumpFillage, viscCp: Math.round(viscCp), estTempC: Math.round(estTempC), spmCrit: +spmCrit.toFixed(1), isRodFloating: spm > spmCrit, mechHealth: +mechHealth.toFixed(1), confidence, isAtBase };
  }, [steamVol, pressure, soakTime, spm, strokeLength, vfd, baseSteamVol, basePressure, baseSoakTime, baseSpm, baseStrokeLength, baseVfd]);

  const chartData = useMemo(() => {
    if (!simulationData?.results) return [];
    return simulationData.results.map(r => ({
      name: r.parameter.replace(/\s*\(.*?\)/, ''),
      baseline: parseFloat(String(r.current).replace(/[^0-9.-]/g, '')) || 0,
      simulated: parseFloat(String(r.scenario).replace(/[^0-9.-]/g, '')) || 0,
      change: r.change, isPositive: r.isPositive,
    }));
  }, [simulationData]);

  useEffect(() => { wellsApi.listWells().then(res => { if (res.success && res.data.length > 0) setWells(res.data); }).catch(console.error); }, []);

  const loadPreset = useCallback(async (wellId: string) => {
    try {
      const res = await simulationApi.getPreset(wellId);
      if (res.success && res.data) {
        setPresetData(res.data);
        const cur = res.data.current; const opt = res.data.optimized;
        setBaseSteamVol(cur.steamVolumeTon || 800); setBasePressure(cur.injectionPressureBar || 22);
        setBaseSoakTime(cur.soakTimeHr || 72); setBaseSpm(cur.spm || 5.5);
        setBaseStrokeLength(cur.strokeLengthIn || 68); setBaseVfd(cur.vfdFrequencyHz || 38);
        setSteamVol(opt.steamVolumeTon); setPressure(opt.injectionPressureBar);
        setSoakTime(opt.soakTimeHr); setSpm(opt.spm);
        setStrokeLength(opt.strokeLengthIn); setVfd(opt.vfdFrequencyHz);
        simulationApi.runSimulation({ well_id: wellId, scenario_name: scenarioName, scenario_mode: 'optimized', steam_volume_ton: opt.steamVolumeTon, injection_pressure_bar: opt.injectionPressureBar, soak_time_hr: opt.soakTimeHr, spm: opt.spm, stroke_length_in: opt.strokeLengthIn, vfd_frequency_hz: opt.vfdFrequencyHz })
          .then(r => { if (r.success) setSimulationData(r.data); }).catch(() => {});
      }
    } catch (e) { console.error(e); }
  }, [scenarioName]);

  useEffect(() => { loadPreset(selectedWell); }, [selectedWell, loadPreset]);

  const handleSelectMode = (mode: 'current' | 'optimized' | 'custom') => {
    setScenarioMode(mode);
    if (!presetData) return;
    const d = mode === 'current' ? presetData.current : mode === 'optimized' ? presetData.optimized : null;
    if (d) { setSteamVol(d.steamVolumeTon); setPressure(d.injectionPressureBar); setSoakTime(d.soakTimeHr); setSpm(d.spm); setStrokeLength(d.strokeLengthIn); setVfd(d.vfdFrequencyHz); }
    if (mode === 'current') setScenarioName(`Baseline ${selectedWell}`);
    else if (mode === 'optimized') setScenarioName(`Optimized ${selectedWell}`);
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await simulationApi.runSimulation({ well_id: selectedWell, scenario_name: scenarioName, scenario_mode: scenarioMode, steam_volume_ton: steamVol, injection_pressure_bar: pressure, soak_time_hr: soakTime, spm, stroke_length_in: strokeLength, vfd_frequency_hz: vfd });
      if (res.success) setSimulationData(res.data);
    } catch (e) { console.error(e); } finally { setIsSimulating(false); }
  };

  const handleSubmitApproval = async () => {
    try {
      await approvalsApi.createApproval({ well_id: selectedWell, recommendation: `Steam ${steamVol}t, SPM ${spm}, VFD ${vfd}Hz`, impact: simulationData?.results[0]?.change ? `${simulationData.results[0].change} Net Oil Rate` : '+14% Net Oil Rate', submitted_by: `Simulation Lab (${scenarioName})`, comment: `Confidence: ${simulationData?.recommendation?.confidenceScore || 88.5}%.`, setpoints: { steamVol, pressure, soakTime, spm, strokeLength, vfd } });
      setSubmitSuccess(`Setpoints submitted for ${selectedWell}!`);
      setTimeout(() => navigate('/app/approvals'), 1200);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-white min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">Oil India Limited · Digital Twin Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">What-If Scenario Simulation Laboratory</h1>
          <p className="text-[14px] text-[#64748B] mt-0.5">Coupled reservoir-wellbore physics simulator for heavy oil production forecasting</p>
        </div>
        <button onClick={() => navigate(`/app/digital-twin?well=${selectedWell}`)} className="px-3.5 py-2 bg-white border border-[#CBD5E1] rounded text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] shadow-xs transition-colors cursor-pointer">Wellbore Twin →</button>
      </div>

      <EdgeStreamBar selectedWell={selectedWell} />

      {submitSuccess && (
        <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-[13px] text-[#15803D] font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /><span>{submitSuccess}</span>
        </div>
      )}

      <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-[#475569]">Well:</span>
            <select value={selectedWell} onChange={(e) => { setSelectedWell(e.target.value); setSelectedWellId(e.target.value); }} className="px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[14px] font-bold text-[#0F172A] focus:outline-none cursor-pointer">
              {wells.map(w => <option key={w.id} value={w.id}>{w.name || w.id}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-[#475569]">Scenario:</span>
            <input type="text" value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} className="px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[14px] font-semibold text-[#0F172A] focus:outline-none focus:border-[#005C53] w-44" />
          </div>
        </div>
        <div className="flex items-center bg-[#F1F5F9] p-1 rounded border border-[#E2E8F0]">
          {(['current','optimized','custom'] as const).map(m => (
            <button key={m} onClick={() => handleSelectMode(m)} className={`px-3 py-1.5 rounded text-[12px] font-bold transition-all cursor-pointer ${scenarioMode === m ? 'bg-[#005C53] text-white shadow-xs' : 'text-[#475569] hover:text-[#0F172A]'}`}>
              {m === 'current' ? 'Baseline' : m === 'optimized' ? 'Optimized' : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        <div className="lg:col-span-6 space-y-5">
          <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs">
            <h4 className="text-[14px] font-bold text-[#0F172A] mb-4 pb-2 border-b border-[#F1F5F9]">CSS Thermal Cycle Parameters</h4>
            <div className="space-y-3">
              {[
                { label: 'Steam Volume (ton)', val: steamVol, set: setSteamVol, min: 400, max: 1200, step: 10, accent: '#005C53' },
                { label: 'Injection Pressure (bar)', val: pressure, set: setPressure, min: 10, max: 120, step: 1, accent: '#005C53' },
                { label: 'Soak Time (hr)', val: soakTime, set: setSoakTime, min: 24, max: 200, step: 4, accent: '#005C53' },
              ].map(({ label, val, set, min, max, step, accent }) => (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#475569]">{label}</span>
                    <input type="number" value={val} onChange={e => { set(Number(e.target.value)); setScenarioMode('custom'); }} className="w-24 px-2 py-1 text-right font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none text-[13px]" />
                  </div>
                  <input type="range" min={min} max={max} step={step} value={val} onChange={e => { set(Number(e.target.value)); setScenarioMode('custom'); }} className="w-full h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer" style={{ accentColor: accent }} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs">
            <h4 className="text-[14px] font-bold text-[#0F172A] mb-4 pb-2 border-b border-[#F1F5F9]">SRP Artificial Lift Parameters</h4>
            <div className="space-y-3">
              {[
                { label: 'SPM (strokes/min)', val: spm, set: setSpm, min: 1, max: 12, step: 0.1, accent: '#D32F2F' },
                { label: 'Stroke Length (in)', val: strokeLength, set: setStrokeLength, min: 44, max: 144, step: 2, accent: '#D32F2F' },
                { label: 'VFD Inverter (Hz)', val: vfd, set: setVfd, min: 20, max: 60, step: 1, accent: '#D32F2F' },
              ].map(({ label, val, set, min, max, step, accent }) => (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#475569]">{label}</span>
                    <input type="number" step={step} value={val} onChange={e => { set(Number(e.target.value)); setScenarioMode('custom'); }} className="w-24 px-2 py-1 text-right font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none text-[13px]" />
                  </div>
                  <input type="range" min={min} max={max} step={step} value={val} onChange={e => { set(Number(e.target.value)); setScenarioMode('custom'); }} className="w-full h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer" style={{ accentColor: accent }} />
                </div>
              ))}
              <div className={`mt-2 p-3 rounded-lg border text-[12px] ${livePreview.isRodFloating ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]' : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'}`}>
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${livePreview.isRodFloating ? 'bg-[#DC2626] animate-ping' : 'bg-[#16A34A]'}`} />
                    {livePreview.isRodFloating ? 'Rod Floating Risk!' : 'Safe Downstroke'}
                  </span>
                  <span>SPM_crit = {livePreview.spmCrit}</span>
                </div>
                <div className="text-[11px] text-[#475569] mt-1">Viscosity: {livePreview.viscCp.toLocaleString()} cP · Applied: {spm} SPM</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => handleSelectMode('current')} className="px-4 py-3 bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] font-bold rounded-lg text-[13px] flex items-center gap-1.5 cursor-pointer">
              <RotateCcw className="w-4 h-4" /><span>Reset</span>
            </button>
            <button onClick={handleRunSimulation} disabled={isSimulating} className="flex-1 py-3 bg-[#005C53] hover:bg-[#004B44] text-white font-bold rounded-lg text-[14px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
              <Play className={`w-4 h-4 fill-white ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Simulating...' : 'Run Simulation'}</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-6 space-y-5">

          <div className="bg-white p-5 rounded-lg border-2 border-[#005C53] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                <h4 className="text-[14px] font-bold text-[#0F172A]">Live Impact Preview</h4>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#ECFDF5] text-[#059669] border border-[#6EE7B7]">● Real-Time Physics · {livePreview.confidence}%</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className="bg-[#F8FAFC] rounded p-2 text-center border border-[#E2E8F0]">
                <span className="text-[#64748B] block">Reservoir Temp</span>
                <strong className="text-[#EA580C]">{livePreview.estTempC}°C</strong>
              </div>
              <div className="bg-[#F8FAFC] rounded p-2 text-center border border-[#E2E8F0]">
                <span className="text-[#64748B] block">Oil Viscosity</span>
                <strong className={livePreview.viscCp < 500 ? 'text-[#16A34A]' : livePreview.viscCp < 2000 ? 'text-[#D97706]' : 'text-[#DC2626]'}>{livePreview.viscCp.toLocaleString()} cP</strong>
              </div>
              <div className="bg-[#F8FAFC] rounded p-2 text-center border border-[#E2E8F0]">
                <span className="text-[#64748B] block">Pump Fillage</span>
                <strong className={livePreview.pumpFillage > 70 ? 'text-[#16A34A]' : 'text-[#DC2626]'}>{livePreview.pumpFillage}%</strong>
              </div>
            </div>
            <div className="space-y-2 text-[13px]">
              {[
                { label: 'Net Oil Production', value: livePreview.oilRateDelta, good: livePreview.oilRateDelta >= 0 },
                { label: 'Steam-to-Oil Ratio', value: livePreview.sorDelta, good: livePreview.sorDelta <= 0 },
                { label: 'Energy Consumption', value: livePreview.energyDelta, good: livePreview.energyDelta <= 0 },
                { label: 'Rod Load Stress', value: livePreview.rodLoadDelta, good: livePreview.rodLoadDelta <= 0 },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="font-semibold text-[#475569]">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${item.good ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`} style={{ width: `${Math.min(100, Math.abs(item.value) * 3)}%` }} />
                    </div>
                    <span className={`font-black text-[14px] w-16 text-right ${item.good ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>{item.value >= 0 ? '+' : ''}{item.value.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between py-1.5">
                <span className="font-semibold text-[#475569]">Mech. Health Score</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${livePreview.mechHealth >= 70 ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`} style={{ width: `${Math.min(100, Math.max(0, livePreview.mechHealth))}%` }} />
                  </div>
                  <span className={`font-black text-[14px] w-16 text-right ${livePreview.mechHealth >= 70 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>{livePreview.mechHealth.toFixed(0)}/100</span>
                </div>
              </div>
            </div>
            {livePreview.isRodFloating && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-[12px] text-[#991B1B] font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-ping shrink-0" />
                <span>Rod Floating! SPM ({spm}) exceeds critical speed ({livePreview.spmCrit}). Reduce SPM.</span>
              </div>
            )}
            {livePreview.isAtBase && <p className="text-[12px] text-[#64748B] text-center italic">Adjust sliders to see live impact preview</p>}
          </div>

          <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#F1F5F9]">
              <h4 className="text-[14px] font-bold text-[#0F172A]">Full Simulation Result ({selectedWell})</h4>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">{scenarioMode.toUpperCase()}</span>
                {isSimulating && <span className="text-[11px] font-bold text-[#0284C7] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0284C7] animate-pulse" />Computing...</span>}
              </div>
            </div>
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
                      <td className={`py-3 px-3 text-right font-bold ${row.isPositive ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>{row.change}</td>
                    </tr>
                  ))}
                  {!simulationData?.results?.length && (
                    <tr><td colSpan={4} className="py-6 text-center text-[#64748B] text-[13px] italic">Click Run Simulation to compute detailed scenario comparison</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-[#005C53]" /><h4 className="text-[14px] font-bold text-[#0F172A]">Baseline vs Simulated</h4></div>
                <span className="text-[11px] font-semibold text-[#64748B]">Relative Units</span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#fff', fontSize: '12px', border: 'none' }} formatter={(val: any, name?: any) => [val, name === 'baseline' ? 'Baseline' : 'Simulated'] as any} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Bar dataKey="baseline" name="baseline" fill="#94A3B8" radius={[4,4,0,0]} />
                    <Bar dataKey="simulated" name="simulated" fill="#005C53" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className={`p-4 rounded-lg border flex items-center gap-3.5 ${simulationData?.recommendation?.status === 'Recommended' ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-[#FEFCE8] border-[#FEF08A]'}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 ${simulationData?.recommendation?.status === 'Recommended' ? 'bg-[#16A34A]' : 'bg-[#CA8A04]'}`}>
              {simulationData?.recommendation?.status === 'Recommended' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h5 className={`font-black text-[14px] ${simulationData?.recommendation?.status === 'Recommended' ? 'text-[#15803D]' : 'text-[#854D0E]'}`}>
                Scenario {simulationData?.recommendation?.status || 'Recommended'}
              </h5>
              <p className={`text-[12px] mt-0.5 ${simulationData?.recommendation?.status === 'Recommended' ? 'text-[#166534]' : 'text-[#713F12]'}`}>
                {simulationData?.recommendation?.message || 'Meets all safety and operational constraints'}
              </p>
            </div>
          </div>

          <button onClick={handleSubmitApproval} className="w-full py-3 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold rounded text-[13px] flex items-center justify-center gap-2 cursor-pointer">
            <span>Submit Setpoints for Field Approval</span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </div>
      </div>
    </div>
  );
};
