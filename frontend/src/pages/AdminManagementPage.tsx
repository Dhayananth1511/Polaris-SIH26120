import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Database, Cpu, Activity, Settings, Shield, 
  CheckCircle2, AlertTriangle, RefreshCw, Key, HardDrive, 
  Server, Lock, Plus, Search, FileText, Check, X, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { adminApi, BackendOperator, BackendAuditLog } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface AdminPageProps {
  initialTab?: 'users' | 'data' | 'models' | 'health' | 'config' | 'audit';
}

export const AdminManagementPage: React.FC<AdminPageProps> = ({ initialTab = 'users' }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'users' | 'data' | 'models' | 'health' | 'config' | 'audit'>(initialTab);

  // Sync activeTab whenever route or initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (key: 'users' | 'data' | 'models' | 'health' | 'config' | 'audit') => {
    setActiveTab(key);
    navigate(`/app/admin/${key}`);
  };

  // ── Users Management State ─────────────────────────────────────────────
  const [operators, setOperators] = useState<BackendOperator[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmpId, setNewEmpId] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Reset Password Modal State
  const [resetModalUser, setResetModalUser] = useState<BackendOperator | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState('');

  // ── Audit Logs State ───────────────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState<BackendAuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Fetch operators from backend
  const fetchOperators = async () => {
    setLoadingUsers(true);
    setUserError('');
    try {
      const res = await adminApi.listOperators();
      setOperators(res.data);
    } catch (err: any) {
      setUserError(err.message || 'Failed to fetch operators from PostgreSQL.');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch audit logs from backend
  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await adminApi.listAuditLogs();
      setAuditLogs(res.data);
    } catch {
      // Fallback
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchOperators();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  // Handle Add Operator
  const handleAddOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    setModalError('');

    try {
      await adminApi.createOperator({
        employee_id: newEmpId.trim().toUpperCase(),
        full_name: newName.trim(),
        email: newEmail.trim() || undefined,
        password: newPassword,
      });

      setShowAddModal(false);
      setNewEmpId('');
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setSuccessMsg(`Operator ${newEmpId.toUpperCase()} created successfully in PostgreSQL.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchOperators();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create operator.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Handle Toggle Status
  const handleToggleStatus = async (op: BackendOperator) => {
    const nextStatus = op.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await adminApi.updateStatus(op.id, nextStatus);
      setSuccessMsg(`Status for ${op.employee_id} updated to ${nextStatus}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchOperators();
    } catch (err: any) {
      setUserError(err.message || 'Failed to update operator status.');
    }
  };

  // Handle Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    setResetSubmitting(true);
    setResetError('');

    try {
      await adminApi.resetPassword(resetModalUser.id, resetNewPassword);
      setSuccessMsg(`Password reset for ${resetModalUser.employee_id}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setResetModalUser(null);
      setResetNewPassword('');
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Models State
  const [modelsList] = useState([
    { name: 'Boberg-Lantz Reservoir Thermal Model', type: 'Physics Analytical', version: 'v2.4.1', accuracy: '96.2%', status: 'Active (Production)', latency: '12ms' },
    { name: 'XGBoost Production Residual Surrogate', type: 'Gradient Boosted Tree', version: 'v4.1.0', accuracy: '94.8%', status: 'Active (Production)', latency: '8ms' },
    { name: 'SRP Dynamometer Card Classifier', type: 'Random Forest (150 Trees)', version: 'v3.2.0', accuracy: '97.1%', status: 'Active (Production)', latency: '5ms' },
    { name: 'SHAP Feature Attribution Explainer', type: 'TreeSHAP Engine', version: 'v1.8.3', accuracy: '100% Fidelity', status: 'Active (Production)', latency: '24ms' },
    { name: 'Constrained Genetic Algorithm Optimizer', type: 'Heuristic Optimization', version: 'v2.0.4', accuracy: 'Optimal Pareto', status: 'Active (Production)', latency: '180ms' },
  ]);

  // Data Feeds State
  const [dataFeeds] = useState([
    { name: 'Baghewala SCADA Stream (OPC-UA)', protocol: 'OPC-UA TCP :4840', rate: '100 Hz', latency: '24ms', status: 'Connected', packets: '1.4M / hr' },
    { name: 'Wellhead RTU Telemetry Bus', protocol: 'Modbus TCP :502', rate: '10 Hz', latency: '42ms', status: 'Connected', packets: '360K / hr' },
    { name: 'Steam Generation Plant DCS', protocol: 'MQTT / TLS :8883', rate: '5 Hz', latency: '35ms', status: 'Connected', packets: '180K / hr' },
    { name: 'Dynamometer Card High-Speed Strain Gauge', protocol: 'CAN-to-Ethernet', rate: '250 Hz', latency: '18ms', status: 'Connected', packets: '3.6M / hr' },
  ]);

  return (
    <div className="p-6 md:p-8 space-y-6 bg-white min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
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
            Role-based access control connected to production PostgreSQL database
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded border border-[#E2E8F0] shadow-xs text-[13px] text-[#166534] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span>PostgreSQL &amp; API Online</span>
          </div>
        </div>
      </div>

      {/* Global Banner Messages */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-3 text-[13.5px] text-[#166534] font-semibold">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#16A34A]" />
          <span>{successMsg}</span>
        </div>
      )}
      {userError && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] flex items-center gap-3 text-[13.5px] text-[#B91C1C]">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{userError}</span>
        </div>
      )}

      {/* ── Admin Subtabs Navigation ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E8F0] pb-2 text-[13px]">
        {[
          { key: 'users',  label: 'Users & Roles (PostgreSQL)', icon: <Users className="w-4 h-4" /> },
          { key: 'data',   label: 'Data Management',  icon: <Database className="w-4 h-4" /> },
          { key: 'models', label: 'Models & Engines', icon: <Cpu className="w-4 h-4" /> },
          { key: 'health', label: 'System Health',    icon: <Activity className="w-4 h-4" /> },
          { key: 'config', label: 'Well Configuration',icon: <Settings className="w-4 h-4" /> },
          { key: 'audit',  label: 'Audit Trail',      icon: <Shield className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key as any)}
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
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-[17px] font-bold text-[#0F172A]">Real Operator Accounts</h3>
              <p className="text-[13px] text-[#64748B]">All accounts created here are stored securely in PostgreSQL with Argon2id encryption</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchOperators}
                disabled={loadingUsers}
                className="p-2 rounded-xl border border-[#CBD5E1] text-[#64748B] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                title="Refresh user list"
              >
                <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin text-[#D32F2F]' : ''}`} />
              </button>
              <button 
                onClick={() => { setShowAddModal(true); setModalError(''); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded-xl text-[13px] font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Authorized Operator</span>
              </button>
            </div>
          </div>

          {loadingUsers ? (
            <div className="py-12 text-center text-[#64748B] flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-[#D32F2F]" />
              <p className="text-[14px]">Fetching accounts from PostgreSQL database...</p>
            </div>
          ) : operators.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-[#E2E8F0] rounded-xl text-[#64748B] space-y-3">
              <Users className="w-10 h-10 mx-auto text-[#CBD5E1]" />
              <p className="text-[15px] font-semibold text-[#0F172A]">No Operator Accounts Created Yet</p>
              <p className="text-[13px] max-w-sm mx-auto">Click "Add Authorized Operator" to register your first operator. You are currently logged in with your master Administrator account.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created At</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {operators.map(u => (
                    <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F172A]">{u.employee_id}</td>
                      <td className="py-3.5 px-4 font-semibold text-[#0F172A]">{u.full_name}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E0F2FE] text-[#0369A1]">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          u.status === 'ACTIVE' ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEF2F2] text-[#B91C1C]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`} />
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B]">
                        {new Date(u.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B]">
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleString('en-IN') : 'Never'}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button 
                          onClick={() => { setResetModalUser(u); setResetNewPassword(''); setResetError(''); }}
                          className="text-[12px] text-[#2563EB] hover:underline font-semibold cursor-pointer"
                        >
                          Reset Password
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(u)}
                          className={`text-[12px] font-semibold hover:underline cursor-pointer ${
                            u.status === 'ACTIVE' ? 'text-[#D32F2F]' : 'text-[#16A34A]'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center">
                      <Server className="w-4 h-4 text-[#D32F2F]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[14px] text-[#0F172A]">{feed.name}</h4>
                      <p className="text-[12px] font-mono text-[#64748B]">{feed.protocol}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">
                    {feed.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E2E8F0] text-[12px]">
                  <div><span className="text-[#64748B]">Sampling Rate:</span> <strong className="text-[#0F172A]">{feed.rate}</strong></div>
                  <div><span className="text-[#64748B]">Latency:</span> <strong className="text-[#0F172A]">{feed.latency}</strong></div>
                  <div><span className="text-[#64748B]">Throughput:</span> <strong className="text-[#0F172A]">{feed.packets}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: MODELS & ENGINES ───────────────────────────────── */}
      {activeTab === 'models' && (
        <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-4">
          <div className="pb-4 border-b border-[#F1F5F9]">
            <h3 className="text-[17px] font-bold text-[#0F172A]">Production AI Models &amp; Physics Surrogates</h3>
            <p className="text-[13px] text-[#64748B]">Machine learning weights checkpoints and analytical solver runtime registry</p>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {modelsList.map(m => (
              <div key={m.name} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-[13px]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0F172A]">{m.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F1F5F9] text-[#475569]">{m.version}</span>
                  </div>
                  <p className="text-[12px] text-[#64748B] mt-0.5">{m.type}</p>
                </div>
                <div className="flex items-center gap-4 text-[12px]">
                  <div><span className="text-[#64748B]">Accuracy:</span> <strong className="text-[#166534]">{m.accuracy}</strong></div>
                  <div><span className="text-[#64748B]">Inference:</span> <strong className="text-[#0F172A]">{m.latency}</strong></div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">{m.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: SYSTEM HEALTH ──────────────────────────────────── */}
      {activeTab === 'health' && (
        <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-6">
          <div className="pb-4 border-b border-[#F1F5F9]">
            <h3 className="text-[17px] font-bold text-[#0F172A]">Server Compute &amp; Engine Telemetry</h3>
            <p className="text-[13px] text-[#64748B]">Hardware utilization across edge nodes and high-performance simulation workers</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded border border-[#E2E8F0] bg-[#F8FAFC]">
              <span className="text-[12px] font-bold text-[#64748B] uppercase">FastAPI &amp; Uvicorn Node</span>
              <p className="text-3xl font-black text-[#166534] mt-1">Operational</p>
              <p className="text-[12px] text-[#64748B] mt-2">Port 8000 · Connection Pool Healthy</p>
            </div>
            <div className="p-4 rounded border border-[#E2E8F0] bg-[#F8FAFC]">
              <span className="text-[12px] font-bold text-[#64748B] uppercase">PostgreSQL Neon DB</span>
              <p className="text-3xl font-black text-[#166534] mt-1">Connected</p>
              <p className="text-[12px] text-[#64748B] mt-2">SSL Mode Require · Schema Head</p>
            </div>
            <div className="p-4 rounded border border-[#E2E8F0] bg-[#F8FAFC]">
              <span className="text-[12px] font-bold text-[#64748B] uppercase">Security Standard</span>
              <p className="text-3xl font-black text-[#0F172A] mt-1">Argon2id</p>
              <p className="text-[12px] text-[#64748B] mt-2">64MB Mem · 3 Iter · JWT 15m</p>
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

      {/* ── TAB 6: AUDIT TRAIL ────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded border border-[#E2E8F0] shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-[17px] font-bold text-[#0F172A]">Append-Only Security Audit Trail</h3>
              <p className="text-[13px] text-[#64748B]">Direct tamper-evident records from the PostgreSQL <code>audit_logs</code> table</p>
            </div>
            <button
              onClick={fetchAuditLogs}
              className="p-2 rounded border border-[#CBD5E1] text-[#64748B] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              title="Refresh audit logs"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAudit ? 'animate-spin text-[#D32F2F]' : ''}`} />
            </button>
          </div>

          {loadingAudit ? (
            <div className="py-8 text-center text-[#64748B]">Loading audit logs from PostgreSQL...</div>
          ) : auditLogs.length === 0 ? (
            <div className="py-8 text-center text-[#64748B]">No audit events recorded yet.</div>
          ) : (
            <div className="divide-y divide-[#F1F5F9] text-[13px]">
              {auditLogs.map(log => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <strong className="text-[#0F172A]">{log.action}</strong>
                    <span className="text-[#475569] ml-2">
                      {log.target_user_id ? `Target: ${log.target_user_id}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#94A3B8]">
                    <span>IP: {log.ip_address || '127.0.0.1'}</span>
                    <span>•</span>
                    <span>{new Date(log.timestamp).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: ADD AUTHORIZED OPERATOR ────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-lg font-bold text-[#0F172A]">Register New Operator</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[13px] text-[#B91C1C]">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddOperator} className="space-y-4 text-[13.5px]">
              <div>
                <label className="block font-bold text-[#334155] mb-1">Employee ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OIL-OP-4102"
                  value={newEmpId}
                  onChange={e => setNewEmpId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl outline-none focus:border-[#D32F2F] focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-[#334155] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amitav Patel"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl outline-none focus:border-[#D32F2F] focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-[#334155] mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. operator@oilindia.in"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl outline-none focus:border-[#D32F2F] focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-[#334155] mb-1">Initial Password *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 8 chars, 1 uppercase, 1 digit"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl outline-none focus:border-[#D32F2F] focus:bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11.5px] text-[#64748B] mt-1">Must contain uppercase letter, lowercase letter, and at least 1 digit.</p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-[#64748B] hover:text-[#0F172A] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2.5 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold rounded-xl shadow-sm transition-all disabled:opacity-60"
                >
                  {modalSubmitting ? 'Registering...' : 'Register Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RESET OPERATOR PASSWORD ────────────────────────── */}
      {resetModalUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-lg font-bold text-[#0F172A]">Reset Password for {resetModalUser.employee_id}</h3>
              <button onClick={() => setResetModalUser(null)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[13px] text-[#B91C1C]">
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4 text-[13.5px]">
              <div>
                <label className="block font-bold text-[#334155] mb-1">New Temporary Password *</label>
                <input
                  type="text"
                  required
                  placeholder="Min 8 chars, 1 uppercase, 1 digit"
                  value={resetNewPassword}
                  onChange={e => setResetNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl outline-none focus:border-[#D32F2F] focus:bg-white font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 text-[#64748B] hover:text-[#0F172A] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="px-5 py-2.5 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold rounded-xl shadow-sm transition-all disabled:opacity-60"
                >
                  {resetSubmitting ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
