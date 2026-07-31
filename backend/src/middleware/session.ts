/**
 * ==========================================
 *        AuraDash Session Middleware
 * ==========================================
 * 
 * Session Authentication Middleware
 * 
 * Verifies user identity using session tokens stored in Cloudflare KV.
 * KV is used instead of D1 (Database) because KV is globally distributed and 
 * extremely fast, making session validation lightning-quick across the globe.
 */

import { Context, Next } from 'hono';
import { getCookie, deleteCookie } from 'hono/cookie';
import { AppContext } from '../types';
import { sendResponse } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Clears the session cookie from the client browser.
 * 
 * CRITICAL: The `secure` attribute must match the environment configuration (disabled on localhost).
 * If there is a mismatch (e.g., trying to delete a non-secure cookie using secure: true),
 * the browser will silently ignore the deletion request, leading to stale session issues in local dev.
 * 
 * @param c - The Hono request context.
 */
const deleteSessionCookie = (c: Context<AppContext>) => {
  const isProduction = !c.req.url.includes('localhost') && !c.req.url.includes('127.0.0.1');
  deleteCookie(c, 'session_id', { path: '/', secure: isProduction, sameSite: 'Lax' });
};

/**
 * Validates the session token from cookies or authorization headers against Cloudflare KV storage.
 * Injects authenticated user context securely into Hono context variables.
 * 
 * @param c - The Hono request context.
 * @param next - The next middleware handler in Hono's execution chain.
 */
export const sessionMiddleware = async (c: Context<AppContext>, next: Next) => {
  const reqId = (c.get('requestId') as string) || 'unknown';
  
  // 1. Extract session ID from Authorization header (Bearer token) or HTTP Cookie
  // Supporting both allows API access via Mobile Apps (Headers) and Web Browsers (Cookies).
  const authHeader = c.req.header('Authorization');
  let sessionId = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    sessionId = authHeader.split(' ')[1];
  } else {
    // Use Hono's built-in getCookie for safer parsing
    sessionId = getCookie(c, 'session_id') || '';
  }

  if (!sessionId || !sessionId.startsWith('session:')) {
    deleteSessionCookie(c);
    return sendResponse(c, 401, 'UNAUTHORIZED', 'No session provided or invalid format');
  }

  // CRITICAL: Safely query environment bindings before checking the KV database.
  // This prevents fatal server crashes in environments where `c.env` is undefined.
  const k1 = c.env ? (c.env.K1 || (c.env as any).auradash_kv) : null;
  if (!k1) {
    logger.error(reqId, 'KV Namespace binding (K1) is missing from environment');
    return sendResponse(c, 500, 'SERVER_ERROR', 'Session verification service unavailable');
  }

  // 2. Retrieve session from KV Cache (Fast Edge Storage)
  const sessionDataStr = await k1.get(sessionId);

  if (!sessionDataStr) {
    deleteSessionCookie(c); // Clear stale cookie from client
    return sendResponse(c, 401, 'INVALID_SESSION', 'Invalid or expired session');
  }

  // Safe JSON parsing with error handling to protect against corrupted KV data
  let sessionData: any;
  try {
    sessionData = JSON.parse(sessionDataStr);
  } catch (e: any) {
    logger.error(reqId, `Corrupted session data in KV for key: ${sessionId}. Error: ${e.message || e}`);
    await k1.delete(sessionId);
    deleteSessionCookie(c);
    return sendResponse(c, 401, 'CORRUPT_SESSION', 'Session data is corrupted');
  }

  // Schema validation — Ensure required fields exist before trusting the cached data.
  // This prevents crashes if the KV structure changes in future deployments.
  if (
    !sessionData
    || typeof sessionData !== 'object'
    || !sessionData.user_id
    || !sessionData.role
    || !sessionData.expires_at
  ) {
    logger.error(reqId, `Invalid session schema in KV for key: ${sessionId}`);
    await k1.delete(sessionId);
    deleteSessionCookie(c);
    return sendResponse(c, 401, 'INVALID_SESSION_DATA', 'Session data is invalid or incomplete');
  }

  // 3. Security & Access Checks
  if (sessionData.is_banned === 1 || sessionData.is_banned === true) {
    logger.warn(reqId, `Banned user ${sessionData.user_id} attempted access`);
    deleteSessionCookie(c);
    await k1.delete(sessionId);
    return sendResponse(c, 403, 'ACCOUNT_BANNED', 'User account is banned');
  }

  const expiresAt = new Date(sessionData.expires_at);
  const now = new Date();

  if (expiresAt < now) {
    logger.info(reqId, `Expired session clean up for user ${sessionData.user_id}`);
    // Proactively clean up expired sessions from KV to save storage space
    await k1.delete(sessionId);
    deleteSessionCookie(c);
    return sendResponse(c, 401, 'SESSION_EXPIRED', 'Session has expired, please login again');
  }

  // 4. IP and User-Agent Verification (Session Hijacking Protection)
  const currentIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
  const currentUserAgent = c.req.header('user-agent') || 'unknown';
  let sessionModified = false;

  if (sessionData.ip_address && sessionData.ip_address !== currentIp) {
    if (sessionData.user_agent && sessionData.user_agent !== currentUserAgent) {
      logger.warn(reqId, `Suspicious activity: IP and User-Agent changed for user ${sessionData.user_id} (Role: ${sessionData.role}).`);
      
      if (sessionData.role !== 'Admin') {
        if (c.env && c.env.DB) {
          try {
            await c.env.DB.prepare('UPDATE Users SET is_banned = 1 WHERE id = ?').bind(sessionData.user_id).run();
          } catch (e: any) {
            logger.error(reqId, `Failed to suspend user ${sessionData.user_id}: ${e.message || e}`);
          }
        }
        await k1.delete(sessionId);
        deleteSessionCookie(c);
        return sendResponse(c, 403, 'ACCOUNT_SUSPENDED', 'Account suspended due to suspicious activity');
      } else {
        // Admins are logged out for security but their accounts are not banned
        await k1.delete(sessionId);
        deleteSessionCookie(c);
        return sendResponse(c, 401, 'SESSION_INVALIDATED', 'Session invalidated for security reasons. Please login again.');
      }
    } else {
      sessionData.ip_address = currentIp;
      sessionModified = true;
    }
  } else if (!sessionData.ip_address && currentIp !== 'unknown') {
    sessionData.ip_address = currentIp;
    sessionData.user_agent = currentUserAgent;
    sessionModified = true;
  }

  if (sessionModified) {
    const remainingTime = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
    if (remainingTime > 0) {
      await k1.put(sessionId, JSON.stringify(sessionData), { expirationTtl: remainingTime });
    }
  }

  // 5. Attach valid session and user context to the Request
  // This makes `c.get('user')` securely available to all subsequent controllers and middlewares.
  c.set('session_id', sessionData.session_id || sessionId);
  c.set('user', {
    id: sessionData.user_id,
    email: sessionData.email,
    role: sessionData.role,
    permissions: sessionData.permissions,
  });

  await next();
};
