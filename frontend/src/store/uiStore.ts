import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  selectedWellId: string;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  closeMobileMenu: () => void;
  setSelectedWellId: (wellId: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  selectedWellId: 'BGW-001',
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
  setSelectedWellId: (wellId) => set({ selectedWellId: wellId }),
}));
