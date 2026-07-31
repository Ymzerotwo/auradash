/**
 * ==========================================
 *        AuraDash Auth Controller
 * ==========================================
 * 
 * Handles HTTP requests for Auth operations.
 */

import { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { sendResponse } from '../utils/response';
import { rotateCsrfToken } from '../middleware/csrf';
import { AppContext } from '../types';
import { AuthService } from '../services/auth.services';
import { logger } from '../utils/logger';

// Authentication Controller
// Handles user login, session management, and password recovery flows.
// Integrates directly with Hono HTTP contexts and manages secure client cookies.
export const AuthController = {
  
  // CSRF Token Retrieval Handler
  // Generates and returns a fresh CSRF token for the client.
  // Leverages `rotateCsrfToken` to issue a token and secure state-changing endpoints.
  getCsrfToken: (c: Context<AppContext>) => {
    const token = rotateCsrfToken(c);
    return sendResponse(c, 200, 'CSRF_TOKEN_GENERATED', 'CSRF token generated successfully', { token });
  },

  /**
   * User Login Handler
   * Authenticates user credentials, provisions session in Cloudflare KV,
   * sets a secure HttpOnly cookie on the client, and rotates the CSRF token.
   * Handles edge cases like inactive/banned accounts and protects against session fixation.
   * 
   * @param c - The Hono HTTP context.
   */
  login: async (c: Context<AppContext>) => {
    const reqId = (c.get('requestId') as string) || 'unknown';
    const rawBody = c.req.valid('json' as never) as any;
    
    const username = rawBody.username;
    const rememberMe = rawBody.rememberMe;
    const password = rawBody.password; // Securely processed using Web Crypto API PBKDF2 hashing
    
    const db = c.env.DB;
    const rawUserAgent = c.req.header('user-agent') || 'Unknown';
    const rawIpAddress = c.req.header('cf-connecting-ip') || 'Unknown';
    
    const userAgent = rawUserAgent.substring(0, 255); // Truncate user agent string to match DB storage limits
    const ipAddress = rawIpAddress;

    try {
      const k1 = c.env.K1 || (c.env as any).auradash_kv || (c.env as any).KV;
      if (!k1) throw new Error("KV Namespace binding is missing");
      
      const result = await AuthService.login(db, k1, username, password, rememberMe, userAgent, ipAddress);
      
      if (result.error) {
        return sendResponse(c, result.status as any, result.error, result.message);
      }

      const hostname = new URL(c.req.url).hostname;
      const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1';
      
      // Set secure HTTP-only cookie for session tracking.
      // Uses Lax SameSite attribute to allow standard cross-site navigation while preventing CSRF.
      setCookie(c, 'session_id', result.sessionId as string, {
        path: '/',
        secure: isProduction,
        httpOnly: true,
        sameSite: 'Lax',
        expires: result.expiresAt
      });

      // Crucial Security Measure: Rotate CSRF token on login to prevent Session Fixation attacks
      rotateCsrfToken(c);

      return sendResponse(c, 200, 'LOGIN_SUCCESS', 'Logged in successfully', { user: result.user });
    } catch (error: any) {
      logger.error(reqId, `Login failed: ${error.message || error}`);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to login', null, error.message);
    }
  },

  /**
   * User Logout Handler
   * Revokes the session from the globally distributed KV Cache,
   * deletes the cookie from the client browser, and resets authentication state.
   * 
   * @param c - The Hono HTTP context.
   */
  logout: async (c: Context<AppContext>) => {
    const reqId = (c.get('requestId') as string) || 'unknown';
    const k1 = c.env.K1 || (c.env as any).auradash_kv;
    const sessionId = c.get('session_id') || getCookie(c, 'session_id');
    const db = c.env.DB;
    
    try {
      await AuthService.logout(db, k1, sessionId);

      const hostname = new URL(c.req.url).hostname;
      const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1';
      deleteCookie(c, 'session_id', {
        path: '/',
        secure: isProduction,
      });

      return sendResponse(c, 200, 'LOGOUT_SUCCESS', 'Logged out successfully');
    } catch (error: any) {
      logger.error(reqId, `Logout failed: ${error.message || error}`);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to logout', null, error.message);
    }
  },

  /**
   * Forgot Password Handler
   * Initiates the password recovery flow by generating and storing a 6-digit OTP in the DB,
   * then sending it to the user's email via Cloudflare Email Routing API.
   * Employs dummy database writes/reads to mitigate timing attacks (email enumeration).
   * 
   * @param c - The Hono HTTP context.
   */
  forgotPassword: async (c: Context<AppContext>) => {
    const reqId = (c.get('requestId') as string) || 'unknown';
    const rawBody = c.req.valid('json' as never) as { email: string };
    const { email } = rawBody;
    const db = c.env.DB;

    try {
      const result = await AuthService.forgotPassword(db, email, c.env);
      if (result.error) {
        return sendResponse(c, result.status as any, result.error, result.message);
      }
      return sendResponse(c, 200, 'RECOVERY_EMAIL_SENT', 'If the email exists, a recovery code has been sent.');
    } catch (error: any) {
      logger.error(reqId, `Forgot password request failed: ${error.message || error}`);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to process request', null, error.message);
    }
  },

  /**
   * Resend Reset Code Handler
   * Generates and sends a new OTP verification code for password recovery.
   * Checks if the account is banned before resending.
   * 
   * @param c - The Hono HTTP context.
   */
  resendResetCode: async (c: Context<AppContext>) => {
    const reqId = (c.get('requestId') as string) || 'unknown';
    const rawBody = c.req.valid('json' as never) as { email: string };
    const { email } = rawBody;
    const db = c.env.DB;

    try {
      const result = await AuthService.resendResetCode(db, email, c.env);
      if (result.error) {
        return sendResponse(c, result.status as any, result.error, result.message);
      }
      return sendResponse(c, 200, 'RECOVERY_EMAIL_SENT', 'A new recovery code has been sent to your email.');
    } catch (error: any) {
      logger.error(reqId, `Resend reset code failed: ${error.message || error}`);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to resend recovery code', null, error.message);
    }
  },

  /**
   * Verify Reset Code Handler
   * Validates the 6-digit OTP recovery code against the DB before password reset.
   * Implements strict brute-force protection using rate limiting on KV store to lock down attempts.
   * 
   * @param c - The Hono HTTP context.
   */
  verifyResetCode: async (c: Context<AppContext>) => {
    const reqId = (c.get('requestId') as string) || 'unknown';
    const rawBody = c.req.valid('json' as never) as { email: string, code: string };
    const { email, code } = rawBody;
    const db = c.env.DB;
    const k1 = c.env.K1 || (c.env as any).auradash_kv || (c.env as any).KV;
    const ipAddress = c.req.header('cf-connecting-ip') || 'Unknown';

    try {
      const result = await AuthService.verifyResetCode(db, k1, email, code, ipAddress);
      if (result.error) return sendResponse(c, result.status as any, result.error, result.message);
      return sendResponse(c, 200, 'CODE_VERIFIED', 'Recovery code is valid.');
    } catch (error: any) {
      logger.error(reqId, `Verify reset code failed: ${error.message || error}`);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to verify code', null, error.message);
    }
  },

  /**
   * Reset Password Handler
   * Validates the OTP recovery code and updates the user's password in the database.
   * Wipes the OTP code and revokes all active sessions for the user to prevent post-exploit access.
   * 
   * @param c - The Hono HTTP context.
   */
  resetPassword: async (c: Context<AppContext>) => {
    const reqId = (c.get('requestId') as string) || 'unknown';
    const rawBody = c.req.valid('json' as never) as any;
    
    const email = rawBody.email;
    const code = rawBody.code;
    const newPassword = rawBody.newPassword;
    
    const db = c.env.DB;
    const k1 = c.env.K1 || (c.env as any).auradash_kv || (c.env as any).KV;
    const ipAddress = c.req.header('cf-connecting-ip') || 'Unknown';

    try {
      const result = await AuthService.resetPassword(db, k1, email, code, newPassword, ipAddress);
      if (result.error) return sendResponse(c, result.status as any, result.error, result.message);
      return sendResponse(c, 200, 'PASSWORD_RESET_SUCCESS', 'Password has been reset successfully. You can now log in.');
    } catch (error: any) {
      logger.error(reqId, `Reset password failed: ${error.message || error}`);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to reset password', null, error.message);
    }
  }
};
