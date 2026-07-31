import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { purgePublicCache, purgeEntityCache, getOrInitMetaHash } from '../../src/utils/cache.utils';

describe('Utils: Cache - purgePublicCache', () => {
  let mockDelete: any;
  let originalCaches: any;

  beforeEach(() => {
    mockDelete = vi.fn().mockResolvedValue(true);
    originalCaches = (globalThis as any).caches;
    (globalThis as any).caches = {
      default: {
        delete: mockDelete,
      },
    };
  });

  afterEach(() => {
    (globalThis as any).caches = originalCaches;
    vi.restoreAllMocks();
  });

  it('should return early if context is missing or invalid', () => {
    purgePublicCache(null as any, ['/path']);
    expect(mockDelete).not.toHaveBeenCalled();

    purgePublicCache({} as any, ['/path']);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('should use c.req.url origin', async () => {
    const waitUntil = vi.fn();
    const c = {
      req: { url: 'https://req.example.com/some/path?page=1' },
      env: {},
      executionCtx: { waitUntil },
    };

    purgePublicCache(c as any, ['/test-path']);
    const purgePromise = waitUntil.mock.calls[0][0];
    await purgePromise;

    expect(mockDelete).toHaveBeenCalled();
    const requestArg = mockDelete.mock.calls[0][0];
    expect(requestArg.url).toBe('https://req.example.com/test-path');
  });

  it('should execute purge directly if waitUntil is missing', async () => {
    const c = {
      req: { url: 'https://example.com' },
      env: {},
    };

    purgePublicCache(c as any, ['/test-path']);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockDelete).toHaveBeenCalled();
  });
});

describe('Utils: Cache - purgeEntityCache (Atomic Overwrite)', () => {
  let mockPut: any;
  let originalCaches: any;

  beforeEach(() => {
    mockPut = vi.fn().mockResolvedValue(true);
    originalCaches = (globalThis as any).caches;
    (globalThis as any).caches = {
      default: {
        put: mockPut,
      },
    };
  });

  afterEach(() => {
    (globalThis as any).caches = originalCaches;
    vi.restoreAllMocks();
  });

  it('should purge correct cross-entities for services', async () => {
    const waitUntil = vi.fn();
    const c = {
      req: { url: 'https://example.com' },
      env: {},
      executionCtx: { waitUntil },
    };

    purgeEntityCache(c as any, 'services');
    await waitUntil.mock.calls[0][0];

    // services purge also purges service-categories and booking
    expect(mockPut).toHaveBeenCalledTimes(3);
    const urls = mockPut.mock.calls.map((call: any) => call[0].url);
    expect(urls).toContain('https://example.com/internal/meta-hash/services');
    expect(urls).toContain('https://example.com/internal/meta-hash/service-categories');
    expect(urls).toContain('https://example.com/internal/meta-hash/booking');
  });

  it('should purge correct cross-entities for articles', async () => {
    const waitUntil = vi.fn();
    const c = {
      req: { url: 'https://example.com' },
      env: {},
      executionCtx: { waitUntil },
    };

    purgeEntityCache(c as any, 'articles');
    await waitUntil.mock.calls[0][0];

    // articles purge also purges article-categories
    expect(mockPut).toHaveBeenCalledTimes(2);
    const urls = mockPut.mock.calls.map((call: any) => call[0].url);
    expect(urls).toContain('https://example.com/internal/meta-hash/articles');
    expect(urls).toContain('https://example.com/internal/meta-hash/article-categories');
  });

  it('should purge single entity for settings', async () => {
    const waitUntil = vi.fn();
    const c = {
      req: { url: 'https://example.com' },
      env: {},
      executionCtx: { waitUntil },
    };

    purgeEntityCache(c as any, 'settings');
    await waitUntil.mock.calls[0][0];

    expect(mockPut).toHaveBeenCalledTimes(1);
    expect(mockPut.mock.calls[0][0].url).toBe('https://example.com/internal/meta-hash/settings');
  });

  describe('Additional Robustness Tests', () => {
    it('should return dev-hash from getOrInitMetaHash if caches global is undefined', async () => {
      const originalCaches = (globalThis as any).caches;
      delete (globalThis as any).caches;

      const c = { req: { url: 'https://example.com' } };
      const hash = await getOrInitMetaHash(c as any, 'services');

      expect(hash).toBe('dev-hash');
      (globalThis as any).caches = originalCaches;
    });

    it('should handle invalid/malformed URL in c.req.url gracefully in purgePublicCache', () => {
      const c = {
        req: { url: 'not-a-valid-url-at-all' },
        env: {},
        executionCtx: { waitUntil: vi.fn() },
      };

      expect(() => purgePublicCache(c as any, ['/path'])).not.toThrow();
    });
  });
});
