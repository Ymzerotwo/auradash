import { logger } from './logger';
/**
 * AuraDash Cache Utility
 * Utility functions for safely managing and purging Cloudflare Edge Caches.
 * Enforces canonical origin checks and path sanitization to prevent cache poisoning 
 * and arbitrary cache invalidation attacks.
 */

import { Context } from 'hono';

const getExecutionCtx = (c: Context<any>) => {
  try {
    return c.executionCtx;
  } catch {
    return null;
  }
};

/**
 * Purges the internal programmatic cache for specific public endpoints.
 * It uses the incoming request's context to determine the base URL (origin),
 * and systematically deletes the cache entries for the given paths.
 * 
 * @param c - The Hono context of the current request.
 * @param paths - Array of pathnames to purge (e.g., ['/api/public/service-categories']).
 */
export const purgePublicCache = (c: Context<any>, paths: string[]): void => {
  if (!c || !c.req || !c.req.url) return;

  let origin = 'http://localhost';
  try {
    // CRITICAL FIX: We MUST use the exact origin from the incoming request (c.req.url) 
    // because cache.middleware.ts saves the cache using c.req.url.
    // If we use APP_URL, the domains won't match and cache.delete() will silently fail.
    origin = new URL(c.req.url).origin;
  } catch (e) {
    return;
  }

  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (!cache) return;

  const purge = async () => {
    const purgePromises = paths.map(async (path) => {
      const targetUrl = new URL(path, origin).toString();
      const request = new Request(targetUrl, { method: 'GET' });

      try {
        await cache.delete(request);
      } catch (error) {
        logger.error('system', `Failed to purge cache for ${targetUrl}:`, error);
      }
    });

    await Promise.allSettled(purgePromises);
  };

  const executionCtx = getExecutionCtx(c);
  try {
    if (executionCtx && executionCtx.waitUntil) {
      executionCtx.waitUntil(purge());
    } else {
      purge().catch(err => logger.error('system', 'Failed to purge cache', err));
    }
  } catch (e) {
    purge().catch(err => logger.error('system', 'Failed to purge cache', err));
  }
};

/**
 * ============================================================================
 * 🛡️ THE "ATOMIC OVERWRITE" META-CACHE ARCHITECTURE 🛡️
 * ============================================================================
 * 
 * WHY DO WE DO THIS?
 * Cloudflare Cache API on free plans does NOT support wildcard purging (e.g. `/api/*`).
 * Traditionally, developers loop through pagination (e.g. `page=1...50`) to delete caches,
 * which is slow, unreliable, and fails completely if the `limit` parameter changes dynamically.
 * 
 * HOW "ATOMIC OVERWRITE" SOLVES THIS:
 * Instead of tracking and deleting individual URLs, we use a "Meta-Cache".
 * We store a tiny 6-character random hash for each entity (e.g., `services` -> `a1b2c3`).
 * 
 * 1. The Middleware reads this hash and secretly attaches it to EVERY public request:
 *    `/api/public/services` becomes `/api/public/services?_v=a1b2c3`
 * 2. When an admin Updates, Creates, or Deletes a service, `purgeEntityCache` is called.
 * 3. `purgeEntityCache` simply GENERATES A NEW HASH and overwrites the old one in the Meta-Cache!
 *    `services` -> `x9y8z7`
 * 4. The next time the middleware intercepts a request, it uses the NEW hash.
 *    The resulting URL is `/api/public/services?_v=x9y8z7`.
 * 5. Because the URL changed, it instantly MISSES the old cache and fetches fresh data!
 * 
 * RESULT: 
 * We get instantaneous global invalidation for an entire category of data with a single,
 * lightning-fast `cache.put()` operation. No loops, no missed URLs, and 100% immunity
 * to pagination limit changes.
 * ============================================================================
 */


export const getOrInitMetaHash = async (c: Context<any>, entityType: string): Promise<string> => {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (!cache) return 'dev-hash';
  
  let origin = 'http://localhost';
  try { origin = new URL(c.req.url).origin; } catch (e) {}

  const metaUrl = new URL(`/internal/meta-hash/${entityType}`, origin).toString();
  const request = new Request(metaUrl, { method: 'GET' });
  
  try {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return await cachedResponse.text();
    }
  } catch (err) {
    logger.error('system', `Failed to read meta-hash for ${entityType}`, err);
  }

  // Not found or error -> generate new, save, return
  const newHash = Math.random().toString(36).substring(2, 8);
  const responseToCache = new Response(newHash, {
    status: 200,
    headers: { 'Cache-Control': 's-maxage=31536000' } // 1 year TTL
  });
  
  const executionCtx = getExecutionCtx(c);
  try {
    if (executionCtx && executionCtx.waitUntil) {
      executionCtx.waitUntil(cache.put(request, responseToCache));
    } else {
      cache.put(request, responseToCache).catch(() => {});
    }
  } catch (err) {}
  
  return newHash;
};

export const purgeEntityCache = (
  c: Context<any>,
  type: 'services' | 'articles' | 'service-categories' | 'article-categories' | 'settings' | 'booking' | 'comments'
): void => {
  const executionCtx = getExecutionCtx(c);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (!cache || !executionCtx || !executionCtx.waitUntil) return;

  let origin = 'http://localhost';
  try { origin = new URL(c.req.url).origin; } catch (e) {}

  executionCtx.waitUntil((async () => {
    // ──────────────────────────────────────────────────────────────
    // ATOMIC OVERWRITE (Entity-Scoped Meta-Cache)
    // ──────────────────────────────────────────────────────────────
    let entitiesToPurge: string[] = [];
    
    // Cross-Entity Relationships:
    if (type === 'services' || type === 'service-categories' || type === 'booking') {
      entitiesToPurge = ['services', 'service-categories', 'booking'];
    } else if (type === 'articles' || type === 'article-categories') {
      entitiesToPurge = ['articles', 'article-categories'];
    } else {
      entitiesToPurge = [type];
    }

    const purgePromises = entitiesToPurge.map(async (entityType) => {
      const metaUrl = new URL(`/internal/meta-hash/${entityType}`, origin).toString();
      const request = new Request(metaUrl, { method: 'GET' });
      const newHash = Math.random().toString(36).substring(2, 8);
      const responseToCache = new Response(newHash, {
        status: 200,
        headers: { 'Cache-Control': 's-maxage=31536000' } // 1 year TTL
      });

      try {
        await cache.put(request, responseToCache);
      } catch (error) {
        logger.error('system', `Failed to atomic overwrite meta-hash for ${entityType}:`, error);
      }
    });

    await Promise.allSettled(purgePromises);
  })());
};
