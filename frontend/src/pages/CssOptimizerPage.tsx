import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Flame, Check, RotateCcw, ArrowRight, Zap, Droplets, 
  Activity, ShieldCheck, Thermometer
} from 'lucide-react';

export const CssOptimizerPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedWell, setSelectedWell] = useState('BGW-014');

  // Slider state matching Screenshot 5
  const [steamVol, setSteamVol] = useState<number>(735);
  const [pressure, setPressure] = useState<number>(21);
  const [soakTime, setSoakTime] = useState<number>(64);
  const [cutoffDays, setCutoffDays] = useState<number>(14);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleReset = () => {
    setSteamVol(800);
    setPressure(22);
    setSoakTime(72);
    setCutoffDays(15);
    setStatusMsg('Parameters restored to baseline cycle data.');
  };

  const handleRunOptimization = () => {
    setIsOptimizing(true);
    setStatusMsg('');
    setTimeout(() => {
      setSteamVol(735);
      setPressure(21);
      setSoakTime(64);
      setCutoffDays(14);
      setIsOptimizing(false);
      setStatusMsg('Optimal thermal penetration profile calculated (Confidence: 87%).');
    }, 600);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-white min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">Oil India Limited · Thermal EOR Optimization</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            Cyclic Steam Stimulation (CSS) Parameter Optimization
          </h1>
          <p className="text-[14px] text-[#64748B] mt-0.5">
            Reservoir thermal soak duration, steam enthalpy management, and Steam-to-Oil Ratio (SOR) minimization
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

      {/* ── Well Selector Dropdown (Screenshot 5 Top Left) ─────────── */}
      <div className="w-56">
        <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Select Well</label>
        <select
          value={selectedWell}
          onChange={(e) => setSelectedWell(e.target.value)}
          className="w-full px-3.5 py-2 bg-white border border-[#CBD5E1] rounded text-[15px] font-bold text-[#0F172A] shadow-xs focus:outline-none focus:border-[#005C53] cursor-pointer"
        >
          <option value="BGW-014">BGW-014</option>
          <option value="BGW-007">BGW-007</option>
          <option value="BGW-021">BGW-021</option>
          <option value="BGW-003">BGW-003</option>
          <option value="BGW-005">BGW-005</option>
          <option value="BGW-001">BGW-001</option>
        </select>
      </div>

      {/* ── Main 2-Column Grid (Exact Match to Screenshot 5) ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Sliders & CSS Parameter Tuning (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <span className="text-[14px] font-bold text-[#475569]">Current Parameters</span>
            <span className="text-[14px] font-bold text-[#0F172A]">Optimized Parameters</span>
          </div>

          {/* Parameter 1: Steam Volume (ton) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#334155]">Steam Volume (ton)</span>
              <div className="flex items-center gap-6">
                <span className="text-[13px] text-[#64748B] font-medium">800</span>
                <input
                  type="number"
                  value={steamVol}
                  onChange={(e) => setSteamVol(Number(e.target.value))}
                  className="w-16 px-2.5 py-1 text-center font-bold text-[#0F172A] bg-white border border-[#CBD5E1] rounded shadow-xs focus:outline-none focus:border-[#005C53]"
                />
              </div>
            </div>
            <input
              type="range"
              min="500"
              max="1200"
              step="5"
              value={steamVol}
              onChange={(e) => setSteamVol(Number(e.target.value))}
              className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#0284C7]"
            />
          </div>

          {/* Parameter 2: Injection Pressure (bar) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#334155]">Injection Pressure (bar)</span>
              <div className="flex items-center gap-6">
                <span className="text-[13px] text-[#64748B] font-medium">22</span>
                <input
                  type="number"
                  value={pressure}
                  onChange={(e) => setPressure(Number(e.target.value))}
                  className="w-16 px-2.5 py-1 text-center font-bold text-[#0F172A] bg-white border border-[#CBD5E1] rounded shadow-xs focus:outline-none focus:border-[#005C53]"
                />
              </div>
            </div>
            <input
              type="range"
              min="15"
              max="30"
              step="0.5"
              value={pressure}
              onChange={(e) => setPressure(Number(e.target.value))}
              className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#0284C7]"
            />
          </div>

          {/* Parameter 3: Soak Time (hr) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#334155]">Soak Time (hr)</span>
              <div className="flex items-center gap-6">
                <span className="text-[13px] text-[#64748B] font-medium">72</span>
                <input
                  type="number"
                  value={soakTime}
                  onChange={(e) => setSoakTime(Number(e.target.value))}
                  className="w-16 px-2.5 py-1 text-center font-bold text-[#0F172A] bg-white border border-[#CBD5E1] rounded shadow-xs focus:outline-none focus:border-[#005C53]"
                />
              </div>
            </div>
            <input
              type="range"
              min="24"
              max="120"
              step="2"
              value={soakTime}
              onChange={(e) => setSoakTime(Number(e.target.value))}
              className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#0284C7]"
            />
          </div>

          {/* Parameter 4: Production Cutoff (days) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#334155]">Production Cutoff (days)</span>
              <div className="flex items-center gap-6">
                <span className="text-[13px] text-[#64748B] font-medium">15</span>
                <input
                  type="number"
                  value={cutoffDays}
                  onChange={(e) => setCutoffDays(Number(e.target.value))}
                  className="w-16 px-2.5 py-1 text-center font-bold text-[#0F172A] bg-white border border-[#CBD5E1] rounded shadow-xs focus:outline-none focus:border-[#005C53]"
                />
              </div>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={cutoffDays}
              onChange={(e) => setCutoffDays(Number(e.target.value))}
              className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#0284C7]"
            />
          </div>

          {statusMsg && (
            <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded text-[12px] text-[#15803D] font-medium">
              {statusMsg}
            </div>
          )}

          {/* Buttons: Reset & Run Optimization (Screenshot 5 Matching) */}
          <div className="flex items-center justify-between pt-4 border-t border-[#F1F5F9]">
            <button
              onClick={handleReset}
              className="px-6 py-2.5 bg-white border border-[#CBD5E1] rounded text-[13px] font-bold text-[#334155] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
            >
              Reset
            </button>

            <button
              onClick={handleRunOptimization}
              disabled={isOptimizing}
              className="px-8 py-2.5 bg-[#005C53] hover:bg-[#004B44] text-white rounded text-[13px] font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Zap className={`w-4 h-4 fill-white ${isOptimizing ? 'animate-spin' : ''}`} />
              <span>{isOptimizing ? 'Optimizing...' : 'Run Optimization'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Expected Impact (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-xs space-y-4">
            <h3 className="text-[16px] font-black text-[#0F172A] pb-3 border-b border-[#F1F5F9]">
              Expected Impact
            </h3>

            <div className="space-y-3 text-[14px]">
              <div className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                <span className="font-semibold text-[#475569]">Production</span>
                <span className="font-black text-[#16A34A] text-[15px]">+14.2%</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                <span className="font-semibold text-[#475569]">SOR</span>
                <span className="font-black text-[#16A34A] text-[15px]">-10.6%</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                <span className="font-semibold text-[#475569]">Energy Consumption</span>
                <span className="font-black text-[#16A34A] text-[15px]">-8.1%</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                <span className="font-semibold text-[#475569]">Steam Usage</span>
                <span className="font-black text-[#16A34A] text-[15px]">-8.2%</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-semibold text-[#475569]">Cycle Efficiency</span>
                <span className="font-black text-[#16A34A] text-[15px]">+11.4%</span>
              </div>
            </div>
          </div>

          {/* Within Safe Operating Limits Banner (Screenshot 5 Bottom Right) */}
          <div className="bg-[#F0FDF4] p-5 rounded-lg border border-[#BBF7D0] shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#16A34A] flex items-center justify-center text-white shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <h4 className="font-black text-[#15803D] text-[14px]">Within safe operating limits</h4>
                <p className="text-[12px] text-[#166534] mt-0.5">Confidence: 87%</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate('/app/approvals')}
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
