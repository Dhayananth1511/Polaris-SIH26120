import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Activity, Sliders, Zap, CheckCircle2, Play, 
  RotateCcw, Info, ArrowRight, ArrowLeft, Check, Layers, Eye, Maximize2
} from 'lucide-react';
import { DigitalTwin3DCanvas } from '../components/digitaltwin/DigitalTwin3DCanvas';
import { BGW014_CSS_CYCLES, BGW014_SRP } from '../data/mockData';

interface DigitalTwinProps {
  tab?: 'twin' | 'simulation';
}

export const DigitalTwinPage: React.FC<DigitalTwinProps> = ({ tab = 'twin' }) => {
  const navigate = useNavigate();
  const [selectedSubsystem, setSelectedSubsystem] = useState<'reservoir' | 'wellbore' | 'srp' | 'surface'>('reservoir');
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [activeSecondaryTab, setActiveSecondaryTab] = useState<'twin' | 'simulation' | 'dyno' | 'cycles'>(
    tab === 'simulation' ? 'simulation' : 'twin'
  );

  // Simulation Lab & CSS/SRP Coupled State
  const [simCssSteam, setSimCssSteam] = useState<number>(735);
  const [simCssPressure, setSimCssPressure] = useState<number>(21);
  const [simCssSoak, setSimCssSoak] = useState<number>(64);
  const [simSrpSPM, setSimSrpSPM] = useState<number>(5.1);
  const [simSrpStroke, setSimSrpStroke] = useState<number>(66);
  const [simSrpVFD, setSimSrpVFD] = useState<number>(36);
  const [cssPhase, setCssPhase] = useState<'injection' | 'soak' | 'production'>('production');
  const [simRunning, setSimRunning] = useState<boolean>(false);

  // Subsystem Telemetry Data (Matching Panel 5)
  const subsystemTelemetry = {
    reservoir: {
      metrics: [
        { label: 'Temperature', value: '82 °C', status: 'Optimal' },
        { label: 'Pressure', value: '18.4 bar', status: 'Stable' },
        { label: 'Viscosity', value: '430 cP', status: 'Mobilized' },
        { label: 'Steam Penetration', value: '68 %', status: 'Radial 42m' },
        { label: 'Oil Saturation', value: '0.32', status: 'Pay Zone A' },
      ],
      description: 'Baghewala Sand Member A · Steam injection chamber active at 852m MD',
    },
    wellbore: {
      metrics: [
        { label: 'Casing Pressure', value: '14.2 bar', status: 'Nominal' },
        { label: 'Tubing Head Temp', value: '71 °C', status: 'Continuous' },
        { label: 'Rod Load Tension', value: '6.3 kN', status: 'High Warning' },
        { label: 'True Pump Depth', value: '852 m', status: 'Perforated' },
        { label: 'Stroke Length', value: '66 in', status: 'Polished Rod' },
      ],
      description: '9-5/8" Casing String & 3-1/2" Production Tubing with sucker rod string',
    },
    srp: {
      metrics: [
        { label: 'Pumping Speed', value: '5.1 SPM', status: 'Optimized' },
        { label: 'Polished Rod Load', value: '6.3 kN', status: 'High Load' },
        { label: 'Motor Power Draw', value: '18.5 kW', status: 'Normal' },
        { label: 'Gearbox Torque', value: '78 %', status: 'Within Limits' },
        { label: 'Pump Efficiency', value: '62 %', status: 'Fluid Pound' },
      ],
      description: 'Surface Walking Beam Unit with dynamic counterweights and carrier bar',
    },
    surface: {
      metrics: [
        { label: 'Wellhead Pressure', value: '4.8 bar', status: 'Flowline' },
        { label: 'Flowline Temp', value: '68 °C', status: 'Manifold' },
        { label: 'VFD Frequency', value: '36.0 Hz', status: 'Regulated' },
        { label: 'Motor Vibration', value: '1.2 mm/s', status: 'Acceptable' },
        { label: 'Gas-Oil Ratio', value: '12 m³/m³', status: 'Low Gas' },
      ],
      description: 'Surface skid pad, wellhead Christmas tree, master valve, and VFD controller',
    },
  };

  const currentParams = subsystemTelemetry[selectedSubsystem];

  return (
    <div className="p-6 md:p-8 space-y-6 bg-white min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header (OIL INDIA LIMITED | Digital Twin) ───────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-[12px] font-bold text-[#64748B] hover:text-[#D32F2F] transition-colors cursor-pointer mr-2"
              title="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <span className="text-[#CBD5E1]">|</span>
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">
              OIL INDIA LIMITED
            </span>
            <span className="text-[#94A3B8]">|</span>
            <span className="text-[12px] font-bold tracking-wider text-[#64748B] uppercase">
              Digital Twin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
              BGW-014
            </h1>
            <span className="text-lg text-[#64748B] font-medium">|</span>
            <h2 className="text-xl font-bold text-[#0F172A]">Live Digital Twin</h2>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#1B5E20] text-[12px] font-bold border border-[#A5D6A7]">
              <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
              Live Data
            </span>
          </div>
          <p className="text-[14px] text-[#64748B] mt-1">
            Real-time coupled physics model for heavy oil Cyclic Steam Stimulation (CSS) &amp; Sucker Rod Pump (SRP)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] rounded text-[13px] font-bold shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#D32F2F]" />
            <span>Back</span>
          </button>
          <button
            onClick={() => setIs3DMode(!is3DMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded text-[13px] font-bold shadow-sm transition-all cursor-pointer ${
              is3DMode
                ? 'bg-[#005C53] hover:bg-[#004B44] text-white'
                : 'bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>3D View</span>
          </button>
          <button
            onClick={() => navigate('/app/simulation-lab')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] rounded text-[13px] font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-[#D32F2F]" />
            <span>Simulation Lab</span>
          </button>
          <button
            onClick={() => navigate('/app/joint-optimizer')}
            className="flex items-center gap-2 px-4 py-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded text-[13px] font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>Optimize Well</span>
          </button>
        </div>
      </div>

      {/* ── Sub-Navigation Tabs ──────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 text-[14px]">
        {[
          { key: 'twin', label: '3D CAD Digital Twin & Thermal Profile' },
          { key: 'simulation', label: 'What-If Physics Simulator' },
          { key: 'dyno', label: 'Downhole Dynamometer Card' },
          { key: 'cycles', label: 'CSS Thermal Cycle History' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveSecondaryTab(t.key as any)}
            className={`px-4 py-2 font-bold rounded-t transition-all cursor-pointer ${
              activeSecondaryTab === t.key
                ? 'border-b-2 border-[#D32F2F] text-[#D32F2F] bg-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── MAIN TAB: DIGITAL TWIN (Matching Panel 5 in Design) ──── */}
      {activeSecondaryTab === 'twin' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left / Center 3D Model Area (7 cols or 8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#D32F2F]" />
                  <h3 className="text-[15px] font-bold text-[#0F172A]">
                    Photorealistic CAD Digital Twin — Rajasthan Heavy Oil Formation
                  </h3>
                </div>
                <span className="text-[12px] text-[#64748B] font-medium">
                  Baghewala Field · Spud Depth: 852 m
                </span>
              </div>

              {/* 3D Canvas Viewport */}
              <DigitalTwin3DCanvas
                activeComponent={selectedSubsystem}
                onComponentSelect={(c) => setSelectedSubsystem(c)}
                spm={simSrpSPM}
                strokeLength={simSrpStroke}
                isPumping={true}
                cssSteam={simCssSteam}
                cssPressure={simCssPressure}
                cssSoak={simCssSoak}
                cssPhase={cssPhase}
                onCssPhaseChange={setCssPhase}
                onBack={() => navigate(-1)}
              />
            </div>
          </div>

          {/* Right Inspection & Thermal Profile Panel (4 cols) (Matching Panel 5) */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Sub-Component Selector Tabs */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 space-y-4">
              <div className="grid grid-cols-4 gap-1 bg-[#F1F5F9] p-1 rounded-lg">
                {[
                  { key: 'reservoir', label: 'Reservoir' },
                  { key: 'wellbore',  label: 'Wellbore' },
                  { key: 'srp',       label: 'SRP' },
                  { key: 'surface',   label: 'Surface' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedSubsystem(tab.key as any)}
                    className={`py-2 text-[12px] font-bold rounded-md transition-all cursor-pointer ${
                      selectedSubsystem === tab.key
                        ? 'bg-white text-[#0F172A] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Component Specific Live Parameters Table */}
              <div className="space-y-3 pt-1">
                <div className="text-[12px] text-[#64748B] pb-2 border-b border-[#F1F5F9]">
                  {currentParams.description}
                </div>

                <div className="space-y-2.5">
                  {currentParams.metrics.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1.5 border-b border-[#F8FAFC]">
                      <span className="text-[13px] font-semibold text-[#475569]">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-black text-[#0F172A]">{item.value}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Coupled Simulation Controls (CSS & SRP) */}
              <div className="pt-3 border-t border-[#F1F5F9] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F172A]">
                    Live Coupled Controls (CSS + SRP)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-[#E0F2FE] text-[#0369A1]">
                    3D Synchronized
                  </span>
                </div>

                {/* CSS Phase Selector */}
                <div className="grid grid-cols-3 gap-1 bg-[#F8FAFC] p-1 rounded border border-[#E2E8F0] text-[11px]">
                  <button
                    onClick={() => setCssPhase('injection')}
                    className={`py-1 font-bold rounded transition-colors cursor-pointer ${
                      cssPhase === 'injection' ? 'bg-[#0284C7] text-white' : 'text-[#64748B]'
                    }`}
                  >
                    Injection
                  </button>
                  <button
                    onClick={() => setCssPhase('soak')}
                    className={`py-1 font-bold rounded transition-colors cursor-pointer ${
                      cssPhase === 'soak' ? 'bg-[#EA580C] text-white' : 'text-[#64748B]'
                    }`}
                  >
                    Soak
                  </button>
                  <button
                    onClick={() => setCssPhase('production')}
                    className={`py-1 font-bold rounded transition-colors cursor-pointer ${
                      cssPhase === 'production' ? 'bg-[#16A34A] text-white' : 'text-[#64748B]'
                    }`}
                  >
                    Production
                  </button>
                </div>

                {/* Sliders that immediately update 3D model */}
                <div className="space-y-2 text-[12px]">
                  <div>
                    <div className="flex justify-between text-[#475569] font-medium">
                      <span>CSS Steam Volume</span>
                      <strong className="text-[#0284C7]">{simCssSteam} tons</strong>
                    </div>
                    <input
                      type="range"
                      min="400"
                      max="1200"
                      step="25"
                      value={simCssSteam}
                      onChange={(e) => setSimCssSteam(Number(e.target.value))}
                      className="w-full h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#0284C7]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[#475569] font-medium">
                      <span>SRP Pumping Speed</span>
                      <strong className="text-[#D32F2F]">{simSrpSPM} SPM</strong>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      step="0.1"
                      value={simSrpSPM}
                      onChange={(e) => setSimSrpSPM(Number(e.target.value))}
                      className="w-full h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#D32F2F]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Thermal Profile Depth Chart (Matching Panel 5) */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                <div>
                  <h4 className="text-[14px] font-bold text-[#0F172A]">Thermal Profile</h4>
                  <p className="text-[11px] text-[#64748B]">Depth-dependent thermal dissipation &amp; viscosity curve</p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-[#0284C7]">
                    <span className="w-2.5 h-0.5 bg-[#0284C7] rounded" /> Temperature
                  </span>
                  <span className="flex items-center gap-1 text-[#EA580C]">
                    <span className="w-2.5 h-0.5 bg-[#EA580C] rounded" /> Viscosity
                  </span>
                </div>
              </div>

              {/* Depth Profile Chart (Y: Depth 0 to 1000m MD, X: Value 0 to 600) */}
              <div className="h-64 relative bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] p-3">
                <svg viewBox="0 0 320 220" className="w-full h-full">
                  {/* Grid Lines */}
                  {[30, 70, 110, 150, 190].map((y, i) => (
                    <g key={i}>
                      <line x1="45" y1={y} x2="300" y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
                      <text x="38" y={y + 3} textAnchor="end" fontSize="9" fill="#94A3B8" fontWeight="600">
                        {i * 200 + 200}
                      </text>
                    </g>
                  ))}
                  <text x="38" y="24" textAnchor="end" fontSize="9" fill="#94A3B8" fontWeight="600">0</text>
                  <text x="18" y="115" transform="rotate(-90, 18, 115)" textAnchor="middle" fontSize="10" fill="#64748B" fontWeight="bold">
                    Depth (m)
                  </text>

                  {/* X Axis Values */}
                  {[0, 200, 400, 600].map((v, i) => (
                    <g key={i}>
                      <text x={45 + i * 85} y="208" textAnchor="middle" fontSize="9" fill="#94A3B8" fontWeight="600">
                        {v}
                      </text>
                    </g>
                  ))}
                  <text x="175" y="218" textAnchor="middle" fontSize="10" fill="#64748B" fontWeight="bold">
                    Value
                  </text>

                  {/* Axes */}
                  <line x1="45" y1="20" x2="45" y2="195" stroke="#94A3B8" strokeWidth="1.5" />
                  <line x1="45" y1="195" x2="300" y2="195" stroke="#94A3B8" strokeWidth="1.5" />

                  {/* Temperature Curve (Blue Line) - warming down into reservoir */}
                  {/* Depth 0: 32C (x=45+13), Depth 200: 42C, Depth 400: 51C, Depth 600: 64C, Depth 800: 78C, Depth 852: 82C (x=45+35) */}
                  <path
                    d="M 58 25 Q 65 60 72 100 T 95 160 Q 110 180 135 190"
                    fill="none"
                    stroke="#0284C7"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="135" cy="190" r="3.5" fill="#0284C7" />

                  {/* Viscosity Curve (Orange Line) - high at surface, drops dramatically in thermal chamber */}
                  {/* Depth 0: 560 (x=45+238), Depth 300: 450 (x=45+191), Depth 600: 320 (x=45+136), Depth 852: 120 (x=45+51) */}
                  <path
                    d="M 283 25 C 275 60 250 100 205 140 C 160 170 120 185 85 190"
                    fill="none"
                    stroke="#EA580C"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="85" cy="190" r="3.5" fill="#EA580C" />

                  {/* Reservoir Steam Zone Marker */}
                  <rect x="45" y="170" width="255" height="25" fill="#EF4444" opacity="0.08" />
                  <text x="290" y="186" textAnchor="end" fill="#B91C1C" fontSize="9" fontWeight="bold">
                    CSS Injection Zone (852m)
                  </text>
                </svg>
              </div>

              <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-[12px] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span className="font-semibold text-[#15803D]">Optimal Viscosity Threshold Met</span>
                </div>
                <span className="font-black text-[#15803D]">430 cP</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ── TAB 2: WHAT-IF SIMULATION LABORATORY ──────────────────── */}
      {activeSecondaryTab === 'simulation' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">What-If Simulation Laboratory (CSS &amp; SRP)</h3>
              <p className="text-[13px] text-[#64748B]">Simulate thermal injection parameters and rod pumping kinematics</p>
            </div>
            <span className="px-3 py-1 bg-[#E0F2FE] text-[#0369A1] text-[12px] font-bold rounded">
              Model: Coupled Multi-Phase Viscosity Solver
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Parameters */}
            <div className="space-y-4">
              <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-3">
                <h4 className="text-[13px] font-bold text-[#0F172A] uppercase">CSS Injection Parameters</h4>
                <div className="flex items-center justify-between text-[13px]">
                  <span>Steam Volume (tons)</span>
                  <input
                    type="number"
                    value={simCssSteam}
                    onChange={(e) => setSimCssSteam(Number(e.target.value))}
                    className="w-24 px-2.5 py-1 text-right bg-white border border-[#CBD5E1] rounded font-bold"
                  />
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span>Injection Pressure (bar)</span>
                  <input
                    type="number"
                    value={simCssPressure}
                    onChange={(e) => setSimCssPressure(Number(e.target.value))}
                    className="w-24 px-2.5 py-1 text-right bg-white border border-[#CBD5E1] rounded font-bold"
                  />
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span>Soak Time (hours)</span>
                  <input
                    type="number"
                    value={simCssSoak}
                    onChange={(e) => setSimCssSoak(Number(e.target.value))}
                    className="w-24 px-2.5 py-1 text-right bg-white border border-[#CBD5E1] rounded font-bold"
                  />
                </div>
              </div>

              <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-3">
                <h4 className="text-[13px] font-bold text-[#0F172A] uppercase">SRP Operational Setpoints</h4>
                <div className="flex items-center justify-between text-[13px]">
                  <span>SPM (strokes/min)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={simSrpSPM}
                    onChange={(e) => setSimSrpSPM(Number(e.target.value))}
                    className="w-24 px-2.5 py-1 text-right bg-white border border-[#CBD5E1] rounded font-bold"
                  />
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span>Stroke Length (in)</span>
                  <input
                    type="number"
                    value={simSrpStroke}
                    onChange={(e) => setSimSrpStroke(Number(e.target.value))}
                    className="w-24 px-2.5 py-1 text-right bg-white border border-[#CBD5E1] rounded font-bold"
                  />
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span>VFD (Hz)</span>
                  <input
                    type="number"
                    value={simSrpVFD}
                    onChange={(e) => setSimSrpVFD(Number(e.target.value))}
                    className="w-24 px-2.5 py-1 text-right bg-white border border-[#CBD5E1] rounded font-bold"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  setSimRunning(true);
                  setTimeout(() => setSimRunning(false), 600);
                }}
                disabled={simRunning}
                className="w-full py-3 bg-[#005C53] hover:bg-[#004B44] text-white font-bold rounded text-[14px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className={`w-4 h-4 fill-white ${simRunning ? 'animate-spin' : ''}`} />
                <span>{simRunning ? 'Running Non-Linear Kinematics...' : 'Run Simulation'}</span>
              </button>
            </div>

            {/* Right Output Table */}
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-lg border border-[#E2E8F0] space-y-4">
                <h4 className="text-[14px] font-bold text-[#0F172A] pb-2 border-b border-[#F1F5F9]">
                  Predicted Production &amp; Operational Impact
                </h4>

                <div className="space-y-3 text-[13px]">
                  <div className="flex items-center justify-between p-2.5 bg-[#F8FAFC] rounded">
                    <span className="font-semibold text-[#475569]">Predicted Oil Rate</span>
                    <span className="text-base font-black text-[#15803D]">34.1 BPD (+9.3%)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-[#F8FAFC] rounded">
                    <span className="font-semibold text-[#475569]">Steam-to-Oil Ratio (SOR)</span>
                    <span className="text-base font-black text-[#15803D]">5.2 (-10.3%)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-[#F8FAFC] rounded">
                    <span className="font-semibold text-[#475569]">Energy Consumption</span>
                    <span className="text-base font-black text-[#15803D]">38 kWh/bbl (-9.5%)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-[#F8FAFC] rounded">
                    <span className="font-semibold text-[#475569]">Failure Risk Score</span>
                    <span className="text-base font-black text-[#15803D]">18% (Low Risk)</span>
                  </div>
                </div>

                <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded flex items-center gap-3">
                  <Check className="w-5 h-5 text-[#16A34A]" />
                  <div className="text-[12px]">
                    <strong className="text-[#15803D] block">Scenario Safe &amp; Recommended</strong>
                    <span className="text-[#166534]">Mechanical loads within API-11E allowable ratings</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: DYNAMOMETER CARD ──────────────────────────────── */}
      {activeSecondaryTab === 'dyno' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">Surface &amp; Downhole Dynamometer Card Diagnostics</h3>
              <p className="text-[13px] text-[#64748B]">Polished rod load vs stroke displacement loop analysis for BGW-014</p>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#FFEBEE] text-[#D32F2F] text-[12px] font-bold">
              Diagnosis: Severe Fluid Pound &amp; Gas Interference
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="h-72 bg-[#F8FAFC] rounded border border-[#E2E8F0] p-4 flex items-center justify-center">
              <svg viewBox="0 0 400 240" className="w-full h-full">
                <line x1="40" y1="20" x2="40" y2="200" stroke="#94A3B8" strokeWidth="1.5" />
                <line x1="40" y1="200" x2="380" y2="200" stroke="#94A3B8" strokeWidth="1.5" />
                <text x="30" y="15" fill="#64748B" fontSize="10" textAnchor="end">Load (kN)</text>
                <text x="375" y="215" fill="#64748B" fontSize="10" textAnchor="end">Displacement (in)</text>

                {[50, 100, 150].map(y => (
                  <line key={y} x1="40" y1={y} x2="380" y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
                ))}

                <path
                  d="M 60 170 L 60 70 Q 180 65 320 60 L 340 65 L 340 160 L 220 165 L 140 185 Z"
                  fill="none"
                  stroke="#D32F2F"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />

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

            <div className="space-y-4 text-[13px]">
              <div className="p-4 bg-[#F8FAFC] rounded border border-[#E2E8F0]">
                <h5 className="font-bold text-[#0F172A] mb-1">Downhole Diagnostic Summary</h5>
                <p className="text-[#475569] leading-relaxed">
                  Premature tension drop during downstroke indicates incomplete heavy oil pump chamber fill (<strong className="text-[#D32F2F]">Fluid Pound</strong>).
                </p>
              </div>

              <div className="p-4 bg-[#FFF5F5] rounded border border-[#FED7D7]">
                <h5 className="font-bold text-[#991B1B] mb-1">Recommended Corrective Action</h5>
                <p className="text-[#7F1D1D] leading-relaxed">
                  Reduce SPM from 10.0 to 5.1 to give viscous oil adequate intake time into pump barrel, elevating pump volumetric efficiency from 62% to 84%.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: CSS CYCLES HISTORY ────────────────────────────── */}
      {activeSecondaryTab === 'cycles' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">Cyclic Steam Stimulation Historical Performance</h3>
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
