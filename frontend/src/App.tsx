import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage }           from './pages/LoginPage';
import { AppLayout }           from './components/layout/AppLayout';
import { CommandCenterPage }   from './pages/CommandCenterPage';
import { FieldStatusPage }     from './pages/FieldStatusPage';
import { WellExplorerPage }    from './pages/WellExplorerPage';
import { WellDetailsPage }     from './pages/WellDetailsPage';
import { ProductionPage }      from './pages/ProductionPage';
import { DigitalTwinPage }     from './pages/DigitalTwinPage';
import { SimulationLabPage }   from './pages/SimulationLabPage';
import { SrpOptimizerPage }    from './pages/SrpOptimizerPage';
import { CssOptimizerPage }    from './pages/CssOptimizerPage';
import { OptimizationPage }    from './pages/OptimizationPage';
import { ApprovalsPage }       from './pages/ApprovalsPage';
import { AIIntelligencePage }  from './pages/AIIntelligencePage';
import { AlertsPage }          from './pages/AlertsPage';
import { ReportsPage }         from './pages/ReportsPage';
import { ReservoirMonitorPage } from './pages/ReservoirMonitorPage';
import { SrpDiagnosticsPage }   from './pages/SrpDiagnosticsPage';
import { AdminManagementPage } from './pages/AdminManagementPage';
import { useAuthStore }        from './store/authStore';

// ─── Route Guard ──────────────────────────────────────────────────────────
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  if (user?.role !== 'admin') {
    return <Navigate to="/app/command-center" replace />;
  }
  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={user?.role === 'admin' ? "/app/admin/users" : "/app/command-center"} replace />;
};

const AppDefaultRedirect: React.FC = () => {
  const { user } = useAuthStore();
  return <Navigate to={user?.role === 'admin' ? "/app/admin/users" : "/app/command-center"} replace />;
};

export const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* Root & Public */}
      <Route path="/"      element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected — Digital Operations Core */}
      <Route
        path="/app/*"
        element={
          <PrivateRoute>
            <AppLayout>
              <Routes>
                {/* ── 12 CANONICAL SIH26120 PAGES ──────────────────── */}
                <Route path="overview"         element={<CommandCenterPage />} />
                <Route path="command-center"   element={<CommandCenterPage />} />
                <Route path="field-status"     element={<FieldStatusPage />} />
                <Route path="digital-twin"     element={<DigitalTwinPage tab="twin" />} />
                <Route path="reservoir"        element={<ReservoirMonitorPage />} />
                <Route path="css-optimizer"    element={<CssOptimizerPage />} />
                <Route path="css-operations"   element={<CssOptimizerPage />} />
                <Route path="srp-diagnostics"  element={<SrpDiagnosticsPage />} />
                <Route path="srp-optimizer"    element={<SrpOptimizerPage />} />
                <Route path="srp-operations"   element={<SrpOptimizerPage />} />
                <Route path="joint-optimizer"  element={<OptimizationPage tab="joint" />} />
                <Route path="smart-optimization" element={<OptimizationPage tab="joint" />} />
                <Route path="what-if"          element={<SimulationLabPage />} />
                <Route path="simulation-lab"   element={<SimulationLabPage />} />
                <Route path="alerts"           element={<AlertsPage />} />
                <Route path="historical-analysis" element={<ProductionPage />} />
                <Route path="production"       element={<ProductionPage />} />
                <Route path="recommendations"  element={<ApprovalsPage initialTab="pending" />} />

                {/* ── INTELLIGENCE ─────────────────────────────────── */}
                <Route path="wells"            element={<WellExplorerPage />} />
                <Route path="well-intelligence" element={<WellExplorerPage />} />
                <Route path="well-explorer"    element={<WellExplorerPage />} />
                <Route path="wells/:wellId"    element={<WellDetailsPage />} />
                <Route path="production"       element={<ProductionPage />} />
                <Route path="historical-analysis" element={<ProductionPage />} />
                <Route path="predictive-diagnostics" element={<AIIntelligencePage module="failure" />} />
                <Route path="ai/forecast"      element={<AIIntelligencePage module="forecast" />} />
                <Route path="ai/failure"       element={<AIIntelligencePage module="failure" />} />
                <Route path="ai/anomaly"       element={<AIIntelligencePage module="anomaly" />} />
                <Route path="ai/explain"       element={<AIIntelligencePage module="explain" />} />

                {/* ── OPTIMIZATION ─────────────────────────────────── */}
                <Route path="smart-optimization" element={<OptimizationPage tab="joint" />} />
                <Route path="joint-optimizer"  element={<OptimizationPage tab="joint" />} />
                <Route path="css-optimizer"    element={<CssOptimizerPage />} />
                <Route path="srp-optimizer"    element={<SrpOptimizerPage />} />
                <Route path="recommendations"  element={<ApprovalsPage initialTab="pending" />} />

                {/* ── GOVERNANCE ───────────────────────────────────── */}
                <Route path="alerts"           element={<AlertsPage />} />
                <Route path="approvals"        element={<ApprovalsPage initialTab="pending" />} />
                <Route path="audit-logs"       element={<ApprovalsPage initialTab="audit" />} />
                <Route path="reports"          element={<ReportsPage />} />

                {/* ── ADMINISTRATION (Admin Only) ────────────────────── */}
                <Route path="admin"            element={<AdminRoute><Navigate to="/app/admin/users" replace /></AdminRoute>} />
                <Route path="admin/users"      element={<AdminRoute><AdminManagementPage initialTab="users" /></AdminRoute>} />
                <Route path="admin/data"       element={<AdminRoute><AdminManagementPage initialTab="data" /></AdminRoute>} />
                <Route path="admin/models"     element={<AdminRoute><AdminManagementPage initialTab="models" /></AdminRoute>} />
                <Route path="admin/health"     element={<AdminRoute><AdminManagementPage initialTab="health" /></AdminRoute>} />
                <Route path="admin/config"     element={<AdminRoute><AdminManagementPage initialTab="config" /></AdminRoute>} />
                <Route path="admin/audit"      element={<AdminRoute><AdminManagementPage initialTab="audit" /></AdminRoute>} />
                <Route path="admin/*"          element={<AdminRoute><AdminManagementPage /></AdminRoute>} />

                {/* Default redirect inside app */}
                <Route path="*"               element={<AppDefaultRedirect />} />
              </Routes>
            </AppLayout>
          </PrivateRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
