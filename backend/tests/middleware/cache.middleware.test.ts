import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { programmaticCache } from '../../src/middleware/cache.middleware';

describe('Middleware: Cache', () => {
  let mockContext: any;
  let mockNext: any;
  let mockCache: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCache = {
      match: vi.fn().mockImplementation(async (req: Request | string) => {
        const url = typeof req === 'string' ? req : req.url;
        // Mock the internal meta-hash check for Atomic Overwrite
        if (url.includes('/internal/meta-hash/')) {
          return new Response('fake-hash-123');
        }
        return null; // Cache MISS by default
      }),
      put: vi.fn().mockResolvedValue(undefined),
    };

    (globalThis as any).caches = {
      default: mockCache,
    };

    mockContext = {
      req: {
        method: 'GET',
        url: 'https://auradash.com/api/public/services?b=2&a=1',
      },
      res: new Response('Fresh Response', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
      executionCtx: {
        waitUntil: vi.fn((promise) => promise),
      },
      get: vi.fn().mockReturnValue('test-request-id'),
    };

    mockNext = vi.fn().mockImplementation(async () => {
      // Mock route controller execution
    });
  });

  afterEach(() => {
    delete (globalThis as any).caches;
  });

  it('should bypass cache for non-GET requests', async () => {
    mockContext.req.method = 'POST';
    const middleware = programmaticCache();

    await middleware(mockContext, mockNext);

    expect(mockCache.match).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should bypass cache if caches global is undefined', async () => {
    delete (globalThis as any).caches;
    const middleware = programmaticCache();

    await middleware(mockContext, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should return cached response on Cache HIT and set Cache-Control headers', async () => {
    const cachedResponse = new Response('Cached Data', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
    // Override match mock for this specific test
    mockCache.match.mockImplementation(async (req: Request | string) => {
      const url = typeof req === 'string' ? req : req.url;
      if (url.includes('/internal/meta-hash/')) {
        return new Response('fake-hash-123');
      }
      return cachedResponse; // Cache HIT for the actual data request
    });

    const middleware = programmaticCache(300);
    const result = await middleware(mockContext, mockNext) as Response;

    expect(mockCache.match).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
    expect(result).toBeInstanceOf(Response);
    expect(result.headers.get('X-AuraDash-Cache')).toBe('HIT');
    expect(result.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    expect(await result.text()).toBe('Cached Data');
  });

  it('should call next() and cache the response on Cache MISS (with Atomic Overwrite _v param)', async () => {
    const middleware = programmaticCache(600);
    await middleware(mockContext, mockNext);

    expect(mockCache.match).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
    expect(mockContext.executionCtx.waitUntil).toHaveBeenCalled();
    expect(mockCache.put).toHaveBeenCalled();

    // Verify cache key sorted search params AND contains the injected _v=fake-hash-123
    const putCalls = mockCache.put.mock.calls;
    const finalPutCall = putCalls[putCalls.length - 1]; // Get the last put call (the actual data, not the meta-hash init)
    const lastPutKey = finalPutCall[0] as Request;
    
    expect(lastPutKey.url).toBe('https://auradash.com/api/public/services?_v=fake-hash-123&a=1&b=2');

    // Verify response cached with maxage
    const lastCachedResponse = finalPutCall[1] as Response;
    expect(lastCachedResponse.headers.get('Cache-Control')).toBe('s-maxage=600');

    // Verify final client response headers
    expect(mockContext.res.headers.get('X-AuraDash-Cache')).toBe('MISS');
    expect(mockContext.res.headers.get('Cache-Control')).toBe('no-store, max-age=0');
  });

  it('should fail-open and call next() if cache matching throws an error', async () => {
    mockCache.match.mockRejectedValue(new Error('Cache match error'));
    const middleware = programmaticCache();

    await middleware(mockContext, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockContext.res.headers.get('X-AuraDash-Cache')).toBe('MISS');
  });

  it('should cache response directly without waitUntil if executionCtx is absent', async () => {
    mockContext.executionCtx = undefined;
    const middleware = programmaticCache();

    await middleware(mockContext, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockCache.put).toHaveBeenCalled();
    expect(mockContext.res.headers.get('X-AuraDash-Cache')).toBe('MISS');
  });

  it('should not cache non-200 responses', async () => {
    mockContext.res = new Response('Not Found', { status: 404 });
    const middleware = programmaticCache();

    await middleware(mockContext, mockNext);

    // The route cache put should not be called (meta-hash init might be called though)
    const dataPutCalls = mockCache.put.mock.calls.filter((call: any) => !(call[0] as Request).url.includes('/internal/meta-hash/'));
    expect(dataPutCalls.length).toBe(0);
    expect(mockContext.res.headers.get('X-AuraDash-Cache')).toBe('MISS');
  });

  describe('Additional Robustness Tests', () => {
    it('should set micro-caching max-age to 60 seconds if a search query is present', async () => {
      mockContext.req.url = 'https://auradash.com/api/public/services?search=salon&page=1';
      const middleware = programmaticCache(3600);

      await middleware(mockContext, mockNext);

      expect(mockCache.put).toHaveBeenCalled();
      const putCalls = mockCache.put.mock.calls;
      const finalPutCall = putCalls[putCalls.length - 1];
      const lastCachedResponse = finalPutCall[1] as Response;
      expect(lastCachedResponse.headers.get('Cache-Control')).toBe('s-maxage=60');
    });

    it('should strip Next.js proxy phantom query parameter from cache key URL', async () => {
      // In Next.js proxy requests, path is often appended as query param key
      mockContext.req.url = 'https://auradash.com/api/public/services?api/public/services=&page=1';
      const middleware = programmaticCache();

      await middleware(mockContext, mockNext);

      const putCalls = mockCache.put.mock.calls;
      const finalPutCall = putCalls[putCalls.length - 1];
      const lastPutKey = finalPutCall[0] as Request;
      // Expect '?api/public/services=' to be deleted, leaving only '_v=...' and 'page=1' sorted
      expect(lastPutKey.url).toContain('page=1');
      expect(lastPutKey.url).not.toContain('api/public/services=');
    });

    it('should forward custom headers set by route controller in both MISS and HIT paths', async () => {
      // Setup controller to return custom header
      mockContext.res.headers.set('X-Custom-Header', 'custom-value');
      
      const middleware = programmaticCache(300);
      await middleware(mockContext, mockNext);

      // Verify MISS path has custom header
      expect(mockContext.res.headers.get('X-Custom-Header')).toBe('custom-value');
      expect(mockContext.res.headers.get('X-AuraDash-Cache')).toBe('MISS');

      // Now mock cache HIT path
      const cachedResponse = new Response('Cached Data', {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'X-Custom-Header': 'cached-custom-value'
        },
      });
      mockCache.match.mockImplementation(async (req: Request | string) => {
        const url = typeof req === 'string' ? req : req.url;
        if (url.includes('/internal/meta-hash/')) {
          return new Response('fake-hash-123');
        }
        return cachedResponse;
      });

      const hitResult = await middleware(mockContext, mockNext) as Response;
      expect(hitResult.headers.get('X-Custom-Header')).toBe('cached-custom-value');
      expect(hitResult.headers.get('X-AuraDash-Cache')).toBe('HIT');
    });
  });
});
