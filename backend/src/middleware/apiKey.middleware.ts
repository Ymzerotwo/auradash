/**
 * ==========================================
 *        AuraDash API Key Middleware
 * ==========================================
 * 
 * Secures public API endpoints utilizing stateless HMAC-SHA256 verification.
 * This prevents unnecessary database lookups on the edge while ensuring 
 * that only authorized clients (matching the specific domain) can access the API.
 * 
 * CRITICAL NOTE: This middleware is the first line of defense. Any changes here
 * must ensure that domain binding cannot be bypassed unless explicitly using a test key.
 */

import { Context, Next } from 'hono';
import { verifyApiKey, normalizeDomain } from '../utils/crypto';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { logger } from '../utils/logger';

/**
 * Validates the incoming API Key and enforces strict domain boundaries.
 * 
 * @param c - The Hono request context.
 * @param next - The next middleware function in the pipeline.
 * @returns Response or proceeds to next middleware.
 */
export const apiKeyAuth = async (c: Context<AppContext>, next: Next) => {
  const reqId = (c.get('requestId') as string) || 'unknown';

  // 1. Extract the API key securely from headers.
  // We support both the standard 'x-api-key' and 'Authorization: Bearer' formats.
  let apiKey = c.req.header('x-api-key');
  if (!apiKey) {
    const authHeader = c.req.header('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      apiKey = authHeader.substring(7).trim();
    }
  } else {
    apiKey = apiKey.trim();
  }

  if (!apiKey) {
    return sendResponse(c, 401, 'API_KEY_MISSING', 'API Key is required to access public endpoints.');
  }

  // CRITICAL: The Master Secret is required to verify the HMAC signature.
  // If this is missing, the entire validation mechanism fails open/closed.
  const secret = c.env?.AURADASH_MASTER_SECRET;
  if (!secret) {
    logger.error(reqId, 'CRITICAL: AURADASH_MASTER_SECRET is not set in environment variables.');
    return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'API Key verification failed due to missing server configuration.');
  }

  // 2. Mathematically verify the token using HMAC-SHA256.
  // This step ensures the token was minted by this server and hasn't been tampered with.
  const { valid, payload, normalizedDomain, isTestKey } = await verifyApiKey(apiKey, secret);
  
  if (!valid || !payload) {
    return sendResponse(c, 401, 'INVALID_API_KEY', 'The provided API Key is invalid or has been revoked.');
  }

  // 3. Stateless Test Key check.
  // CRITICAL: Test keys bypass domain binding but have a mathematically proven expiration time.
  // They do not require domain binding or Origin/Referer headers.
  if (isTestKey) {
    c.set('apiKeyDomain', 'test');
    return await next();
  }

  if (!normalizedDomain || typeof normalizedDomain !== 'string') {
    return sendResponse(c, 401, 'INVALID_API_KEY', 'The provided API Key is invalid or has been revoked.');
  }

  // 4. Strict Domain Binding & Origin Protection.
  // To prevent stolen API keys from being abused by malicious websites, 
  // we strictly compare the origin of the request against the domain baked into the key.
  const originHeader = c.req.header('origin');
  const refererHeader = c.req.header('referer');
  
  let requestDomain = '';
  if (originHeader) {
    requestDomain = normalizeDomain(originHeader);
  } else if (refererHeader) {
    requestDomain = normalizeDomain(refererHeader);
  }

  // NOTE: Browser environments automatically attach Origin/Referer.
  // Strict enforcement: Origin or Referer is ALWAYS required, even for localhost or development.
  if (!requestDomain) {
    return sendResponse(c, 403, 'ORIGIN_REQUIRED', 'Origin or Referer header is required for API Key authentication.');
  }

  // Ensure the request originates from the exact domain or a subdomain of the domain the key was issued for.
  const isExactMatch = requestDomain === normalizedDomain;
  const isSubdomainMatch = requestDomain.endsWith(`.${normalizedDomain}`);

  if (!isExactMatch && !isSubdomainMatch) {
    logger.warn(reqId, `[API Key] Domain mismatch: Expected ${normalizedDomain} or its subdomains, got ${requestDomain}`);
    return sendResponse(c, 403, 'DOMAIN_MISMATCH', 'This API Key is not authorized for the requesting domain.');
  }

  // 5. Expose the validated domain downstream so subsequent routes can rely on it securely.
  c.set('apiKeyDomain', normalizedDomain);

  await next();
};

