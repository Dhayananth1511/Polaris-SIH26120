import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white">
      {/* ── 1. Top Row: Full-width Header with 1st POLARIS Brand ── */}
      <Header />

      {/* ── 2. Content Area + Responsive Sidebar ─────────────────── */}
      <div className="relative flex flex-1 overflow-hidden w-full">
        {/* Sidebar: Desktop static sidebar + Mobile drawer overlay */}
        <Sidebar />

        {/* Main View Content: 100% full width on mobile/tablet, fills remaining space on desktop */}
        <main className="page-content flex-1 min-w-0 overflow-y-auto bg-white w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
