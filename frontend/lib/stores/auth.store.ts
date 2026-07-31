import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  photo_url: string | null;
  role: 'Admin' | 'User';
  job_title: string | null;
  permissions: Record<string, boolean> | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  clear: () => void;
  hasPermission: (key: string) => boolean;
}

// Global hydration lock to prevent race-conditions during multiple simultaneous page mounts
let hydrateLock = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  hydrated: false,

  /**
   * Hydrates the authentication state by calling the backend /profile endpoint.
   * Leverages SSR check to instantly return if running on the server, saving resources.
   */
  hydrate: async () => {
    if (typeof window === 'undefined') return; // Hydration only runs client-side in the browser
    if (hydrateLock || get().loading || get().hydrated) return;
    
    hydrateLock = true;
    set({ loading: true });
    try {
      const res = await apiClient.get<{ data: { user: AuthUser } }>('/profile');
      set({ user: res.data.user, hydrated: true, loading: false });
    } catch {
      // Not authenticated or network error — clear state silently to reset client UI
      set({ user: null, hydrated: true, loading: false });
    } finally {
      hydrateLock = false;
    }
  },

  /**
   * Resets the authentication store variables.
   */
  clear: () => {
    set({ user: null, hydrated: false, loading: false });
  },

  /**
   * Permission authorization check.
   * Resolves permission pathing (e.g., 'articles.create') against the parsed user permissions object.
   * 
   * Crucial Security Features:
   * 1. Case-Insensitive Role Check: Supports both capitalized 'Admin' and lowercase 'admin'.
   * 2. Prototype Pollution Protection: Rejects traversing standard prototype properties.
   */
  hasPermission: (key: string) => {
    const user = get().user;
    if (!user) return false;
    
    // Admin role bypasses all granular permission validations
    if (user.role && user.role.toLowerCase() === 'admin') return true;
    
    if (!user.permissions) return false;
    
    const parts = key.split('.');
    let current: any = user.permissions;
    for (const part of parts) {
      // Security defense against prototype tampering attacks
      if (['__proto__', 'constructor', 'prototype'].includes(part)) return false;
      if (current === undefined || current === null) return false;
      current = current[part];
    }
    return current === true;
  },
}));
