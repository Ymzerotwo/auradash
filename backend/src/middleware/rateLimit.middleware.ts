/**
 * ==========================================
 *       AuraDash Rate Limit Middleware
 * ==========================================
 * 
 * Global Rate Limiting Middleware
 * 
 * Protects the API from Brute Force and DDoS attacks by tracking the number of
 * requests made within a specific time window using Cloudflare Rate Limiting bindings.
 */

import { Context, Next } from 'hono';
import { sendResponse } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Creates a rate limiting middleware using Cloudflare's Rate Limiter binding.
 * Generates composite keys using client IP and User ID to ensure fair usage.
 * 
 * CRITICAL: The Cloudflare Rate Limiting binding call is wrapped in a try-catch block
 * to enforce a "Fail-Open" policy. If Cloudflare's rate limiter service fails,
 * we log the incident and allow the request to proceed, avoiding a platform outage.
 * 
 * @param limiterName - The exact key of the Cloudflare Rate Limiter binding.
 * @param excludePaths - Array of path substrings to exempt from rate limiting.
 * @returns A Hono middleware function.
 */
export const rateLimiter = (
    limiterName: 'PUBLIC_LIMITER' | 'AUTH_LIMITER' | 'GLOBAL_LIMITER' | 'DASHBOARD_LIMITER' | 'LOGIN_RECOVERY_LIMITER' | 'VERIFY_CODE_LIMITER' | 'STATE_LIMITER' | 'NOTIFICATIONS_LIMITER' | 'PUBLIC_SUBMISSION_LIMITER' | 'FILES_LIMITER' | 'HEALTH_LIMITER', 
    excludePaths: string[] = []
) => {
    return async (c: Context, next: Next) => {
        // 1. Exclude Specific Paths (Bypass rate limiting)
        // Useful for Webhooks or internal service routes that handle high traffic natively.
        // Also bypass globally in Vitest to prevent parallel test collisions (Miniflare RateLimiter shares state),
        // unless we are explicitly testing the rate limiter.
        
        // CRITICAL: Safely inspect environment context before reading variables.
        // Prevents crashes in environments where `c.env` is not instantiated.
        const isVitest = c.env && (c.env as any).IS_VITEST === true;
        const isRateLimitTest = c.req.header('x-test-rate-limit') === 'true';
        
        if (isVitest && !isRateLimitTest) {
            return await next();
        }

        const url = new URL(c.req.url);
        if (excludePaths.some(excluded => {
            const norm = excluded.endsWith('/') ? excluded.slice(0, -1) : excluded;
            return url.pathname === norm || 
                   url.pathname.startsWith(norm + '/') || 
                   url.pathname.includes(norm + '/') || 
                   url.pathname.endsWith(norm);
        })) {
            return await next();
        }

        // 2. Identify the Client IP
        // Rely on Cloudflare's secure headers rather than easily spoofed X-Forwarded-For.
        const ip = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || 'unknown';

        // 3. Composite Key Generation
        // Using IP alone can block entire offices sharing a single public IP (NAT).
        // By appending the User ID (if authenticated), we rate limit per user per IP, 
        // which is significantly fairer and prevents collateral damage.
        const user = c.get('user');
        const sessionKey = user ? user.id : 'guest';
        const rateLimitKey = `${ip}_${sessionKey}`;

        const reqId = (c.get('requestId') as string) || 'unknown';

        const limiter = c.env ? c.env[limiterName] : null;

        if (!limiter) {
            // Failsafe: Allow request if we are in local dev and the binding isn't passed
            return await next();
        }

        // 4. Consume Quota
        // Send the composite key to Cloudflare's Edge to check/consume the available request quota.
        let success = true;
        try {
            const result = await limiter.limit({ key: rateLimitKey });
            success = result.success;
        } catch (err: any) {
            logger.error(reqId, `Rate limiter execution failed for ${rateLimitKey}: ${err.message || err}`);
        }

        if (!success) {
            // Immediate rejection of the request before it reaches the DB or expensive logic
            logger.warn(reqId, `Rate limit exceeded for client ${rateLimitKey} on path: ${url.pathname}`);
            return sendResponse(c, 429, 'RATE_LIMIT_EXCEEDED', "Too many requests, please try again later.");
        }

        await next();
    };
};
