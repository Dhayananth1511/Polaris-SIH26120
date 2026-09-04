import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Download, Calendar, Filter, CheckCircle2, 
  Printer, ArrowRight, ShieldCheck, Database
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const reports = [
    { id: '1', title: 'Daily Operational Field Report (DOR)', date: '04 Nov 2024', type: 'PDF', size: '2.4 MB', desc: 'Baghewala Field daily extraction, steam injection, and well downtime log' },
    { id: '2', title: 'Monthly Cyclic Steam Stimulation Audit', date: 'October 2024', type: 'PDF', size: '5.8 MB', desc: 'Detailed cycle-by-cycle enthalpy balance and Steam-to-Oil Ratio performance' },
    { id: '3', title: 'Sucker Rod Pump Mechanical Health & Fatigue Log', date: '04 Nov 2024', type: 'XLSX', size: '1.2 MB', desc: 'Dynamometer card interpretations, rod overload alerts, and VFD metrics' },
    { id: '4', title: 'Quarterly Reservoir Pressure & Depletion Study', date: 'Q3 2024', type: 'PDF', size: '8.1 MB', desc: 'Jodhpur Sandstone pressure decline analysis and thermal chamber sweep efficiency' },
  ];

  const handleDownload = (title: string) => {
    setDownloadSuccess(`Generated and downloaded: ${title}`);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#F4F6F8] min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">Oil India Limited · Official Compliance &amp; Reports</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            Baghewala Field Governance &amp; Reports
          </h1>
          <p className="text-[14px] text-[#64748B] mt-0.5">
            Executive production audits, thermal efficiency statements, and statutory PSU compliance exports
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleDownload('Full Field Monthly Summary')}
            className="flex items-center gap-2 px-4 py-2 bg-[#005C53] hover:bg-[#004B44] text-white rounded text-[13px] font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Generate Field Summary</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-[13px] text-[#15803D] font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* ── Reports List ─────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs divide-y divide-[#F1F5F9]">
        {reports.map(rep => (
          <div key={rep.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[#D32F2F] shrink-0 font-black text-[12px]">
                {rep.type}
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-[#0F172A]">{rep.title}</h4>
                <p className="text-[13px] text-[#64748B] mt-0.5">{rep.desc}</p>
                <div className="flex items-center gap-4 text-[11px] text-[#94A3B8] mt-1 font-semibold">
                  <span>Period: {rep.date}</span>
                  <span>Size: {rep.size}</span>
                  <span className="text-[#16A34A]">✓ Verified by Lead Engineer</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDownload(rep.title)}
              className="px-4 py-2 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#334155] rounded text-[12px] font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-[#D32F2F]" />
              <span>Download</span>
            </button>
          </div>
        ))}
      </div>

    </div>
  );
};
