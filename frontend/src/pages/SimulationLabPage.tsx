import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Check, ArrowRight, RotateCcw, Cpu, Layers, 
  Settings, Zap, BarChart2, ShieldCheck
} from 'lucide-react';

export const SimulationLabPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedWell, setSelectedWell] = useState('BGW-014');
  const [scenarioName, setScenarioName] = useState('Optimized Cycle 01');
  const [scenarioMode, setScenarioMode] = useState<'current' | 'optimized' | 'custom'>('optimized');

  // Simulation Parameters state (Screenshot 4)
  const [steamVol, setSteamVol] = useState<number>(735);
  const [pressure, setPressure] = useState<number>(21);
  const [soakTime, setSoakTime] = useState<number>(64);
  const [spm, setSpm] = useState<number>(5.1);
  const [strokeLength, setStrokeLength] = useState<number>(66);
  const [vfd, setVfd] = useState<number>(36);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Switch scenario preset
  const handleSelectMode = (mode: 'current' | 'optimized' | 'custom') => {
    setScenarioMode(mode);
    if (mode === 'current') {
      setSteamVol(800);
      setPressure(22);
      setSoakTime(72);
      setSpm(5.5);
      setStrokeLength(68);
      setVfd(38);
      setScenarioName('Baseline Cycle');
    } else if (mode === 'optimized') {
      setSteamVol(735);
      setPressure(21);
      setSoakTime(64);
      setSpm(5.1);
      setStrokeLength(66);
      setVfd(36);
      setScenarioName('Optimized Cycle 01');
    }
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, 700);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#F4F6F8] min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
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
            onClick={() => navigate('/app/digital-twin')}
            className="px-3.5 py-2 bg-white border border-[#CBD5E1] rounded text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] shadow-xs transition-colors cursor-pointer"
          >
            Wellbore Twin →
          </button>
        </div>
      </div>

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
              <option value="BGW-014">BGW-014</option>
              <option value="BGW-007">BGW-007</option>
              <option value="BGW-021">BGW-021</option>
              <option value="BGW-003">BGW-003</option>
              <option value="BGW-005">BGW-005</option>
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
            Current
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
              CSS Parameters
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
              SRP Parameters
            </h4>
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#475569]">SPM (strokes)</span>
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
                <span className="text-[13px] font-semibold text-[#475569]">VFD (Hz)</span>
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

          {/* Run Simulation Action Button (Screenshot 4 Matching) */}
          <div>
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="w-full py-3 bg-[#005C53] hover:bg-[#004B44] text-white font-bold rounded-lg text-[14px] shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className={`w-4 h-4 fill-white ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Simulating Dynamic Multiphase Reservoir Kinematics...' : 'Run Simulation'}</span>
            </button>
          </div>

        </div>

        {/* Right Column: Simulation Result & Scenario Recommendation (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          
          {/* Simulation Result Table Card */}
          <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs">
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

          {/* Scenario Recommended Banner (Screenshot 4 Bottom Right) */}
          <div className="p-4 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-3.5 shadow-xs">
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

          {/* Action forward to Engineering Approvals */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => navigate('/app/approvals')}
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
