import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, TrendingUp, AlertTriangle, Eye, Activity, 
  BarChart2, Zap, ArrowRight, ShieldCheck, CheckCircle2
} from 'lucide-react';

interface AIIntelligencePageProps {
  module?: 'forecast' | 'failure' | 'anomaly' | 'explain';
}

export const AIIntelligencePage: React.FC<AIIntelligencePageProps> = ({ module = 'forecast' }) => {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<'forecast' | 'failure' | 'anomaly' | 'explain'>(module);
  const [selectedWell, setSelectedWell] = useState('BGW-014');

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#F4F6F8] min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">Oil India Limited · Machine Learning Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            Baghewala Heavy Oil AI Intelligence Core
          </h1>
          <p className="text-[14px] text-[#64748B] mt-0.5">
            Physics-informed machine learning for CSS thermal cycle prediction &amp; SRP dyno diagnostics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/approvals')}
            className="px-4 py-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded text-[13px] font-bold shadow-xs transition-colors cursor-pointer"
          >
            Engineering Approvals →
          </button>
        </div>
      </div>

      {/* ── AI Submodule Navigation Tabs ─────────────────────────── */}
      <div className="flex items-center gap-4 border-b border-[#E2E8F0] pb-2 text-[14px]">
        {[
          { key: 'forecast', label: 'Production Forecast', icon: <TrendingUp className="w-4 h-4" /> },
          { key: 'failure', label: 'Failure Prediction', icon: <AlertTriangle className="w-4 h-4" /> },
          { key: 'anomaly', label: 'Anomaly Detection', icon: <Eye className="w-4 h-4" /> },
          { key: 'explain', label: 'Explainability (SHAP)', icon: <Brain className="w-4 h-4" /> },
        ].map(m => (
          <button
            key={m.key}
            onClick={() => setActiveModule(m.key as any)}
            className={`flex items-center gap-2 px-4 py-2 font-bold rounded-t transition-all cursor-pointer ${
              activeModule === m.key
                ? 'border-b-2 border-[#005C53] text-[#005C53] bg-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {m.icon}
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* ── MODULE 1: PRODUCTION FORECAST ────────────────────────── */}
      {activeModule === 'forecast' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div>
                <h3 className="text-[16px] font-bold text-[#0F172A]">XGBoost 30-Day Heavy Oil Forecast vs Actuals</h3>
                <p className="text-[12px] text-[#64748B]">Trained on 5 years of Baghewala CSS cycle injection history &amp; bottomhole temperatures</p>
              </div>
              <span className="px-3 py-1 bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] font-bold text-[12px] rounded">
                Model Accuracy (R²): 0.94
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px]">
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
                <span className="text-[11px] text-[#64748B] font-bold uppercase">Forecasted 30-Day Cumulative</span>
                <div className="text-2xl font-black text-[#0F172A] mt-1">85,200 bbl</div>
                <span className="text-[11px] text-[#16A34A] font-semibold">+6,400 bbl with optimized soak</span>
              </div>
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
                <span className="text-[11px] text-[#64748B] font-bold uppercase">Mean Absolute Error (MAE)</span>
                <div className="text-2xl font-black text-[#0F172A] mt-1">1.8 BOPD</div>
                <span className="text-[11px] text-[#64748B]">Across all 23 wells</span>
              </div>
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
                <span className="text-[11px] text-[#64748B] font-bold uppercase">Thermal Decline Half-Life</span>
                <div className="text-2xl font-black text-[#0F172A] mt-1">38 Days</div>
                <span className="text-[11px] text-[#0284C7] font-semibold">Jodhpur Sandstone formation</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODULE 2: FAILURE PREDICTION ─────────────────────────── */}
      {activeModule === 'failure' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div>
                <h3 className="text-[16px] font-bold text-[#0F172A]">Sucker Rod String Overload &amp; Fatigue Predictor</h3>
                <p className="text-[12px] text-[#64748B]">Predictive mechanical stress analysis for high-viscosity rod loading</p>
              </div>
              <span className="px-3 py-1 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] font-bold text-[12px] rounded">
                2 Wells Exceeding Load Safety Margins
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#FEF2F2]/60 border border-[#FECACA] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <strong className="text-[15px] text-[#991B1B]">BGW-014 (Critical Attention)</strong>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-[#DC2626] text-white rounded">Risk: 0.68</span>
                </div>
                <p className="text-[12px] text-[#7F1D1D] mb-3">
                  Polished rod load currently at 6.3 kN against 6.0 kN nominal rating. Recommend reducing SPM from 5.5 to 5.1 immediately.
                </p>
                <button
                  onClick={() => navigate('/app/srp-optimizer')}
                  className="px-4 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[12px] font-bold rounded cursor-pointer"
                >
                  Mitigate in SRP Optimizer →
                </button>
              </div>

              <div className="p-4 bg-[#FEF2F2]/60 border border-[#FECACA] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <strong className="text-[15px] text-[#991B1B]">BGW-007 (High Load Warning)</strong>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-[#DC2626] text-white rounded">Risk: 0.72</span>
                </div>
                <p className="text-[12px] text-[#7F1D1D] mb-3">
                  Rod string stress at 7.1 kN due to heavy crude chilling below 68°C. Recommend increasing thermal soak and VFD speed reduction.
                </p>
                <button
                  onClick={() => navigate('/app/css-optimizer')}
                  className="px-4 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[12px] font-bold rounded cursor-pointer"
                >
                  Adjust Thermal Soak →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODULE 3: ANOMALY DETECTION ──────────────────────────── */}
      {activeModule === 'anomaly' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div>
                <h3 className="text-[16px] font-bold text-[#0F172A]">Dynamometer Card Classification &amp; Downhole Diagnostics</h3>
                <p className="text-[12px] text-[#64748B]">Real-time CNN classifier analyzing polished rod stroke telemetry loops</p>
              </div>
              <span className="px-3 py-1 bg-[#FEFCE8] border border-[#FEF08A] text-[#CA8A04] font-bold text-[12px] rounded">
                Fluid Pound Detected
              </span>
            </div>

            <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-[13px] space-y-2">
              <div className="flex justify-between font-semibold">
                <span>Classified Pump State:</span>
                <span className="text-[#DC2626] font-bold">Severe Fluid Pound (Confidence: 91%)</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Detected Cause:</span>
                <span className="text-[#0F172A]">Cold heavy crude viscosity causing incomplete pump barrel fill</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Prescribed Mitigation:</span>
                <span className="text-[#16A34A]">Reduce pumping speed to 5.1 SPM to increase intake duration</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODULE 4: EXPLAINABILITY (SHAP) ──────────────────────── */}
      {activeModule === 'explain' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div>
                <h3 className="text-[16px] font-bold text-[#0F172A]">SHAP (SHapley Additive exPlanations) Feature Attribution</h3>
                <p className="text-[12px] text-[#64748B]">Identifies which reservoir &amp; surface operational parameters drove the AI recommendation</p>
              </div>
            </div>

            <div className="space-y-3 text-[13px]">
              {[
                { feature: 'Soak Duration (hr)', impact: '+34%', desc: 'Ensures radial heat conduction into Jodhpur Sandstone', pos: true },
                { feature: 'SPM Speed (strokes/min)', impact: '-26%', desc: 'Lower SPM reduces viscous friction and sucker rod snap', pos: true },
                { feature: 'Steam Volume (ton)', impact: '+22%', desc: 'Enthalpy injection lowers heavy crude viscosity by 72%', pos: true },
                { feature: 'Injection Pressure (bar)', impact: '+12%', desc: 'Keeps steam below formation fracture gradient (24 bar)', pos: true },
                { feature: 'Water Cut (%)', impact: '-6%', desc: 'Minor dampening on net oil uplift rate', pos: false },
              ].map((row, idx) => (
                <div key={idx} className="p-3 bg-[#F8FAFC] rounded border border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#0F172A]">{row.feature}</span>
                    <span className="block text-[11px] text-[#64748B]">{row.desc}</span>
                  </div>
                  <span className={`font-black text-[14px] ${row.pos ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                    {row.impact}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
