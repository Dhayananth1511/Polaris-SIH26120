import React, { useState } from 'react';
import { 
  Users, Database, Cpu, Activity, Settings, Shield, 
  CheckCircle2, AlertTriangle, RefreshCw, Key, HardDrive, 
  Server, Lock, Plus, Search, FileText, Check, X
} from 'lucide-react';
import type { UserRole } from '../types';

interface AdminPageProps {
  initialTab?: 'users' | 'data' | 'models' | 'health' | 'config' | 'audit';
}

export const AdminManagementPage: React.FC<AdminPageProps> = ({ initialTab = 'users' }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'data' | 'models' | 'health' | 'config' | 'audit'>(initialTab);

  // Users Management State
  const [usersList, setUsersList] = useState([
    { id: '1', empId: 'OIL-OP-4102', name: 'Amitav Patel', role: 'Field Operator', dept: 'Field Operations', status: 'Active', lastActive: '5 min ago' },
    { id: '2', empId: 'OIL-PE-2847', name: 'Rajan Sharma', role: 'Production / Reservoir Engineer', dept: 'Production Engineering', status: 'Active', lastActive: 'Now' },
    { id: '3', empId: 'OIL-FM-1052', name: 'Vikram Nair', role: 'Field Supervisor / Manager', dept: 'Field Management', status: 'Active', lastActive: '12 min ago' },
    { id: '4', empId: 'OIL-ADM-001', name: 'Priya Menon', role: 'System Administrator', dept: 'Information Systems', status: 'Active', lastActive: 'Now' },
  ]);

  // Models State
  const [modelsList, setModelsList] = useState([
    { name: 'Boberg-Lantz Reservoir Thermal Model', type: 'Physics Analytical', version: 'v2.4.1', accuracy: '96.2%', status: 'Active (Production)', latency: '12ms' },
    { name: 'XGBoost Production Residual Surrogate', type: 'Gradient Boosted Tree', version: 'v4.1.0', accuracy: '94.8%', status: 'Active (Production)', latency: '8ms' },
    { name: 'SRP Dynamometer Card Classifier', type: 'Random Forest (150 Trees)', version: 'v3.2.0', accuracy: '97.1%', status: 'Active (Production)', latency: '5ms' },
    { name: 'SHAP Feature Attribution Explainer', type: 'TreeSHAP Engine', version: 'v1.8.3', accuracy: '100% Fidelity', status: 'Active (Production)', latency: '24ms' },
    { name: 'Constrained Genetic Algorithm Optimizer', type: 'Heuristic Optimization', version: 'v2.0.4', accuracy: 'Optimal Pareto', status: 'Active (Production)', latency: '180ms' },
  ]);

  // Data Feeds State
  const [dataFeeds, setDataFeeds] = useState([
    { name: 'Baghewala SCADA Stream (OPC-UA)', protocol: 'OPC-UA TCP :4840', rate: '100 Hz', latency: '24ms', status: 'Connected', packets: '1.4M / hr' },
    { name: 'Wellhead RTU Telemetry Bus', protocol: 'Modbus TCP :502', rate: '10 Hz', latency: '42ms', status: 'Connected', packets: '360K / hr' },
    { name: 'Steam Generation Plant DCS', protocol: 'MQTT / TLS :8883', rate: '5 Hz', latency: '35ms', status: 'Connected', packets: '180K / hr' },
    { name: 'Dynamometer Card High-Speed Strain Gauge', protocol: 'CAN-to-Ethernet', rate: '250 Hz', latency: '18ms', status: 'Connected', packets: '3.6M / hr' },
  ]);

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#F4F6F8] min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">Oil India Limited · Core System Administration</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            Administration &amp; System Governance
          </h1>
          <p className="text-[14px] text-[#64748B] mt-0.5">
            Role-based access control, data ingestion feeds, AI surrogate model repository &amp; system health
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded border border-[#E2E8F0] shadow-xs text-[13px] text-[#166534] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span>All System Nodes Healthy</span>
          </div>
        </div>
      </div>

      {/* ── Admin Subtabs Navigation ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E8F0] pb-2 text-[13px]">
        {[
          { key: 'users',  label: 'Users & Roles',    icon: <Users className="w-4 h-4" /> },
          { key: 'data',   label: 'Data Management',  icon: <Database className="w-4 h-4" /> },
          { key: 'models', label: 'Models & Engines', icon: <Cpu className="w-4 h-4" /> },
          { key: 'health', label: 'System Health',    icon: <Activity className="w-4 h-4" /> },
          { key: 'config', label: 'Well Configuration',icon: <Settings className="w-4 h-4" /> },
          { key: 'audit',  label: 'Audit Logs',       icon: <Shield className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 font-bold rounded-t transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'border-b-2 border-[#D32F2F] text-[#D32F2F] bg-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB 1: USERS & ROLES ──────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-[17px] font-bold text-[#0F172A]">Active Platform Users &amp; Permissions</h3>
              <p className="text-[13px] text-[#64748B]">Manage assigned engineering roles and operational duty clearances</p>
            </div>
            <button className="flex items-center gap-2 px-3.5 py-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded text-[13px] font-bold transition-colors cursor-pointer shadow-xs">
              <Plus className="w-4 h-4" />
              <span>Add Authorized User</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Active</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0F172A]">{u.empId}</td>
                    <td className="py-3 px-4 font-semibold text-[#0F172A]">{u.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E0F2FE] text-[#0369A1]">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#475569]">{u.dept}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">{u.lastActive}</td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-[12px] text-[#D32F2F] hover:underline font-semibold mr-3">Edit Role</button>
                      <button className="text-[12px] text-[#64748B] hover:underline">Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: DATA MANAGEMENT ────────────────────────────────── */}
      {activeTab === 'data' && (
        <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-[17px] font-bold text-[#0F172A]">Real-Time Data Ingestion Streams</h3>
              <p className="text-[13px] text-[#64748B]">Telemetry connectors for Baghewala field wellheads, steam plant &amp; SCADA bus</p>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC]">
              <RefreshCw className="w-3.5 h-3.5 text-[#D32F2F]" />
              <span>Test All Endpoints</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataFeeds.map(feed => (
              <div key={feed.name} className="p-4 rounded border border-[#E2E8F0] bg-[#F8FAFC] space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-[#0F172A] text-[14px]">{feed.name}</h4>
                    <span className="text-[12px] font-mono text-[#64748B]">{feed.protocol}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                    {feed.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E2E8F0] text-[12px]">
                  <div>
                    <span className="text-[#94A3B8] block text-[10px] uppercase">Sample Rate</span>
                    <strong className="text-[#0F172A]">{feed.rate}</strong>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[10px] uppercase">Latency</span>
                    <strong className="text-[#16A34A]">{feed.latency}</strong>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[10px] uppercase">Throughput</span>
                    <strong className="text-[#0F172A]">{feed.packets}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: MODELS & ENGINES ───────────────────────────────── */}
      {activeTab === 'models' && (
        <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-5">
          <div className="pb-4 border-b border-[#F1F5F9]">
            <h3 className="text-[17px] font-bold text-[#0F172A]">AI &amp; Physics Surrogate Model Registry</h3>
            <p className="text-[13px] text-[#64748B]">Active machine learning and analytical models running in Baghewala Digital Twin Core</p>
          </div>

          <div className="space-y-3">
            {modelsList.map(m => (
              <div key={m.name} className="p-4 rounded border border-[#E2E8F0] hover:border-[#CBD5E1] bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#D32F2F]" />
                    <h4 className="font-bold text-[#0F172A] text-[14px]">{m.name}</h4>
                    <span className="font-mono text-[11px] px-2 py-0.5 bg-[#F1F5F9] rounded text-[#475569]">{m.version}</span>
                  </div>
                  <p className="text-[12px] text-[#64748B] mt-1">Architecture: {m.type}</p>
                </div>

                <div className="flex items-center gap-6 text-[12px]">
                  <div>
                    <span className="text-[#94A3B8] block text-[10px] uppercase">Validation Metric</span>
                    <strong className="text-[#15803D]">{m.accuracy}</strong>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[10px] uppercase">Inference Time</span>
                    <strong className="text-[#0F172A]">{m.latency}</strong>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[10px] uppercase">Status</span>
                    <span className="text-[#16A34A] font-bold">{m.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: SYSTEM HEALTH ──────────────────────────────────── */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded border border-[#E2E8F0] shadow-sm">
              <span className="text-[12px] font-bold text-[#64748B] uppercase">Edge Compute CPU</span>
              <p className="text-3xl font-black text-[#0F172A] mt-1">28.4%</p>
              <div className="w-full bg-[#F1F5F9] h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-[#16A34A] h-full w-[28.4%]" />
              </div>
            </div>
            <div className="bg-white p-5 rounded border border-[#E2E8F0] shadow-sm">
              <span className="text-[12px] font-bold text-[#64748B] uppercase">RAM Utilization</span>
              <p className="text-3xl font-black text-[#0F172A] mt-1">44.1%</p>
              <div className="w-full bg-[#F1F5F9] h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-[#0284C7] h-full w-[44.1%]" />
              </div>
            </div>
            <div className="bg-white p-5 rounded border border-[#E2E8F0] shadow-sm">
              <span className="text-[12px] font-bold text-[#64748B] uppercase">Storage IOPS</span>
              <p className="text-3xl font-black text-[#0F172A] mt-1">420 IOPS</p>
              <div className="w-full bg-[#F1F5F9] h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-[#D97706] h-full w-[18%]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: WELL CONFIGURATION ─────────────────────────────── */}
      {activeTab === 'config' && (
        <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-4">
          <div className="pb-4 border-b border-[#F1F5F9]">
            <h3 className="text-[17px] font-bold text-[#0F172A]">Wellhead &amp; Sensor Calibration Config</h3>
            <p className="text-[13px] text-[#64748B]">Operational parameter bounds and telemetry thresholds for Baghewala heavy oil wells</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <div className="p-4 rounded border border-[#E2E8F0] space-y-3">
              <h4 className="font-bold text-[#0F172A]">CSS Injection Thresholds</h4>
              <div className="space-y-2 text-[#475569]">
                <div className="flex justify-between"><span>Max Steam Pressure</span><strong>25.0 bar</strong></div>
                <div className="flex justify-between"><span>Max Steam Volume / Cycle</span><strong>950 tonnes</strong></div>
                <div className="flex justify-between"><span>Default Soak Duration</span><strong>72 hours</strong></div>
              </div>
            </div>
            <div className="p-4 rounded border border-[#E2E8F0] space-y-3">
              <h4 className="font-bold text-[#0F172A]">SRP Limits</h4>
              <div className="space-y-2 text-[#475569]">
                <div className="flex justify-between"><span>Maximum Rod Load</span><strong>7.50 kN</strong></div>
                <div className="flex justify-between"><span>Max SPM</span><strong>7.0 SPM</strong></div>
                <div className="flex justify-between"><span>VFD Frequency Window</span><strong>25 – 50 Hz</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: AUDIT LOGS ─────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-4">
          <div className="pb-4 border-b border-[#F1F5F9]">
            <h3 className="text-[17px] font-bold text-[#0F172A]">Cryptographic System Audit Trail</h3>
            <p className="text-[13px] text-[#64748B]">Tamper-evident logs of all operator actions, parameter adjustments &amp; supervisor approvals</p>
          </div>

          <div className="divide-y divide-[#F1F5F9] text-[13px]">
            {[
              { time: '04 Nov 2024 14:20 IST', user: 'Rajan Sharma (PE)', action: 'Dispatched optimization recommendation to Well BGW-014', ip: '10.14.2.85' },
              { time: '04 Nov 2024 12:15 IST', user: 'Vikram Nair (FM)', action: 'Approved CSS Steam Volume parameter adjustment for Well BGW-021', ip: '10.14.1.12' },
              { time: '04 Nov 2024 09:30 IST', user: 'Amitav Patel (OP)', action: 'Acknowledged polished rod load alarm on BGW-014', ip: '10.14.3.44' },
              { time: '03 Nov 2024 18:00 IST', user: 'Priya Menon (ADM)', action: 'Updated XGBoost surrogate weights checkpoint to v4.1.0', ip: '10.14.0.5' },
            ].map((log, i) => (
              <div key={i} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <strong className="text-[#0F172A]">{log.user}</strong>: <span className="text-[#475569]">{log.action}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#94A3B8]">
                  <span>{log.ip}</span>
                  <span>•</span>
                  <span>{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
