import { create } from 'zustand';

interface AppState {
  versions: {
    notifications_version: string;
    inbox_version: string;
    comments_version: string;
    bookings_version: string;
  };
  counters: {
    notifications: number;
    inbox: number;
    comments: number;
    bookings: number;
  };
  setVersions: (versions: Partial<AppState['versions']>) => void;
  setCounters: (counters: Partial<AppState['counters']>) => void;
}

/**
 * State and Version Synchronization Store
 * Tracks data version hashes and numeric count badges for reactive dashboard updates.
 * Used to verify cache fresh status and synchronize UI indicator counters dynamically.
 */
export const useStateStore = create<AppState>((set) => ({
  versions: {
    notifications_version: '',
    inbox_version: '',
    comments_version: '',
    bookings_version: '',
  },
  counters: {
    notifications: 0,
    inbox: 0,
    comments: 0,
    bookings: 0,
  },
  
  /**
   * Updates state data version tracking hashes.
   */
  setVersions: (newVersions) => 
    set((state) => ({ versions: { ...state.versions, ...newVersions } })),
    
  /**
   * Synchronizes indicator count badges.
   */
  setCounters: (newCounters) => 
    set((state) => ({ counters: { ...state.counters, ...newCounters } })),
}));
