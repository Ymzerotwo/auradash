import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
}

/**
 * Application Global Store
 * Manages general UI state such as sidebar visibility and page loading.
 * Leverages localStorage persistence via Zustand middleware.
 * 
 * Persistence Note:
 * Only `sidebarCollapsed` is persisted (using `partialize`) to prevent temporary
 * state flags like `globalLoading` from leaking into subsequent browser sessions.
 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      globalLoading: false,
      setGlobalLoading: (loading) => set({ globalLoading: loading }),
    }),
    {
      name: 'auradash-app-store',
      // Store only structural layout settings in localStorage, excluding temporary screen loaders
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);
