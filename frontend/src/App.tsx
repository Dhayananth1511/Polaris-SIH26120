import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage }            from './pages/HomePage';
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
import { ReportsPage }         from './pages/ReportsPage';
import { AlertsPage }          from './pages/AlertsPage';
import { AdminManagementPage } from './pages/AdminManagementPage';
import { useAuthStore }        from './store/authStore';

// ─── Route Guard ──────────────────────────────────────────────────────────
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

export const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* Public */}
      <Route path="/"      element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected — Digital Operations Core */}
      <Route
        path="/app/*"
        element={
          <PrivateRoute>
            <AppLayout>
              <Routes>
                {/* ── COMMAND CENTER ───────────────────────────────── */}
                <Route path="command-center"   element={<CommandCenterPage />} />
                <Route path="field-status"     element={<FieldStatusPage />} />

                {/* ── FIELD OPERATIONS ─────────────────────────────── */}
                <Route path="css-operations"   element={<CssOptimizerPage />} />
                <Route path="srp-operations"   element={<SrpOptimizerPage />} />
                <Route path="srp-diagnostics"  element={<SrpOptimizerPage />} />

                {/* ── DIGITAL TWIN ─────────────────────────────────── */}
                <Route path="digital-twin"     element={<DigitalTwinPage tab="twin" />} />
                <Route path="simulation-lab"   element={<SimulationLabPage />} />

                {/* ── INTELLIGENCE ─────────────────────────────────── */}
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

                {/* ── ADMINISTRATION ───────────────────────────────── */}
                <Route path="admin/users"      element={<AdminManagementPage initialTab="users" />} />
                <Route path="admin/data"       element={<AdminManagementPage initialTab="data" />} />
                <Route path="admin/models"     element={<AdminManagementPage initialTab="models" />} />
                <Route path="admin/health"     element={<AdminManagementPage initialTab="health" />} />
                <Route path="admin/config"     element={<AdminManagementPage initialTab="config" />} />
                <Route path="admin/audit"      element={<AdminManagementPage initialTab="audit" />} />
                <Route path="admin/*"          element={<AdminManagementPage />} />

                {/* Default redirect inside app */}
                <Route path="*"               element={<Navigate to="/app/command-center" replace />} />
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
