export const getApiBaseUrl = (): string => {
  // 1. Client-side runtime injected global from server (supports Cloudflare Secret / Runtime Env)
  if (typeof window !== 'undefined' && (window as any).__AURADASH_API_URL__) {
    return (window as any).__AURADASH_API_URL__;
  }
  // 2. Build-time inlined environment variable
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // 3. Server-side runtime environment variable
  if (typeof process !== 'undefined' && process.env && process.env.API_URL) {
    return process.env.API_URL;
  }
  // 4. Localhost fallback or error reporting
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.error('[CONFIG ERROR] NEXT_PUBLIC_API_URL environment variable is not configured.');
    return '';
  }
  return 'http://localhost:8787/api';
};

export const API_BASE_URL = getApiBaseUrl();

export type { ApiResponse, ProcessedResponse } from './responseHandler';
export { processApiResponse, resolveSlugTranslation, resolveValidationDetails } from './responseHandler';

export interface ValidationError {
  field?: string;
  issue: string;
}

/**
 * Custom API Error representation.
 * Standardizes errors returned from the AuraDash backend.
 */
export class ApiError extends Error {
  public slug: string;
  public code: number;
  public details?: ValidationError[];
  public debug?: any;

  constructor(message: string, slug: string, code: number, details?: ValidationError[], debug?: any) {
    super(message);
    this.name = 'ApiError';
    this.slug = slug;
    this.code = code;
    this.details = details;
    this.debug = debug;
  }

  /**
   * Helper to quickly get the validation error message for a specific field.
   * Useful for form inputs (e.g., error={error.getFieldError('email')})
   */
  public getFieldError(fieldName: string): string | undefined {
    return this.details?.find(d => d.field === fieldName)?.issue;
  }

  /**
   * Helper to get the first validation error, or fallback to the main message.
   * Useful for global toast notifications.
   */
  public getFirstError(): string {
    if (this.details && this.details.length > 0) {
      return this.details[0].issue;
    }
    return this.message;
  }
}

// Module-level cache for the CSRF token.
// Used client-side to prevent redundant network round-trips.
let cachedCsrfToken: string | null = null;

export const apiClient = {
  /**
   * Resolves and sets the active CSRF token.
   * Attempts to read from cookies first to bypass network calls.
   * Safe to call on both client-side and server-side (no-op on SSR).
   */
  async ensureCsrfToken(): Promise<void> {
    if (typeof window === 'undefined') return; // CSRF token is not required or cached during SSR
    if (cachedCsrfToken) return;
    
    // Check if the csrf_token cookie exists first to bypass making a network request
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
      if (match && match[1]) {
        cachedCsrfToken = match[1];
        return;
      }
    }

    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/auth/csrf`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      if (data?.data?.token) {
        cachedCsrfToken = data.data.token;
      }
    } catch (e) {
      console.warn("Failed to fetch CSRF token", e);
    }
  },

  /**
   * Clears all session state stored client-side (cookies, localStorage).
   * Prevents credential leaks and resets UI states.
   */
  clearLocalSession() {
    if (typeof document !== 'undefined') {
      document.cookie = "session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      document.cookie = "session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Lax";
      cachedCsrfToken = null;
    }
    if (typeof window !== 'undefined') {
      try {
        const appKeys = Object.keys(localStorage).filter(k => 
          k.startsWith('auradash-') || k.startsWith('app-') || k === 'sidebar-collapsed'
        );
        appKeys.forEach(k => localStorage.removeItem(k));
      } catch {}
    }
  },

  /**
   * Triggers re-hydration on the authentication state manager.
   * Executed on client-side context only.
   */
  triggerAuthRefresh() {
    if (typeof window !== 'undefined') {
      import('../stores/auth.store').then(({ useAuthStore }) => {
        useAuthStore.getState().hydrate();
      });
    }
  },

  /**
   * Base Fetch wrapper supporting CSRF token injection, automatic cookie syncing,
   * session expiry detection, account status validation, transparent CSRF retries,
   * and automatic request timeouts for offline/network issues.
   */
  async fetch<T = unknown>(endpoint: string, options: RequestInit & { timeoutMs?: number } = {}, isRetry = false): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;
    const headers = new Headers(options.headers || {});
    const method = (options.method || 'GET').toUpperCase();
    const timeoutMs = options.timeoutMs || 25000; // 25 seconds timeout default

    // Auto-set JSON Content-Type if not uploading files/form-data
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Attach CSRF token for state-changing HTTP requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      await this.ensureCsrfToken();
      if (cachedCsrfToken) headers.set('x-csrf-token', cachedCsrfToken);
    }

    // Setup Timeout AbortController
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
        signal: options.signal || controller.signal,
      });

      clearTimeout(timerId);

      // Clear cached CSRF token on mutating requests so the next operation receives a fresh token
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        cachedCsrfToken = null;
      }

      // Sync backend token rotation headers automatically (case-insensitive get)
      const newToken = response.headers.get('x-csrf-token');
      if (newToken) cachedCsrfToken = newToken;

      const contentType = response.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        data = await response.json().catch(() => null);
      } else {
        const text = await response.text().catch(() => '');
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
      }

      // STRICT VALIDATION: If response is not OK, or body is not a valid JSON object, or success !== true
      if (!response.ok || !data || typeof data !== 'object' || data.success !== true) {
        // If the server returned HTML or non-JSON (e.g. when NEXT_PUBLIC_API_URL points to frontend instead of backend)
        if (!data || typeof data !== 'object') {
          throw new ApiError(
            'Invalid response from server. Please ensure NEXT_PUBLIC_API_URL points to the backend Worker API (e.g. https://api.yourdomain.com/api).',
            'INVALID_API_RESPONSE',
            response.status || 500
          );
        }

        // Handle CSRF Desynchronization: Clear old token, fetch a new one, and retry once transparently.
        if (response.status === 403 && data?.slug === 'CSRF_TOKEN_MISMATCH') {
          cachedCsrfToken = null;
          if (typeof document !== 'undefined') {
            document.cookie = "csrf_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          }
          if (!isRetry) {
            await this.ensureCsrfToken();
            return this.fetch<T>(endpoint, options, true);
          }
        }

        // Global session expiration handler (redirects user to login page)
        if (response.status === 401 && ['SESSION_EXPIRED', 'INVALID_SESSION', 'UNAUTHORIZED'].includes(data?.slug)) {
          this.clearLocalSession();
          if (typeof window !== 'undefined') {
            window.location.href = '/login?expired=true';
          }
        }

        // Global ban handler (redirects user to banned landing page)
        if (response.status === 403 && data?.slug === 'ACCOUNT_BANNED') {
          this.clearLocalSession();
          if (typeof window !== 'undefined') {
            window.location.href = '/banned';
          }
        }

        // Global forbidden handler (forces UI permission re-evaluations)
        if (response.status === 403 && data?.slug === 'FORBIDDEN') {
          this.triggerAuthRefresh();
        }

        throw new ApiError(
          data?.message || 'Unknown Server Error',
          data?.slug || 'UNKNOWN_ERROR',
          response.status,
          data?.details,
          data?.debug
        );
      }

      return data as T;
    } catch (error) {
      clearTimeout(timerId);
      if (error instanceof ApiError) throw error;
      
      // Handle timeout and network-level errors gracefully
      throw new ApiError(
        'A network error occurred. Please check your internet connection.',
        'NETWORK_ERROR',
        0
      );
    }
  },

  async get<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.fetch<T>(endpoint, { ...options, method: 'GET' });
  },

  async post<T = unknown, B = unknown>(endpoint: string, body: B, options: RequestInit = {}): Promise<T> {
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async put<T = unknown, B = unknown>(endpoint: string, body: B, options: RequestInit = {}): Promise<T> {
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async patch<T = unknown, B = unknown>(endpoint: string, body: B, options: RequestInit = {}): Promise<T> {
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  async delete<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  },

  async upload<T = unknown>(endpoint: string, file: File, fieldName: string = 'file', options: RequestInit = {}): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    });
  }
};
