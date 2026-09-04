import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, Map, RefreshCw, ShieldAlert, CheckCircle2, 
  AlertTriangle, Filter, ExternalLink, ArrowRight, Radio
} from 'lucide-react';
import { FieldMapBaghewala, BAGHEWALA_MAP_WELLS } from '../components/map/FieldMapBaghewala';

export const FieldStatusPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedWell, setSelectedWell] = useState(BAGHEWALA_MAP_WELLS[0]);

  const normalWells = BAGHEWALA_MAP_WELLS.filter(w => w.status === 'Normal');
  const attentionWells = BAGHEWALA_MAP_WELLS.filter(w => w.status === 'Attention');
  const criticalWells = BAGHEWALA_MAP_WELLS.filter(w => w.status === 'Critical');

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#F4F6F8] min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">Oil India Limited · Real-Time GIS Telemetry</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            Baghewala Field Status &amp; Spatial Overview
          </h1>
          <p className="text-[14px] text-[#64748B] mt-0.5">
            23 active heavy oil wells across 206.8 sq km Petroleum Mining Lease (PML), Jaisalmer Basin, Rajasthan
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-full text-[12px] font-bold text-[#15803D] flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>SCADA Connected (2s interval)</span>
          </div>
          <button
            onClick={() => navigate('/app/command-center')}
            className="px-3.5 py-2 bg-white border border-[#CBD5E1] rounded text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] shadow-xs transition-colors cursor-pointer"
          >
            ← Command Center
          </button>
        </div>
      </div>

      {/* ── 4 Quick Status Counters ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Total Active Wells</span>
          <div className="text-2xl font-black text-[#0F172A] mt-1">{BAGHEWALA_MAP_WELLS.length}</div>
          <div className="text-[11px] text-[#16A34A] font-semibold mt-1">100% Online Telemetry</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Normal Producing</span>
          <div className="text-2xl font-black text-[#16A34A] mt-1">{normalWells.length}</div>
          <div className="text-[11px] text-[#64748B] font-semibold mt-1">Within optimal parameters</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Attention Required</span>
          <div className="text-2xl font-black text-[#CA8A04] mt-1">{attentionWells.length}</div>
          <div className="text-[11px] text-[#CA8A04] font-semibold mt-1">Thermal/fluid deviation</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Critical Alerts</span>
          <div className="text-2xl font-black text-[#DC2626] mt-1">{criticalWells.length}</div>
          <div className="text-[11px] text-[#DC2626] font-semibold mt-1">BGW-014 &amp; BGW-007</div>
        </div>
      </div>

      {/* ── Main Map Component ───────────────────────────────────── */}
      <div className="w-full">
        <FieldMapBaghewala 
          onSelectWell={(w) => setSelectedWell(w)} 
          selectedWellId={selectedWell.id} 
        />
      </div>

    </div>
  );
};
