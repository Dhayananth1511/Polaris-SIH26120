import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, AlertTriangle, Eye, Brain, CheckCircle2, 
  ArrowRight, ShieldAlert, Sliders, ChevronDown
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

interface AIIntelligencePageProps {
  module?: 'forecast' | 'failure' | 'anomaly' | 'explain';
}

// Actual vs Predicted Production Data (Matching Panel 6)
const FORECAST_DATA = [
  { date: '1 Oct',  actual: 21.2, predicted: null },
  { date: '8 Oct',  actual: 23.4, predicted: 23.0 },
  { date: '15 Oct', actual: 25.8, predicted: 26.2 },
  { date: '22 Oct', actual: 28.1, predicted: 28.5 },
  { date: '31 Oct', actual: 29.5, predicted: 31.8 },
];

// Key Factors SHAP Data (Matching Panel 6)
const SHAP_FACTORS = [
  { name: 'Steam Volume', value: 0.28, widthPct: 100 },
  { name: 'Temperature',  value: 0.24, widthPct: 85.7 },
  { name: 'Rod Load',     value: 0.18, widthPct: 64.3 },
  { name: 'SPM',          value: 0.12, widthPct: 42.8 },
  { name: 'VFD',          value: 0.08, widthPct: 28.5 },
  { name: 'Pressure',     value: 0.06, widthPct: 21.4 },
  { name: 'Water Cut',    value: 0.04, widthPct: 14.2 },
  { name: 'Others',       value: 0.02, widthPct: 7.1 },
];

export const AIIntelligencePage: React.FC<AIIntelligencePageProps> = ({ module = 'forecast' }) => {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<'forecast' | 'failure' | 'anomaly' | 'explain'>(module);
  const [selectedWell, setSelectedWell] = useState('BGW-014');

  return (
    <div className="p-6 md:p-8 space-y-6 bg-white min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header (OIL INDIA LIMITED | AI Intelligence) ────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">
              OIL INDIA LIMITED
            </span>
            <span className="text-[#94A3B8]">|</span>
            <span className="text-[12px] font-bold tracking-wider text-[#64748B] uppercase">
              AI Intelligence
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            AI Intelligence
          </h1>
          <p className="text-[14px] text-[#64748B] mt-1">
            Physics-Informed Neural Networks (PINN) &amp; XGBoost surrogate models for Baghewala Field
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/approvals')}
            className="flex items-center gap-2 px-4 py-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded text-[13px] font-bold shadow-sm transition-colors cursor-pointer"
          >
            <span>Pending Approvals</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Top Tabs Navigation (Matching Panel 6) ───────────────── */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 text-[14px]">
        {[
          { key: 'forecast', label: 'Production Forecast', icon: <TrendingUp className="w-4 h-4" /> },
          { key: 'failure',  label: 'Failure Prediction',  icon: <AlertTriangle className="w-4 h-4" /> },
          { key: 'anomaly',  label: 'Anomaly Detection',   icon: <Eye className="w-4 h-4" /> },
          { key: 'explain',  label: 'Explainability',      icon: <Brain className="w-4 h-4" /> },
        ].map(m => (
          <button
            key={m.key}
            onClick={() => setActiveModule(m.key as any)}
            className={`flex items-center gap-2 px-4 py-2 font-bold rounded-t transition-all cursor-pointer ${
              activeModule === m.key
                ? 'border-b-2 border-[#D32F2F] text-[#D32F2F] bg-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {m.icon}
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB 1: PRODUCTION FORECAST (Matching Panel 6 Exactly) ─── */}
      {activeModule === 'forecast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Production Forecast Graph & AI Insight (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-6">
              
              {/* Card Header & Well Selector */}
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                <h3 className="text-lg font-bold text-[#0F172A]">Production Forecast</h3>
                
                <div className="relative">
                  <select
                    value={selectedWell}
                    onChange={(e) => setSelectedWell(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[13px] font-bold text-[#0F172A] focus:outline-none focus:border-[#0284C7] cursor-pointer"
                  >
                    <option value="BGW-014">BGW-014</option>
                    <option value="BGW-001">BGW-001</option>
                    <option value="BGW-007">BGW-007</option>
                    <option value="BGW-021">BGW-021</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* KPI Metrics */}
              <div className="flex items-center gap-8">
                <div>
                  <span className="text-[12px] font-semibold text-[#64748B] block">Predicted Production</span>
                  <span className="text-3xl font-black text-[#16A34A] block mt-0.5">31.8 BPD</span>
                </div>
                <div className="h-10 w-px bg-[#E2E8F0]" />
                <div>
                  <span className="text-[12px] font-semibold text-[#64748B] block">Confidence</span>
                  <span className="text-3xl font-black text-[#0F172A] block mt-0.5">89%</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-[12px] font-bold">
                <span className="flex items-center gap-1.5 text-[#0284C7]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" /> Actual
                </span>
                <span className="flex items-center gap-1.5 text-[#38BDF8]">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-[#38BDF8]" /> Predicted
                </span>
              </div>

              {/* Forecast Line Chart (Matching Panel 6) */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={FORECAST_DATA} margin={{ top: 10, right: 20, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748B' }} />
                    <YAxis domain={[15, 35]} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      name="Actual" 
                      stroke="#0284C7" 
                      strokeWidth={2.5} 
                      dot={{ r: 4, fill: '#0284C7' }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="predicted" 
                      name="Predicted" 
                      stroke="#38BDF8" 
                      strokeWidth={2.5} 
                      strokeDasharray="4 4" 
                      dot={{ r: 4, fill: '#38BDF8' }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* AI Insight Box (Matching Panel 6) */}
              <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#16A34A] flex items-center justify-center text-white shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="font-black text-[#15803D] text-[14px]">AI Insight</h4>
                    <p className="text-[13px] text-[#166534] mt-0.5 leading-snug">
                      Production is expected to increase by 12.4% with the current recommendations. Key driver: higher reservoir temperature and optimized SPM.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/app/recommendations')}
                  className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold rounded-lg text-[13px] shadow-sm transition-colors whitespace-nowrap cursor-pointer shrink-0"
                >
                  View Recommendation →
                </button>
              </div>

            </div>

          </div>

          {/* Right Column: Key Factors (SHAP) (4 cols) (Matching Panel 6) */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-5">
              
              <div className="pb-3 border-b border-[#F1F5F9]">
                <h3 className="text-lg font-bold text-[#0F172A]">Key Factors (SHAP)</h3>
                <p className="text-[12px] text-[#64748B] mt-0.5">
                  Normalized relative feature attribution on production rate
                </p>
              </div>

              {/* Horizontal Bar Chart (Matching Panel 6) */}
              <div className="space-y-3.5">
                {SHAP_FACTORS.map((factor, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-semibold text-[#334155]">{factor.name}</span>
                      <span className="font-bold text-[#64748B]">{factor.value.toFixed(2)}</span>
                    </div>
                    {/* Bar track */}
                    <div className="w-full h-3.5 bg-[#F1F5F9] rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-[#38BDF8] rounded-sm transition-all duration-500"
                        style={{ width: `${factor.widthPct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-[11px] text-[#94A3B8] border-t border-[#F1F5F9]">
                Model: TreeSHAP on Gradient Boosted Regressor (v4.2)
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ── TAB 2: FAILURE PREDICTION ─────────────────────────────── */}
      {activeModule === 'failure' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">Sucker Rod Fatigue &amp; Mechanical Stress Predictor</h3>
              <p className="text-[12px] text-[#64748B]">Goodman diagram fatigue threshold and cyclic load stress analysis</p>
            </div>
            <span className="px-3 py-1 bg-[#FEE2E2] text-[#DC2626] font-bold text-[12px] rounded">
              High Overload Detected: BGW-014
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#64748B] uppercase block">Current Rod Tension</span>
              <span className="text-2xl font-black text-[#DC2626] mt-1 block">6.3 kN</span>
              <span className="text-[11px] text-[#DC2626] mt-0.5 block">+0.3 kN above safety threshold</span>
            </div>
            <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#64748B] uppercase block">Days to Predicted Failure</span>
              <span className="text-2xl font-black text-[#D97706] mt-1 block">14 Days</span>
              <span className="text-[11px] text-[#64748B] mt-0.5 block">Without SPM reduction mitigation</span>
            </div>
            <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#64748B] uppercase block">Mitigated Risk with SPM 5.1</span>
              <span className="text-2xl font-black text-[#16A34A] mt-1 block">99.2% Survival</span>
              <span className="text-[11px] text-[#16A34A] mt-0.5 block">Load decreases to 5.1 kN</span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: ANOMALY DETECTION ──────────────────────────────── */}
      {activeModule === 'anomaly' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">Real-Time Sensor Anomaly Detection</h3>
              <p className="text-[12px] text-[#64748B]">Autoencoder reconstruction error on downhole telemetry</p>
            </div>
            <span className="px-3 py-1 bg-[#FEF3C7] text-[#D97706] font-bold text-[12px] rounded">
              1 Anomaly Flagged
            </span>
          </div>

          <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="font-semibold text-[#475569]">Pattern Recognized:</span>
              <span className="font-bold text-[#DC2626]">Severe Fluid Pound Pattern</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-[#475569]">Root Cause:</span>
              <span className="font-bold text-[#0F172A]">High heavy oil viscosity at intake</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-[#475569]">Recommended Action:</span>
              <span className="font-bold text-[#16A34A]">Reduce SPM to 5.1 and adjust thermal soak</span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: EXPLAINABILITY ─────────────────────────────────── */}
      {activeModule === 'explain' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-6">
          <div className="pb-3 border-b border-[#F1F5F9]">
            <h3 className="text-lg font-bold text-[#0F172A]">Explainable AI (XAI) Model Insights</h3>
            <p className="text-[12px] text-[#64748B]">Global and local feature attributions across 23 Baghewala wells</p>
          </div>

          <div className="space-y-3 text-[13px]">
            {[
              { feature: 'Steam Volume (ton)', impact: '+0.28', desc: 'Higher injection enthalpy lowers heavy oil viscosity from 22,000 cP down to 430 cP' },
              { feature: 'Reservoir Temperature (°C)', impact: '+0.24', desc: 'Direct thermal heating of porous sand matrix accelerates drainage velocity' },
              { feature: 'Rod Load (kN)', impact: '-0.18', desc: 'Excessive rod tension induces pump slippage and rod stretch energy loss' },
              { feature: 'SPM Speed', impact: '+0.12', desc: 'Optimized stroke speed allows full barrel fill without fluid pound shock' },
            ].map((item, idx) => (
              <div key={idx} className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between">
                <div>
                  <strong className="text-[#0F172A] block">{item.feature}</strong>
                  <span className="text-[12px] text-[#64748B]">{item.desc}</span>
                </div>
                <span className={`text-[15px] font-black ${item.impact.startsWith('+') ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                  {item.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
