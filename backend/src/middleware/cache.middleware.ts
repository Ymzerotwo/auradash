/**
 * ==========================================
 *        AuraDash Cache Middleware
 * ==========================================
 * 
 * Intercepts requests AFTER API Key validation but BEFORE the database is hit.
 * If data is found in Cloudflare's `caches.default`, it returns it instantly (0 DB queries).
 * If not, it executes the route, captures the response, saves it to `caches.default` in the background,
 * and sets `Cache-Control: no-store` before sending to the client to prevent unwanted CDN caching.
 */

import { Context, Next } from 'hono';
import { AppContext } from '../types';
import { logger } from '../utils/logger';
import { getOrInitMetaHash } from '../utils/cache.utils';

/**
 * Creates a middleware function that programmatically caches GET responses using the Cloudflare Cache API.
 * 
 * @param sMaxAge - The maximum age (in seconds) that the response should be kept in the edge cache. Defaults to 3600s (1h).
 * @returns An async Hono middleware function.
 */
export const programmaticCache = (sMaxAge: number = 3600) => {
  return async (c: Context<AppContext>, next: Next) => {
    // Only GET requests are safe to cache. Mutations (POST/PUT/DELETE) bypass the cache.
    if (c.req.method !== 'GET') {
      return await next();
    }

    // CRITICAL: Safely check for the `caches` global object. 
    // This prevents ReferenceErrors when running in environments like local Node.js testing
    // where the Cloudflare Cache API is not available.
    const cache = typeof caches !== 'undefined' ? caches.default : null;
    if (!cache) {
      return await next();
    }

    const reqId = (c.get('requestId') as string) || 'unknown';
    
    // Construct a cache key based purely on the request URL.
    const cacheUrl = new URL(c.req.url);
    
    // CRITICAL FIX: Proxies (like Next.js) often append the route path as a query parameter.
    // E.g., /api/public/services?api/public/services=
    // This breaks the exact-match cache purging. We must strip this phantom parameter.
    const pathWithoutSlash = cacheUrl.pathname.startsWith('/') ? cacheUrl.pathname.substring(1) : cacheUrl.pathname;
    if (cacheUrl.searchParams.has(pathWithoutSlash)) {
      cacheUrl.searchParams.delete(pathWithoutSlash);
    }
    if (cacheUrl.searchParams.has(cacheUrl.pathname)) {
      cacheUrl.searchParams.delete(cacheUrl.pathname);
    }
    
    // ATOMIC OVERWRITE (Meta-Cache Pattern): Extract entity type from URL
    const pathname = cacheUrl.pathname;
    let entityType = 'global';
    if (pathname.includes('/article-categories')) entityType = 'article-categories';
    else if (pathname.includes('/comments')) entityType = 'comments';
    else if (pathname.includes('/articles')) entityType = 'articles';
    else if (pathname.includes('/service-categories')) entityType = 'service-categories';
    else if (pathname.includes('/services')) entityType = 'services';
    else if (pathname.includes('/settings')) entityType = 'settings';
    else if (pathname.includes('/booking')) entityType = 'booking';
    else if (pathname.includes('/comments')) entityType = 'comments';

    // Inject the current meta-hash version into the cache URL
    const metaHash = await getOrInitMetaHash(c, entityType);
    cacheUrl.searchParams.set('_v', metaHash);
    
    // CRITICAL OPTIMIZATION: Sort the search parameters lexicographically.
    // This prevents "Cache Fragmentation" where /api?a=1&b=2 and /api?b=2&a=1 
    // would otherwise create two separate identical cache entries, lowering hit rate.
    cacheUrl.searchParams.sort();
    const cacheKeyUrlStr = cacheUrl.toString();
    const cacheKey = new Request(cacheKeyUrlStr, { method: 'GET' });

    // DUAL-CACHE STRATEGY: Apply Micro-Caching (60s) for dynamic search queries.
    // Thanks to "Atomic Overwrite", paginated URLs (e.g., ?limit=50&page=2) are safely cached
    // and will be instantly invalidated when the _v hash changes. No strict limit constraints exist.
    let appliedMaxAge = sMaxAge;
    if (cacheUrl.searchParams.has('search')) {
      appliedMaxAge = 60;
    }

    try {
      // 1. Check the internal edge cache first (Cache HIT path)
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        logger.info(reqId, `Cache HIT for path: ${cacheUrl.pathname}`);
        
        // CRITICAL RECONSTRUCTION: We extract and copy headers to a new Headers object.
        // This avoids `TypeError: Can't modify immutable headers` which occurs in Cloudflare
        // Workers when attempting to mutate the headers of a cached/cloned Response directly.
        const hitHeaders = new Headers(cachedResponse.headers);
        hitHeaders.set('Cache-Control', 'no-store, max-age=0'); // Prevent browser caching
        hitHeaders.set('X-AuraDash-Cache', 'HIT');
        
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers: hitHeaders,
        });
      }
    } catch (err: any) {
      logger.error(reqId, `Cache read failed: ${err.message || err}`);
    }

    // 2. Cache MISS path: Proceed to the actual route controller
    await next();

    // 3. Capture the generated response
    const response = c.res;
    if (!response) {
      return; // Fail-safe: Handle unhandled middleware exceptions where c.res is missing.
    }

    if (response.status === 200) {
      // We only cache successful 200 OK responses to avoid poisoning the cache with errors.
      const cacheHeaders = new Headers(response.headers);
      cacheHeaders.set('Cache-Control', `s-maxage=${appliedMaxAge}`);
      
      // We must construct a new Response object to inject the mutable headers cleanly.
      const responseToCache = new Response(response.clone().body, {
        status: response.status,
        statusText: response.statusText,
        headers: cacheHeaders,
      });

      // Background caching: use `waitUntil` if available to prevent blocking the client response.
      if (c.executionCtx && c.executionCtx.waitUntil) {
        c.executionCtx.waitUntil(
          cache.put(cacheKey, responseToCache).catch((err: any) => {
            logger.error(reqId, `Cache write failed: ${err.message || err}`);
          })
        );
      } else {
        // Fallback for environments lacking ExecutionContext (e.g., standard Node).
        cache.put(cacheKey, responseToCache).catch((err: any) => {
          logger.error(reqId, `Cache write failed: ${err.message || err}`);
        });
      }
    }

    // 4. Return the fresh response to the client
    const clientHeaders = new Headers(response.headers);
    clientHeaders.set('Cache-Control', 'no-store, max-age=0');
    clientHeaders.set('X-AuraDash-Cache', 'MISS');
    
    c.res = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: clientHeaders,
    });
  };
};
