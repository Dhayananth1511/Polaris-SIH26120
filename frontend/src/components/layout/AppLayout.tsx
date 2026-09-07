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

      {/* ── 1b. SIH26120 Section 55 Regulatory & Operational Banner ── */}
      <div className="bg-[#0F172A] text-[#94A3B8] px-3 sm:px-6 py-1 text-[11px] font-medium border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-2 z-30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9.5px] font-bold bg-[#D32F2F] text-white tracking-wider uppercase">
            AI-Enabled Well-to-Surface Digital Twin
          </span>
          <span className="hidden sm:inline text-[#CBD5E1] font-semibold">
            Baghewala Field · Oil India Limited
          </span>
          <span className="hidden md:inline text-[#475569]">|</span>
          <span className="text-[#F59E0B] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
            Prototype Mode — Synthetic/Simulated Data
          </span>
        </div>
        <div className="text-[10px] sm:text-[10.5px] text-[#94A3B8] italic truncate">
          AI recommendations are decision-support outputs and require engineer validation before operational use.
        </div>
      </div>

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
