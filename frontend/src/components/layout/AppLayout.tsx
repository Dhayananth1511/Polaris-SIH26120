import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { TelemetryReplayBar } from '../simulation/TelemetryReplayBar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white">
      {/* ── 1. Top Row: Full-width Header with POLARIS Brand ── */}
      <Header />

      {/* ── 2. Content Area + Responsive Sidebar ─────────────────── */}
      <div className="relative flex flex-1 overflow-hidden w-full">
        {/* Sidebar: Desktop static sidebar + Mobile drawer overlay */}
        <Sidebar />

        {/* Main Content Area with Top Telemetry Replay Bar ──────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden w-full bg-white">
          <TelemetryReplayBar defaultCollapsed={false} />
          <main className="page-content flex-1 min-w-0 overflow-y-auto bg-white w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
