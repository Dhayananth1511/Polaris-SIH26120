import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sliders, Activity, Check, RotateCcw, ArrowRight, Gauge, 
  CheckCircle2, AlertTriangle, ShieldCheck, Zap
} from 'lucide-react';

export const SrpOptimizerPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedWell, setSelectedWell] = useState('BGW-014');
  
  // Slider state matching Screenshot 3
  const [spm, setSpm] = useState<number>(5.1);
  const [strokeLength, setStrokeLength] = useState<number>(66);
  const [vfd, setVfd] = useState<number>(36);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleReset = () => {
    setSpm(5.5);
    setStrokeLength(68);
    setVfd(38);
    setStatusMessage('Parameters reset to current baseline.');
  };

  const handleRunOptimization = () => {
    setIsOptimizing(true);
    setStatusMessage('');
    setTimeout(() => {
      setSpm(5.1);
      setStrokeLength(66);
      setVfd(36);
      setIsOptimizing(false);
      setStatusMessage('Optimal kinematically balanced setpoints converged (Confidence: 89%).');
    }, 600);
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

      {/* ── Well Selector Dropdown (Screenshot 3 Top Left) ─────────── */}
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
          <option value="BGW-010">BGW-010</option>
          <option value="BGW-001">BGW-001</option>
        </select>
      </div>

      {/* ── Main 2-Column Grid (Exact Match to Screenshot 3) ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Sliders & Parameter Tuning (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <span className="text-[14px] font-bold text-[#475569]">Current Parameters</span>
            <span className="text-[14px] font-bold text-[#0F172A]">Optimized Parameters</span>
          </div>

          {/* Parameter 1: SPM (strokes/min) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#334155]">SPM (strokes/min)</span>
              <div className="flex items-center gap-6">
                <span className="text-[13px] text-[#64748B] font-medium">5.5</span>
                <input
                  type="number"
                  step="0.1"
                  value={spm}
                  onChange={(e) => setSpm(Number(e.target.value))}
                  className="w-16 px-2.5 py-1 text-center font-bold text-[#0F172A] bg-white border border-[#CBD5E1] rounded shadow-xs focus:outline-none focus:border-[#005C53]"
                />
              </div>
            </div>
            <input
              type="range"
              min="3"
              max="12"
              step="0.1"
              value={spm}
              onChange={(e) => setSpm(Number(e.target.value))}
              className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#0284C7]"
            />
          </div>

          {/* Parameter 2: Stroke Length (in) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#334155]">Stroke Length (in)</span>
              <div className="flex items-center gap-6">
                <span className="text-[13px] text-[#64748B] font-medium">68</span>
                <input
                  type="number"
                  value={strokeLength}
                  onChange={(e) => setStrokeLength(Number(e.target.value))}
                  className="w-16 px-2.5 py-1 text-center font-bold text-[#0F172A] bg-white border border-[#CBD5E1] rounded shadow-xs focus:outline-none focus:border-[#005C53]"
                />
              </div>
            </div>
            <input
              type="range"
              min="40"
              max="100"
              step="1"
              value={strokeLength}
              onChange={(e) => setStrokeLength(Number(e.target.value))}
              className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#0284C7]"
            />
          </div>

          {/* Parameter 3: VFD (Hz) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#334155]">VFD (Hz)</span>
              <div className="flex items-center gap-6">
                <span className="text-[13px] text-[#64748B] font-medium">38</span>
                <input
                  type="number"
                  value={vfd}
                  onChange={(e) => setVfd(Number(e.target.value))}
                  className="w-16 px-2.5 py-1 text-center font-bold text-[#0F172A] bg-white border border-[#CBD5E1] rounded shadow-xs focus:outline-none focus:border-[#005C53]"
                />
              </div>
            </div>
            <input
              type="range"
              min="20"
              max="55"
              step="1"
              value={vfd}
              onChange={(e) => setVfd(Number(e.target.value))}
              className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#0284C7]"
            />
          </div>

          {statusMessage && (
            <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded text-[12px] text-[#15803D] font-medium">
              {statusMessage}
            </div>
          )}

          {/* Buttons: Reset & Run Optimization (Screenshot 3 Matching) */}
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

            <div className="space-y-3.5 text-[14px]">
              <div className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                <span className="font-semibold text-[#475569]">Pump Efficiency</span>
                <span className="font-black text-[#16A34A] text-[15px]">+6.2%</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                <span className="font-semibold text-[#475569]">Rod Loading</span>
                <span className="font-black text-[#16A34A] text-[15px]">-11.0%</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                <span className="font-semibold text-[#475569]">Failure Risk</span>
                <span className="font-black text-[#16A34A] text-[15px]">-18.4%</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-semibold text-[#475569]">Energy Consumption</span>
                <span className="font-black text-[#16A34A] text-[15px]">-7.6%</span>
              </div>
            </div>
          </div>

          {/* Within Equipment Limits Banner (Screenshot 3 Bottom Right) */}
          <div className="bg-[#F0FDF4] p-5 rounded-lg border border-[#BBF7D0] shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#16A34A] flex items-center justify-center text-white shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <h4 className="font-black text-[#15803D] text-[14px]">Within equipment limits</h4>
                <p className="text-[12px] text-[#166534] mt-0.5">Confidence: 89%</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate('/app/approvals')}
              className="w-full py-3 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold rounded text-[13px] shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Submit to Field Manager for Approval</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
