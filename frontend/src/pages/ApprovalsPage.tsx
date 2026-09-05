import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, Clock, XCircle, ShieldCheck, Check, X, FileText, 
  ArrowRight, Download, Filter, Search, UserCheck
} from 'lucide-react';

interface ApprovalItem {
  id: string;
  date: string;
  wellId: string;
  recommendation: string;
  impact: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  comment?: string;
  submittedBy: string;
}

const INITIAL_APPROVALS: ApprovalItem[] = [
  { 
    id: '1', 
    date: '04 Nov 14:20', 
    wellId: 'BGW-014', 
    recommendation: 'Reduce SPM to 5.1', 
    impact: '+14% Production', 
    status: 'Pending', 
    comment: 'Looks good. Within operating limits. -- Field Engineer',
    submittedBy: 'AI Optimizer (XGBoost Engine)' 
  },
  { 
    id: '2', 
    date: '04 Nov 12:15', 
    wellId: 'BGW-021', 
    recommendation: 'Adjust steam volume', 
    impact: '-8% SOR', 
    status: 'Approved', 
    comment: 'Approved by Field Manager - Vikram Nair',
    submittedBy: 'CSS Optimizer' 
  },
  { 
    id: '3', 
    date: '03 Nov 16:40', 
    wellId: 'BGW-007', 
    recommendation: 'Increase soak time', 
    impact: '+11% Production', 
    status: 'Pending', 
    comment: 'Thermal penetration simulation verified. Awaiting supervisor sign-off.',
    submittedBy: 'AI Optimizer (Cycle Planner)' 
  },
  { 
    id: '4', 
    date: '03 Nov 11:30', 
    wellId: 'BGW-003', 
    recommendation: 'Optimize VFD', 
    impact: '-7% Energy', 
    status: 'Rejected', 
    comment: 'Motor drive current fluctuation exceeds tolerance threshold.',
    submittedBy: 'SRP Optimizer' 
  },
  { 
    id: '5', 
    date: '02 Nov 14:22', 
    wellId: 'BGW-005', 
    recommendation: 'Adjust injection pressure', 
    impact: '+9% Production', 
    status: 'Approved', 
    comment: 'Approved by Lead Engineer Rajan Sharma',
    submittedBy: 'Joint CSS+SRP Optimizer' 
  },
];

interface ApprovalsPageProps {
  initialTab?: 'pending' | 'approved' | 'rejected' | 'audit';
}

export const ApprovalsPage: React.FC<ApprovalsPageProps> = ({ initialTab = 'pending' }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'audit'>(initialTab);
  const [items, setItems] = useState<ApprovalItem[]>(INITIAL_APPROVALS);
  const [selectedWellId, setSelectedWellId] = useState<string>('BGW-014');
  const [commentText, setCommentText] = useState<string>('Looks good. Within operating limits.\n\n-- Field Engineer');

  const selectedItem = items.find(item => item.wellId === selectedWellId) || items[0];

  const handleApprove = (wellId: string) => {
    setItems(prev => prev.map(item => 
      item.wellId === wellId 
        ? { ...item, status: 'Approved', comment: commentText } 
        : item
    ));
  };

  const handleReject = (wellId: string) => {
    setItems(prev => prev.map(item => 
      item.wellId === wellId 
        ? { ...item, status: 'Rejected', comment: commentText } 
        : item
    ));
  };

  const filteredItems = items.filter(item => {
    if (activeTab === 'pending') return item.status === 'Pending';
    if (activeTab === 'approved') return item.status === 'Approved';
    if (activeTab === 'rejected') return item.status === 'Rejected';
    return true; // audit logs show all
  });

  return (
    <div className="p-6 md:p-8 space-y-6 bg-white min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">Oil India Limited · Engineering Governance</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            Engineering Setpoint Approvals &amp; Governance
          </h1>
          <p className="text-[14px] text-[#64748B] mt-0.5">
            Human-in-the-loop validation for automated AI setpoints across Baghewala heavy oil wells
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/command-center')}
            className="px-3.5 py-2 bg-white border border-[#CBD5E1] rounded text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] shadow-xs transition-colors cursor-pointer"
          >
            ← Command Center
          </button>
        </div>
      </div>

      {/* ── Tabs (Screenshot 2 Matching: Pending Approvals / Approved / Rejected / Audit Logs) ── */}
      <div className="flex items-center gap-6 border-b border-[#E2E8F0] pb-2 text-[15px]">
        {[
          { key: 'pending', label: 'Pending Approvals', count: items.filter(i => i.status === 'Pending').length },
          { key: 'approved', label: 'Approved', count: items.filter(i => i.status === 'Approved').length },
          { key: 'rejected', label: 'Rejected', count: items.filter(i => i.status === 'Rejected').length },
          { key: 'audit', label: 'Audit Logs', count: items.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`pb-2 font-bold cursor-pointer transition-all border-b-2 ${
              activeTab === t.key
                ? 'border-[#005C53] text-[#005C53]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <span>{t.label}</span>
            <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] bg-[#E2E8F0] text-[#334155]">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Table Card (Screenshot 2 Exact Matching) ─────────────── */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-5">Date</th>
                <th className="py-3.5 px-5">Well ID</th>
                <th className="py-3.5 px-5">Recommendation</th>
                <th className="py-3.5 px-5">Expected Impact</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredItems.map(row => {
                const isSelected = row.wellId === selectedWellId;
                return (
                  <tr 
                    key={row.id} 
                    className={`transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#F0FDF4]/70' : 'hover:bg-[#F8FAFC]'
                    }`}
                    onClick={() => {
                      setSelectedWellId(row.wellId);
                      setCommentText(row.comment || `Reviewed setpoint change for ${row.wellId}.\n\n-- Field Engineer`);
                    }}
                  >
                    <td className="py-4 px-5 text-[#475569] font-medium">{row.date}</td>
                    <td className="py-4 px-5 font-bold text-[#0F172A]">{row.wellId}</td>
                    <td className="py-4 px-5 font-semibold text-[#1E293B]">{row.recommendation}</td>
                    <td className="py-4 px-5 font-bold text-[#16A34A]">{row.impact}</td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        row.status === 'Pending' ? 'bg-[#FEFCE8] text-[#CA8A04] border border-[#FEF08A]' :
                        row.status === 'Approved' ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]' :
                        'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWellId(row.wellId);
                          setCommentText(row.comment || `Reviewed setpoint change for ${row.wellId}.\n\n-- Field Engineer`);
                        }}
                        className="px-3.5 py-1.5 bg-[#005C53] hover:bg-[#004B44] text-white rounded text-[12px] font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Comments Card (Screenshot 2 Exact Matching) ──────────── */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
          <h3 className="text-[16px] font-black text-[#0F172A] tracking-tight">
            Comments ({selectedWellId})
          </h3>
          <span className="text-[12px] text-[#64748B]">
            Target: <strong>{selectedItem?.recommendation}</strong> ({selectedItem?.impact})
          </span>
        </div>

        <textarea
          rows={3}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="w-full p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-md text-[13px] text-[#0F172A] focus:outline-none focus:border-[#005C53]"
          placeholder="Enter engineering notes or operational rationale..."
        />

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            onClick={() => handleApprove(selectedWellId)}
            className="px-6 py-2.5 bg-[#005C53] hover:bg-[#004B44] text-white font-bold rounded text-[13px] shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Approve</span>
          </button>

          <button
            onClick={() => handleReject(selectedWellId)}
            className="px-6 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded text-[13px] shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[3]" />
            <span>Reject</span>
          </button>
        </div>
      </div>

    </div>
  );
};
