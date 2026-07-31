/**
 * ==========================================
 *        AuraDash CSRF Middleware
 * ==========================================
 * 
 * CSRF Protection Middleware (Double Submit Cookie Pattern)
 * 
 * Mitigates Cross-Site Request Forgery attacks by ensuring that state-changing
 * requests (POST, PUT, DELETE) originate from our own authenticated frontend.
 */

import { Context, Next } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { sendResponse } from '../utils/response';
import { timingSafeEqual } from '../utils/crypto';
import { logger } from '../utils/logger';

/**
 * Determines if the request is running in a production environment based on the hostname.
 * Uses parsed hostname instead of string matching to prevent bypasses 
 * (e.g., an attacker appending `?redirect=http://localhost` to fool a string match).
 * 
 * @param url - The full request URL to analyze.
 * @returns True if the hostname is not localhost or 127.0.0.1.
 */
const isProductionRequest = (url: string): boolean => {
  const hostname = new URL(url).hostname;
  return hostname !== 'localhost' && hostname !== '127.0.0.1';
};

/**
 * Generates a secure random token, sets it as a client cookie, and injects it into response headers.
 * 
 * CRITICAL: httpOnly is explicitly set to false. This is required because the frontend JS
 * checks if the `csrf_token` cookie exists in `document.cookie` before proceeding,
 * and clears it client-side on logout/errors.
 * 
 * @param c - The Hono request context.
 * @returns The generated hex token string.
 */
export const rotateCsrfToken = (c: Context): string => {
  const isProduction = isProductionRequest(c.req.url);
  
  // Web Crypto API is native and secure in Cloudflare Workers
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

  setCookie(c, 'csrf_token', token, {
    path: '/',
    secure: isProduction, // HTTPS required in production
    sameSite: 'Lax',      // Prevents cookie from being sent on cross-site POSTs
    httpOnly: false,      // Frontend JS MUST be able to read this
    maxAge: 24 * 60 * 60, // 24 hours validity
  });

  c.header('X-CSRF-Token', token);
  return token;
};

/**
 * CSRF Protection middleware handler.
 * Implements the Double Submit Cookie pattern and strict Origin/Referer header checks.
 * 
 * @param c - The Hono request context.
 * @param next - The next middleware handler in Hono's execution chain.
 */
export const csrfProtection = async (c: Context, next: Next) => {
  const reqId = (c.get('requestId') as string) || 'unknown';
  const isProduction = isProductionRequest(c.req.url);
  const method = c.req.method;

  // 1. Skip safe methods (Read-only methods don't mutate state, so CSRF is irrelevant)
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  // 2. Exempt the /csrf endpoint itself to allow initial token fetching
  const path = c.req.path;
  if (path.endsWith('/csrf')) {
    return next();
  }

  // 3. Double Submit Cookie Validation
  // Attackers can't read cookies across domains due to the Same-Origin Policy.
  // Therefore, they can't duplicate the cookie value into the required header.
  const cookieToken = getCookie(c, 'csrf_token');
  const headerToken = c.req.header('x-csrf-token');

  // We use constant-time comparison (timingSafeEqual) to prevent timing side-channel attacks.
  if (!cookieToken || !headerToken || !timingSafeEqual(cookieToken, headerToken)) {
    logger.warn(reqId, `CSRF token validation failed. Cookie present: ${!!cookieToken}, Header present: ${!!headerToken}`);
    return sendResponse(c, 403, 'CSRF_TOKEN_MISMATCH', 'Invalid or Missing CSRF Token', null, {
      cookiePresent: !!cookieToken,
      headerPresent: !!headerToken
    });
  }

  // 4. Strict Origin Validation (Defense in Depth)
  // Ensures the request originated from a trusted domain.
  const origin = c.req.header('origin');
  const referer = c.req.header('referer');
  const source = origin ?? referer;

  // In production, we strictly require either Origin or Referer header to verify the source.
  if (isProduction && !source) {
    logger.warn(reqId, 'CSRF validation failed: Missing Origin/Referer header in production');
    return sendResponse(c, 403, 'CSRF_MISSING_SOURCE', 'Missing Origin/Referer header', null);
  }

  if (source) {
    try {
      const sourceOrigin = new URL(source).origin;
      
      // Fetch allowed origins from environment variable
      const envOrigins = ((c.env as any)?.ALLOWED_ORIGINS || '')
        .split(',')
        .map((o: string) => o.trim())
        .filter(Boolean);
        
      const defaultOrigins = isProduction 
        ? ['https://auradash.com'] 
        : ['http://localhost:3000', 'http://localhost:3001'];
        
      const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;
      
      // CRITICAL: Checks the source origin against allowed origins in both dev and prod,
      // protecting local development from CSRF attacks from external malicious sites.
      if (!allowedOrigins.includes(sourceOrigin)) {
        logger.warn(reqId, `CSRF validation failed: Origin '${sourceOrigin}' is not allowed`);
        return sendResponse(c, 403, 'CSRF_ORIGIN_MISMATCH', 'Cross-Origin Request Blocked', null);
      }
    } catch {
      logger.error(reqId, `CSRF validation failed: Invalid Origin/Referer header format: '${source}'`);
      return sendResponse(c, 403, 'CSRF_INVALID_SOURCE', 'Invalid Origin/Referer Header Format', null);
    }
  }

  await next();
};
