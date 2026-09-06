import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Download, Calendar, Filter, CheckCircle2, 
  Printer, ArrowRight, ShieldCheck, Database, Leaf, Zap,
  Droplets, Flame, Eye, X, Share2, Award, Building2
} from 'lucide-react';

interface ReportDoc {
  id: string;
  title: string;
  category: 'production' | 'thermal' | 'mechanical' | 'esg';
  date: string;
  type: 'PDF' | 'XLSX';
  size: string;
  desc: string;
  author: string;
}

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activePreviewDoc, setActivePreviewDoc] = useState<ReportDoc | null>(null);

  const reports: ReportDoc[] = [
    { 
      id: '1', 
      title: 'Daily Operational Field Report (DOR) — Baghewala PML', 
      category: 'production',
      date: 'Today, 06:00 IST', 
      type: 'PDF', 
      size: '2.4 MB', 
      desc: 'Baghewala Field gross extraction, net heavy crude (BOPD), steam allocation, and active well downtime log',
      author: 'Lead Operations Engineer · OIL Jaisalmer'
    },
    { 
      id: '2', 
      title: 'Monthly Cyclic Steam Stimulation (CSS) Thermal Audit', 
      category: 'thermal',
      date: 'November 2024', 
      type: 'PDF', 
      size: '5.8 MB', 
      desc: 'Cycle-by-cycle enthalpy balance, Boberg-Lantz decay verification, and field Steam-to-Oil Ratio (SOR) analysis',
      author: 'Reservoir Engineering Dept · Oil India Ltd'
    },
    { 
      id: '3', 
      title: 'Sucker Rod Pump Mechanical Health & Dynamometer Log', 
      category: 'mechanical',
      date: 'Weekly Audit (W44)', 
      type: 'XLSX', 
      size: '1.2 MB', 
      desc: 'Polished rod load envelopes (PPRL/MPRL), fluid pound diagnostic summary, and VFD power factor recordings',
      author: 'Artificial Lift Specialist · Baghewala'
    },
    { 
      id: '4', 
      title: 'ESG Decarbonization & Scope 1 Emissions Reduction Statement', 
      category: 'esg',
      date: 'Q3 FY 2024-25', 
      type: 'PDF', 
      size: '3.4 MB', 
      desc: 'Statutory report on avoided CO2 emissions via AI-optimized boiler steam generation and pump VFD frequency throttling',
      author: 'HSE & Environmental Directorate · OIL'
    },
    { 
      id: '5', 
      title: 'Jodhpur Sandstone Reservoir Pressure & Depletion Study', 
      category: 'thermal',
      date: 'Quarterly Review', 
      type: 'PDF', 
      size: '8.1 MB', 
      desc: 'Chamber pressure decline history, thermal front propagation, and inter-well steam breakthrough monitoring',
      author: 'Subsurface Geoscience Division'
    },
  ];

  const handleDownload = (title: string) => {
    setDownloadSuccess(`Generated and exported official copy: "${title}"`);
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  const filteredReports = reports.filter(r => {
    if (selectedCategory === 'ALL') return true;
    return r.category === selectedCategory;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 bg-white min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">Oil India Limited · Statutory Governance &amp; Reports</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            Baghewala Field Governance &amp; Compliance Reports
          </h1>
          <p className="text-[14px] text-[#64748B] mt-0.5">
            Executive production audits, thermal enthalpy accounts, ESG carbon reductions, and statutory PSU regulatory statements
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleDownload('Full Baghewala Field Monthly Summary Pack')}
            className="flex items-center gap-2 px-4 py-2 bg-[#005C53] hover:bg-[#004B44] text-white rounded text-[13px] font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Generate Field Dossier</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-[13px] text-[#15803D] font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* ── ESG & Decarbonization Sustainability Ribbon ───────────── */}
      <div className="bg-gradient-to-r from-[#005C53] to-[#042F2C] text-white rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-[#86EFAC]" />
            <h3 className="text-[15px] font-bold tracking-wide uppercase text-[#86EFAC]">
              Green Petroleum Operations · AI Decarbonization Metrics (Baghewala PML)
            </h3>
          </div>
          <span className="text-xs text-white/70">Compliance Standard: MoPNG &amp; ESG Scope 1/2</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          <div className="bg-white/10 p-3.5 rounded-lg backdrop-blur-xs">
            <div className="flex items-center gap-2 text-white/80 text-xs">
              <Flame className="w-4 h-4 text-amber-300" />
              <span>Avoided CO₂e Emissions</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">184.2 <span className="text-xs font-normal text-white/70">tCO₂e</span></div>
            <div className="text-[11px] text-[#86EFAC] mt-0.5">-8.2% boiler gas reduction</div>
          </div>

          <div className="bg-white/10 p-3.5 rounded-lg backdrop-blur-xs">
            <div className="flex items-center gap-2 text-white/80 text-xs">
              <Zap className="w-4 h-4 text-emerald-300" />
              <span>Electrical Energy Saved</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">42.8 <span className="text-xs font-normal text-white/70">MWh</span></div>
            <div className="text-[11px] text-[#86EFAC] mt-0.5">VFD frequency optimization</div>
          </div>

          <div className="bg-white/10 p-3.5 rounded-lg backdrop-blur-xs">
            <div className="flex items-center gap-2 text-white/80 text-xs">
              <Droplets className="w-4 h-4 text-blue-300" />
              <span>Condensate Water Recycled</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">86.4 <span className="text-xs font-normal text-white/70">%</span></div>
            <div className="text-[11px] text-[#86EFAC] mt-0.5">Closed-loop steam recovery</div>
          </div>

          <div className="bg-white/10 p-3.5 rounded-lg backdrop-blur-xs">
            <div className="flex items-center gap-2 text-white/80 text-xs">
              <Award className="w-4 h-4 text-yellow-300" />
              <span>Thermal Efficiency Gain</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">+11.4 <span className="text-xs font-normal text-white/70">%</span></div>
            <div className="text-[11px] text-[#86EFAC] mt-0.5">SOR lowered to 3.4</div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {[
            { key: 'ALL', label: 'All Documents' },
            { key: 'production', label: 'Production Logs' },
            { key: 'thermal', label: 'CSS Thermal EOR' },
            { key: 'mechanical', label: 'SRP Mechanical' },
            { key: 'esg', label: 'ESG & Decarbonization' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedCategory(tab.key)}
              className={`px-3.5 py-1.5 rounded text-[13px] font-bold transition-all cursor-pointer ${
                selectedCategory === tab.key
                  ? 'bg-[#D32F2F] text-white shadow-xs'
                  : 'bg-white border border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-[#64748B] font-semibold">
          Showing {filteredReports.length} compliance documents
        </span>
      </div>

      {/* ── Reports List ─────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs divide-y divide-[#F1F5F9]">
        {filteredReports.map(rep => (
          <div key={rep.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[#D32F2F] shrink-0 font-black text-[12px]">
                {rep.type}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-[15px] font-bold text-[#0F172A]">{rep.title}</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#F1F5F9] text-[#475569]">
                    {rep.category}
                  </span>
                </div>
                <p className="text-[13px] text-[#64748B]">{rep.desc}</p>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#94A3B8] font-semibold pt-1">
                  <span>Effective: {rep.date}</span>
                  <span>File Size: {rep.size}</span>
                  <span>Signatory: {rep.author}</span>
                  <span className="text-[#16A34A] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>OIL Verified Signature</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => setActivePreviewDoc(rep)}
                className="px-3.5 py-2 bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#334155] rounded text-[12px] font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-[#005C53]" />
                <span>Preview</span>
              </button>

              <button
                onClick={() => handleDownload(rep.title)}
                className="px-4 py-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded text-[12px] font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Document Preview Modal ───────────────────────────────── */}
      {activePreviewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#CBD5E1]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#D32F2F]" />
                <div>
                  <h3 className="text-sm font-black text-[#0F172A] uppercase tracking-wider">
                    OIL INDIA LIMITED · OFFICIAL DOCUMENT DISPATCH
                  </h3>
                  <p className="text-[11px] text-[#64748B]">{activePreviewDoc.title}</p>
                </div>
              </div>
              <button 
                onClick={() => setActivePreviewDoc(null)}
                className="p-1.5 hover:bg-[#E2E8F0] rounded-lg text-[#64748B] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Formatted Document Sheet */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm bg-white font-mono leading-relaxed">
              <div className="text-center border-b pb-4 space-y-1">
                <div className="text-base font-black text-[#0F172A] tracking-wider">OIL INDIA LIMITED (A Govt. of India Enterprise)</div>
                <div className="text-xs text-[#64748B]">Rajasthan Project · Jaisalmer Basin · Baghewala Heavy Oil PML</div>
                <div className="text-xs font-bold text-[#D32F2F] pt-1">{activePreviewDoc.title.toUpperCase()}</div>
                <div className="text-[11px] text-[#94A3B8]">Generated Date: {new Date().toLocaleDateString('en-GB')} · Status: VERIFIED &amp; APPROVED</div>
              </div>

              <div className="bg-[#F8FAFC] p-4 rounded border text-xs space-y-2">
                <div className="font-bold text-[#0F172A]">EXECUTIVE OPERATIONAL HIGHLIGHTS:</div>
                <div>• Total Monitored Wells: 23 BGW Heavy Oil Wellbores</div>
                <div>• Field Oil Rate: 342 BOPD (Net Crude, Jodhpur Sandstone)</div>
                <div>• Active CSS Cycle Average SOR: 3.42 bbl steam/bbl oil (-10.6% reduction)</div>
                <div>• Surface SRP Lift Integrity: Goodman fatigue safety ratio 84.6%</div>
                <div>• Avoided CO2 Footprint: 184.2 tCO2e across 4 stimulated well patterns</div>
              </div>

              <div className="text-xs space-y-1 text-[#334155]">
                <div className="font-bold text-[#0F172A]">SIGN-OFF CHAIN &amp; COMPLIANCE:</div>
                <div>Supervising Officer: {activePreviewDoc.author}</div>
                <div>Digital Hash ID: OIL-BAGH-2024-V{activePreviewDoc.id}-9D8A</div>
                <div>Security Classification: RESTRICTED — INTERNAL FIELD USE</div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-white border border-[#CBD5E1] text-[#334155] rounded text-xs font-bold hover:bg-[#F1F5F9] flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActivePreviewDoc(null)}
                  className="px-4 py-2 bg-white border border-[#CBD5E1] text-[#64748B] rounded text-xs font-bold hover:bg-[#F1F5F9] cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleDownload(activePreviewDoc.title);
                    setActivePreviewDoc(null);
                  }}
                  className="px-4 py-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File ({activePreviewDoc.type})</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
