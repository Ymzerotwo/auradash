import { LoginInput } from '../validations/auth.schema';
import { apiClient } from '../api/client';

/**
 * Authentication Service
 * Handles communication with the backend auth endpoints and manages the local 'authenticated' flag.
 */
export const AuthService = {
  /**
   * Performs user login. 
   * Note: The apiClient automatically handles CSRF tokens and HttpOnly cookies.
   */
  async loginWithCredentials(credentials: LoginInput): Promise<void> {
    await apiClient.post('/auth/login', credentials);

    // Set a dummy cookie for Next.js Middleware so it knows the user is logged in.
    // The actual secure HttpOnly cookie is managed securely by the backend.
    const days = credentials.rememberMe ? 30 : 7;
    const maxAge = days * 24 * 60 * 60;
    
    // Conditionally set Secure flag: only if on HTTPS or not on localhost/127.0.0.1
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const secureFlag = !isLocalhost ? '; Secure' : '';
    
    document.cookie = `session_id=authenticated; path=/; max-age=${maxAge}${secureFlag}; SameSite=Lax`;
  },

  /**
   * Logs out the user by hitting the backend API and clearing local state.
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (error) {
      console.warn('Logout request failed or network issue:', error);
    } finally {
      // apiClient.clearLocalSession() handles clearing cookies and localStorage safely
      apiClient.clearLocalSession();
      window.location.href = '/login';
    }
  },

  /**
   * Initiates the password recovery flow.
   */
  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  },

  /**
   * Verifies the 6-digit OTP before allowing password reset.
   */
  async verifyResetCode(email: string, code: string): Promise<void> {
    await apiClient.post('/auth/verify-code', { email, code });
  },

  /**
   * Commits the new password using the verified OTP.
   */
  async resetPassword(data: { email: string; code: string; newPassword: string }): Promise<void> {
    await apiClient.post('/auth/reset-password', data);
  }
};
