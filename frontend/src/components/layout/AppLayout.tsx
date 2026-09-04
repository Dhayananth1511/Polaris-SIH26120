import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface AppLayoutProps { children: React.ReactNode; }

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => (
  <div className="app-shell">
    <Sidebar />
    <div className="main-area">
      <Header />
      <main className="page-content">
        {children}
      </main>
    </div>
  </div>
);
