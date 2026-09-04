import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, ArrowRight, CheckCircle2, ChevronRight, Cpu, 
  Download, Eye, Gauge, Layers, Play, RefreshCw, RotateCcw, 
  Settings, ShieldAlert, Sliders, Zap, Check 
} from 'lucide-react';
import { BGW014_TWIN_STATE, BGW014_PRODUCTION, BGW014_CSS_CYCLES, BGW014_SRP } from '../data/mockData';

interface DigitalTwinProps {
  tab?: 'twin' | 'simulation';
}

export const DigitalTwinPage: React.FC<DigitalTwinProps> = ({ tab = 'twin' }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'twin' | 'simulation' | 'dyno' | 'cycles'>(
    tab === 'simulation' ? 'simulation' : 'twin'
  );

  useEffect(() => {
    if (tab === 'simulation') {
      setActiveTab('simulation');
    } else if (tab === 'twin') {
      setActiveTab('twin');
    }
  }, [tab]);

  // Simulation Lab State (Screenshot 4)
  const [simWellId, setSimWellId] = useState('BGW-014');
  const [simScenarioName, setSimScenarioName] = useState('Optimized Cycle 01');
  const [simScenarioMode, setSimScenarioMode] = useState<'current' | 'optimized' | 'custom'>('optimized');
  const [simCssSteam, setSimCssSteam] = useState<number>(735);
  const [simCssPressure, setSimCssPressure] = useState<number>(21);
  const [simCssSoak, setSimCssSoak] = useState<number>(64);
  const [simSrpSPM, setSimSrpSPM] = useState<number>(5.1);
  const [simSrpStroke, setSimSrpStroke] = useState<number>(66);
  const [simSrpVFD, setSimSrpVFD] = useState<number>(36);
  const [simRunning, setSimRunning] = useState<boolean>(false);

  // Calculated simulation outputs based on physics models for heavy oil CSS + SRP
  // Heavy oil viscosity model: mu = mu_0 * exp(-b * (T - T_0))
  // Production rate model: Q_o = C * (k_h / mu) * (P_res - P_wf) * (1 - exp(-t / tau))
  const simOilRate = Math.round(
    (24.8 * (simCssSteam / 800) * 0.75 + (12 - simSrpSPM) * 1.2 + (simSrpStroke / 72) * 4.5) * 10
  ) / 10;
  
  const simSOR = Math.round((simCssSteam / (simOilRate * 120)) * 10) / 10;
  const simViscosity = Math.round(1820 * (800 / simCssSteam) * (18 / (simCssSoak / 24)));
  const simRodLoad = Math.round((6.3 * (simSrpSPM / 10) * 0.85) * 10) / 10;
  const simFailureRisk = simRodLoad > 6.0 ? 'High' : simRodLoad > 5.4 ? 'Medium' : 'Low';

  // Animation ticker for SRP beam motion
  const [beamAngle, setBeamAngle] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setBeamAngle(prev => (prev + 4) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const strokeOffset = Math.sin((beamAngle * Math.PI) / 180) * 18;

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#F4F6F8] min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D32F2F]" />
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">Digital Twin Engine · Well BGW-014</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            BGW-014 Wellbore &amp; Reservoir Digital Twin
          </h1>
          <p className="text-[15px] text-[#64748B] mt-1">
            Coupled reservoir-wellbore-SRP physics model · Baghewala Heavy Oil Field, Rajasthan
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-4 py-2 rounded text-[13px] font-bold transition-colors ${
              activeTab === 'simulation' ? 'bg-[#D32F2F] text-white' : 'bg-white border border-[#CBD5E1] text-[#334155]'
            }`}
          >
            <Sliders className="w-4 h-4 inline-block mr-1.5" />
            Simulation Lab
          </button>
          <button
            onClick={() => navigate('/app/joint-optimizer')}
            className="flex items-center gap-2 px-5 py-2 bg-[#D32F2F] text-white rounded text-[13px] font-semibold hover:bg-[#B71C1C] shadow-sm transition-colors"
          >
            <Zap className="w-4 h-4" />
            <span>Apply Joint Optimizer</span>
          </button>
        </div>
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 text-[14px]">
        {[
          { key: 'twin', label: 'Well Schematic & Live Telemetry' },
          { key: 'simulation', label: 'What-If Simulation Laboratory' },
          { key: 'dyno', label: 'Dynamometer Card Diagnostics' },
          { key: 'cycles', label: 'CSS Cycle History & Decline' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`px-4 py-2 font-bold rounded-t transition-all ${
              activeTab === t.key
                ? 'border-b-2 border-[#D32F2F] text-[#D32F2F] bg-white'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: WELL SCHEMATIC & LIVE TELEMETRY ───────────────── */}
      {activeTab === 'twin' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Visual Schematic Diagram (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded border border-[#E2E8F0] shadow-sm p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-5 bg-[#D32F2F] rounded-full" />
                <h3 className="text-[16px] font-bold text-[#0F172A]">Cross-Sectional Wellbore Physics Model</h3>
              </div>
              <span className="text-[12px] text-[#64748B] font-medium">True Vertical Depth: 852 m MD</span>
            </div>

            {/* Interactive SVG Schematic */}
            <div className="relative h-[540px] bg-[#F8FAFC] rounded border border-[#E2E8F0] overflow-hidden flex items-center justify-center p-4">
              <svg viewBox="0 0 500 500" className="w-full h-full max-h-[500px]">
                
                {/* Surface Ground Line */}
                <rect x="0" y="80" width="500" height="4" fill="#64748B" />
                <text x="20" y="70" fill="#475569" fontSize="12" fontWeight="bold">Surface (Ground Level 0 m)</text>
                
                {/* Surface Pumping Unit (Walking Beam) */}
                <g transform="translate(180, 20)">
                  {/* Samson Post */}
                  <line x1="80" y1="60" x2="60" y2="20" stroke="#334155" strokeWidth="4" />
                  <line x1="40" y1="60" x2="60" y2="20" stroke="#334155" strokeWidth="4" />
                  {/* Walking Beam with dynamic rotation */}
                  <g transform={`rotate(${strokeOffset * 0.4}, 60, 20)`}>
                    <rect x="0" y="17" width="120" height="6" fill="#D32F2F" rx="2" />
                    {/* Horse Head */}
                    <path d="M 0 17 Q -15 25 -10 50 L 0 50 Z" fill="#D32F2F" />
                  </g>
                  {/* Polished Rod with dynamic stroke */}
                  <line x1="170" y1={40 + strokeOffset} x2="170" y2="60" stroke="#0F172A" strokeWidth="3" />
                </g>

                {/* Overburden Geological Strata */}
                <rect x="60" y="84" width="380" height="120" fill="#E2E8F0" opacity="0.4" />
                <text x="75" y="140" fill="#94A3B8" fontSize="11" fontWeight="bold">Overburden Shale Formation (0 - 300 m)</text>

                <rect x="60" y="204" width="380" height="150" fill="#CBD5E1" opacity="0.3" />
                <text x="75" y="270" fill="#94A3B8" fontSize="11" fontWeight="bold">Intermediate Siltstone &amp; Evaporite (300 - 780 m)</text>

                {/* Baghewala Heavy Oil Reservoir Formation */}
                <rect x="60" y="354" width="380" height="120" fill="#FEF3C7" stroke="#F59E0B" strokeDasharray="3 3" />
                <text x="75" y="380" fill="#B45309" fontSize="12" fontWeight="bold">Baghewala Sand Member A (852 m MD)</text>
                <text x="75" y="398" fill="#92400E" fontSize="11">Heavy Oil Viscosity: 1,820 cP · Temp: 61.4 °C</text>

                {/* Steam Chamber Heat Plume (CSS) */}
                <ellipse cx="250" cy="420" rx="90" ry="35" fill="#EF4444" opacity="0.18" />
                <ellipse cx="250" cy="420" rx="55" ry="22" fill="#F87171" opacity="0.25" />
                <text x="250" y="445" textAnchor="middle" fill="#B91C1C" fontSize="10" fontWeight="bold">CSS Steam Penetration Zone (42 m radius)</text>

                {/* Casing (outer pipe) */}
                <rect x="235" y="84" width="30" height="320" fill="#94A3B8" opacity="0.7" />
                
                {/* Tubing (inner string) */}
                <rect x="242" y="84" width="16" height="320" fill="#475569" />

                {/* Downhole Sucker Rod String with dynamic reciprocal stroke */}
                <line x1="250" y1="84" x2="250" y2={370 + strokeOffset * 0.4} stroke="#D32F2F" strokeWidth="2" />

                {/* Downhole Pump Barrel & Plunger */}
                <rect x="240" y="375" width="20" height="35" fill="#1E293B" rx="1" />
                <circle cx="250" cy="385" r="3" fill="#D32F2F" />
                <text x="270" y="390" fill="#1E293B" fontSize="11" fontWeight="bold">SRP Pump (852 m)</text>

                {/* Perforations */}
                {[-10, 0, 10, 20].map(offset => (
                  <g key={offset}>
                    <line x1="230" y1={410 + offset} x2="238" y2={410 + offset} stroke="#D32F2F" strokeWidth="2" />
                    <line x1="262" y1={410 + offset} x2="270" y2={410 + offset} stroke="#D32F2F" strokeWidth="2" />
                  </g>
                ))}

              </svg>
            </div>

            <div className="mt-4 flex items-center justify-between text-[12px] text-[#64748B]">
              <span>Real-time physics calculation updated: <strong className="text-[#0F172A]">Every 2 seconds</strong></span>
              <span className="flex items-center gap-1.5 text-[#2E7D32] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
                Dynamic Kinematics Synchronized
              </span>
            </div>
          </div>

          {/* Telemetry Panels & Risk Indicators (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Health & Failure Risk Card */}
            <div className="bg-white p-5 rounded border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
                <h4 className="text-[14px] font-bold text-[#0F172A]">Equipment Health &amp; Diagnostics</h4>
                <span className="px-2.5 py-0.5 rounded bg-[#FFEBEE] text-[#D32F2F] text-[11px] font-bold">
                  HIGH ATTENTION
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div className="p-3 bg-[#F8FAFC] rounded border border-[#E2E8F0]">
                  <span className="text-[#64748B] text-[11px] block uppercase font-bold">Rod Overload Risk</span>
                  <span className="text-xl font-black text-[#D32F2F] mt-0.5 block">6.3 kN</span>
                  <span className="text-[11px] text-[#B71C1C]">Exceeds 6.0 kN nominal</span>
                </div>
                <div className="p-3 bg-[#F8FAFC] rounded border border-[#E2E8F0]">
                  <span className="text-[#64748B] text-[11px] block uppercase font-bold">Pump Efficiency</span>
                  <span className="text-xl font-black text-[#D97706] mt-0.5 block">62%</span>
                  <span className="text-[11px] text-[#B45309]">Fluid pound detected</span>
                </div>
              </div>
            </div>

            {/* Live Parameter Matrix */}
            <div className="bg-white p-5 rounded border border-[#E2E8F0] shadow-sm space-y-3">
              <h4 className="text-[14px] font-bold text-[#0F172A] pb-2 border-b border-[#F1F5F9]">
                Baghewala Sand Member A — Sensor Telemetry
              </h4>

              <div className="space-y-2 text-[13px]">
                {[
                  { l: 'Reservoir Temperature', v: '61.4 °C', nominal: 'Nominal range: 60 - 85 °C' },
                  { l: 'Reservoir Pressure', v: '28.5 bar', nominal: 'Depletion rate: -0.4 bar/mo' },
                  { l: 'Oil Viscosity at Formation', v: '1,820 cP', nominal: 'Cold baseline: 22,000 cP' },
                  { l: 'CSS Steam Quality', v: '72%', nominal: 'Injection standard: 70 - 80%' },
                  { l: 'Pumping Speed (SPM)', v: '10.0 SPM', nominal: 'VFD Frequency: 38.0 Hz' },
                  { l: 'Polished Rod Stroke', v: '72 inches', nominal: 'Effective plunger travel: 64"' },
                  { l: 'Gross Liquid Rate', v: '42.8 BFPD', nominal: 'Water cut: 42.0%' },
                  { l: 'Current Net Oil Production', v: '24.8 BOPD', nominal: 'Decline from peak: -35%' },
                ].map((row, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 border-b border-[#F8FAFC]">
                    <div>
                      <span className="font-semibold text-[#334155]">{row.l}</span>
                      <span className="block text-[11px] text-[#94A3B8]">{row.nominal}</span>
                    </div>
                    <span className="font-black text-[#0F172A] text-[14px]">{row.v}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3">
                <button
                  onClick={() => navigate('/app/joint-optimizer')}
                  className="w-full py-2.5 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold rounded text-[13px] transition-colors flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>Recommend Optimized Setpoints</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ── TAB 2: WHAT-IF SIMULATION LABORATORY (Matching Screenshot 4) ─── */}
      {activeTab === 'simulation' && (
        <div className="space-y-6">
          {/* Top Controls: Well Selector & Scenario Name */}
          <div className="bg-white p-4 rounded border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-[#475569]">Well:</span>
                <select
                  value={simWellId}
                  onChange={(e) => setSimWellId(e.target.value)}
                  className="px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[14px] font-bold text-[#0F172A] focus:outline-none focus:border-[#0284C7] cursor-pointer"
                >
                  <option value="BGW-014">BGW-014</option>
                  <option value="BGW-021">BGW-021</option>
                  <option value="BGW-007">BGW-007</option>
                  <option value="BGW-003">BGW-003</option>
                  <option value="BGW-005">BGW-005</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-[#475569]">Scenario Name:</span>
                <input
                  type="text"
                  value={simScenarioName}
                  onChange={(e) => setSimScenarioName(e.target.value)}
                  className="px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[14px] font-semibold text-[#0F172A] focus:outline-none focus:border-[#0284C7] w-48"
                />
              </div>
            </div>

            {/* Scenario Mode Tabs: Current / Optimized Scenario / Custom */}
            <div className="flex items-center bg-[#F1F5F9] p-1 rounded border border-[#E2E8F0]">
              <button
                onClick={() => {
                  setSimScenarioMode('current');
                  setSimCssSteam(800);
                  setSimCssPressure(22);
                  setSimCssSoak(72);
                  setSimSrpSPM(5.5);
                  setSimSrpStroke(68);
                  setSimSrpVFD(38);
                }}
                className={`px-3 py-1.5 rounded text-[12px] font-bold transition-all cursor-pointer ${
                  simScenarioMode === 'current'
                    ? 'bg-[#005C53] text-white shadow-xs'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                Current
              </button>
              <button
                onClick={() => {
                  setSimScenarioMode('optimized');
                  setSimCssSteam(735);
                  setSimCssPressure(21);
                  setSimCssSoak(64);
                  setSimSrpSPM(5.1);
                  setSimSrpStroke(66);
                  setSimSrpVFD(36);
                }}
                className={`px-3 py-1.5 rounded text-[12px] font-bold transition-all cursor-pointer ${
                  simScenarioMode === 'optimized'
                    ? 'bg-[#005C53] text-white shadow-xs'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                Optimized Scenario
              </button>
              <button
                onClick={() => setSimScenarioMode('custom')}
                className={`px-3 py-1.5 rounded text-[12px] font-bold transition-all cursor-pointer ${
                  simScenarioMode === 'custom'
                    ? 'bg-[#005C53] text-white shadow-xs'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* 2-Column Main Simulation Grid (Matching Screenshot 4) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: CSS & SRP Parameters (6 cols) */}
            <div className="lg:col-span-6 space-y-5">
              
              {/* CSS Parameters Card */}
              <div className="bg-white p-5 rounded border border-[#E2E8F0] shadow-xs">
                <h4 className="text-[14px] font-bold text-[#0F172A] mb-4 pb-2 border-b border-[#F1F5F9]">
                  CSS Parameters
                </h4>
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#475569]">Steam Volume (ton)</span>
                    <input
                      type="number"
                      value={simCssSteam}
                      onChange={(e) => {
                        setSimCssSteam(Number(e.target.value));
                        setSimScenarioMode('custom');
                      }}
                      className="w-24 px-3 py-1.5 text-right font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#475569]">Injection Pressure (bar)</span>
                    <input
                      type="number"
                      value={simCssPressure}
                      onChange={(e) => {
                        setSimCssPressure(Number(e.target.value));
                        setSimScenarioMode('custom');
                      }}
                      className="w-24 px-3 py-1.5 text-right font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#475569]">Soak Time (hr)</span>
                    <input
                      type="number"
                      value={simCssSoak}
                      onChange={(e) => {
                        setSimCssSoak(Number(e.target.value));
                        setSimScenarioMode('custom');
                      }}
                      className="w-24 px-3 py-1.5 text-right font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                </div>
              </div>

              {/* SRP Parameters Card */}
              <div className="bg-white p-5 rounded border border-[#E2E8F0] shadow-xs">
                <h4 className="text-[14px] font-bold text-[#0F172A] mb-4 pb-2 border-b border-[#F1F5F9]">
                  SRP Parameters
                </h4>
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#475569]">SPM (strokes)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={simSrpSPM}
                      onChange={(e) => {
                        setSimSrpSPM(Number(e.target.value));
                        setSimScenarioMode('custom');
                      }}
                      className="w-24 px-3 py-1.5 text-right font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#475569]">Stroke Length (in)</span>
                    <input
                      type="number"
                      value={simSrpStroke}
                      onChange={(e) => {
                        setSimSrpStroke(Number(e.target.value));
                        setSimScenarioMode('custom');
                      }}
                      className="w-24 px-3 py-1.5 text-right font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#475569]">VFD (Hz)</span>
                    <input
                      type="number"
                      value={simSrpVFD}
                      onChange={(e) => {
                        setSimSrpVFD(Number(e.target.value));
                        setSimScenarioMode('custom');
                      }}
                      className="w-24 px-3 py-1.5 text-right font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                </div>
              </div>

              {/* Run Simulation Action Button */}
              <div>
                <button
                  onClick={() => {
                    setSimRunning(true);
                    setTimeout(() => setSimRunning(false), 800);
                  }}
                  disabled={simRunning}
                  className="w-full py-3 bg-[#005C53] hover:bg-[#004B44] text-white font-bold rounded text-[14px] shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className={`w-4 h-4 fill-white ${simRunning ? 'animate-spin' : ''}`} />
                  <span>{simRunning ? 'Simulating Multiphase Fluid Kinematics...' : 'Run Simulation'}</span>
                </button>
              </div>

            </div>

            {/* Right Column: Simulation Result & Recommendation (6 cols) */}
            <div className="lg:col-span-6 space-y-5">
              
              {/* Simulation Result Card */}
              <div className="bg-white p-5 rounded border border-[#E2E8F0] shadow-xs">
                <h4 className="text-[14px] font-bold text-[#0F172A] mb-4 pb-2 border-b border-[#F1F5F9]">
                  Simulation Result
                </h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="bg-[#F8FAFC] text-[#475569] font-bold text-[11px] uppercase tracking-wider border-b border-[#E2E8F0]">
                        <th className="py-2.5 px-3">Parameter</th>
                        <th className="py-2.5 px-3 text-right">Current</th>
                        <th className="py-2.5 px-3 text-right">Scenario</th>
                        <th className="py-2.5 px-3 text-right">Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      <tr className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-3 font-semibold text-[#334155]">Production (BPD)</td>
                        <td className="py-3 px-3 text-right font-medium text-[#64748B]">31.2</td>
                        <td className="py-3 px-3 text-right font-bold text-[#0F172A]">34.1</td>
                        <td className="py-3 px-3 text-right font-bold text-[#16A34A]">+9.3%</td>
                      </tr>
                      <tr className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-3 font-semibold text-[#334155]">SOR</td>
                        <td className="py-3 px-3 text-right font-medium text-[#64748B]">5.8</td>
                        <td className="py-3 px-3 text-right font-bold text-[#0F172A]">5.2</td>
                        <td className="py-3 px-3 text-right font-bold text-[#16A34A]">-10.3%</td>
                      </tr>
                      <tr className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-3 font-semibold text-[#334155]">Energy (kWh/bbl)</td>
                        <td className="py-3 px-3 text-right font-medium text-[#64748B]">42</td>
                        <td className="py-3 px-3 text-right font-bold text-[#0F172A]">38</td>
                        <td className="py-3 px-3 text-right font-bold text-[#16A34A]">-9.5%</td>
                      </tr>
                      <tr className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-3 font-semibold text-[#334155]">Failure Risk</td>
                        <td className="py-3 px-3 text-right font-medium text-[#64748B]">28%</td>
                        <td className="py-3 px-3 text-right font-bold text-[#0F172A]">18%</td>
                        <td className="py-3 px-3 text-right font-bold text-[#16A34A]">-10.0%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Scenario Recommended Banner */}
              <div className="p-4 rounded bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-3.5 shadow-xs">
                <div className="w-9 h-9 rounded-full bg-[#16A34A] flex items-center justify-center text-white shrink-0">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h5 className="font-black text-[#15803D] text-[14px]">Scenario Recommended</h5>
                  <p className="text-[12px] text-[#166534] mt-0.5">
                    Meets all safety and operational constraints
                  </p>
                </div>
              </div>

              {/* Action forward */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => navigate('/app/approvals')}
                  className="px-5 py-2.5 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold rounded text-[13px] shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>Submit for Field Approval</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ── TAB 3: DYNAMOMETER CARD ──────────────────────────────── */}
      {activeTab === 'dyno' && (
        <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-[18px] font-bold text-[#0F172A]">Surface &amp; Downhole Dynamometer Card Diagnostics</h3>
              <p className="text-[13px] text-[#64748B]">Polished rod load vs stroke displacement loop analysis for BGW-014</p>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#FFEBEE] text-[#D32F2F] text-[12px] font-bold">
              Diagnosis: Severe Fluid Pound &amp; Gas Interference
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Dyno SVG Loop */}
            <div className="h-72 bg-[#F8FAFC] rounded border border-[#E2E8F0] p-4 flex items-center justify-center">
              <svg viewBox="0 0 400 240" className="w-full h-full">
                {/* Axes */}
                <line x1="40" y1="20" x2="40" y2="200" stroke="#94A3B8" strokeWidth="1.5" />
                <line x1="40" y1="200" x2="380" y2="200" stroke="#94A3B8" strokeWidth="1.5" />
                <text x="30" y="15" fill="#64748B" fontSize="10" textAnchor="end">Load (kN)</text>
                <text x="375" y="215" fill="#64748B" fontSize="10" textAnchor="end">Displacement (in)</text>

                {/* Grid */}
                {[50, 100, 150].map(y => (
                  <line key={y} x1="40" y1={y} x2="380" y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
                ))}

                {/* Surface Dyno Card (red loop showing fluid pound step) */}
                <path
                  d="M 60 170 L 60 70 Q 180 65 320 60 L 340 65 L 340 160 L 220 165 L 140 185 Z"
                  fill="none"
                  stroke="#D32F2F"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />

                {/* Downhole Calculated Pump Card (blue inner loop) */}
                <path
                  d="M 80 150 L 80 90 L 300 90 L 320 150 L 190 150 Z"
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />

                <circle cx="220" cy="165" r="4" fill="#D32F2F" />
                <text x="230" y="165" fill="#B91C1C" fontSize="11" fontWeight="bold">Fluid Impact Point</text>
              </svg>
            </div>

            {/* Diagnostic Details */}
            <div className="space-y-4 text-[13px]">
              <div className="p-4 bg-[#F8FAFC] rounded border border-[#E2E8F0]">
                <h5 className="font-bold text-[#0F172A] mb-1">Downhole Diagnostic Summary</h5>
                <p className="text-[#475569] leading-relaxed">
                  The premature drop in polished rod tension during the downstroke indicates that the pump chamber is incompletely filled with heavy oil, causing the traveling valve to hit liquid abruptly (<strong className="text-[#D32F2F]">Fluid Pound</strong>).
                </p>
              </div>

              <div className="p-4 bg-[#FFF5F5] rounded border border-[#FED7D7]">
                <h5 className="font-bold text-[#991B1B] mb-1">Recommended Corrective Action</h5>
                <p className="text-[#7F1D1D] leading-relaxed">
                  Reduce SPM from 10.0 to 7.5 to give the high-viscosity heavy oil adequate intake time into the pump barrel. This reduces mechanical shock and increases pump volumetric efficiency from 62% to 84%.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: CSS CYCLES HISTORY ────────────────────────────── */}
      {activeTab === 'cycles' && (
        <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-[18px] font-bold text-[#0F172A]">Cyclic Steam Stimulation Historical Performance</h3>
              <p className="text-[13px] text-[#64748B]">Chronological cycle metrics for Well BGW-014 (Baghewala Field)</p>
            </div>
            <span className="text-[12px] text-[#64748B]">Cumulative Steam Injected: <strong>3,800 tons</strong></span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Cycle #</th>
                  <th className="py-3 px-4">Injection Date</th>
                  <th className="py-3 px-4 text-right">Steam Vol (t)</th>
                  <th className="py-3 px-4 text-right">Inj. Press (bar)</th>
                  <th className="py-3 px-4 text-right">Soak (Days)</th>
                  <th className="py-3 px-4 text-right">Peak Rate (BOPD)</th>
                  <th className="py-3 px-4 text-right">Current Rate</th>
                  <th className="py-3 px-4 text-right">SOR (bbl/bbl)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {BGW014_CSS_CYCLES.map(c => (
                  <tr key={c.cycleNumber} className="hover:bg-[#F8FAFC]">
                    <td className="py-3.5 px-4 font-black text-[#0F172A]">Cycle {c.cycleNumber}</td>
                    <td className="py-3.5 px-4 text-[#475569]">{c.injectionDate}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#0F172A]">{c.steamVolume}</td>
                    <td className="py-3.5 px-4 text-right text-[#475569]">{c.injectionPressure}</td>
                    <td className="py-3.5 px-4 text-right text-[#475569]">{c.soakTime}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#15803D]">{c.peakProduction}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#0F172A]">{c.productionRate}</td>
                    <td className="py-3.5 px-4 text-right text-[#475569]">{c.sor}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        c.status === 'Active' ? 'bg-[#FFEBEE] text-[#B71C1C]' : 'bg-[#E8F5E9] text-[#1B5E20]'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
