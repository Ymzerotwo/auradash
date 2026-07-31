import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Hono } from 'hono';
import { CheckSlugService } from '../../src/services/check-slug.services';
import checkSlugRoutes from '../../src/routes/check-slug.routes';
import { AppContext } from '../../src/types';

const mockEnv = {
  DB: {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null)
  }
};

describe('Pentest: Check-Slug Controller & Routes Security', () => {
  let checkSlugSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    checkSlugSpy = vi.spyOn(CheckSlugService, 'checkSlug').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authorization & RBAC Bypass', () => {
    it('should REJECT requests without cms.articles or cms.services permissions', async () => {
      const req = new Request('http://localhost/api/check-slug?slug=test&table=services', {
        method: 'GET'
      });

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { id: 'user-123', role: 'user', permissions: {} } as any);
        await next();
      });
      testApp.route('/api/check-slug', checkSlugRoutes);

      const res = await testApp.fetch(req, mockEnv);
      const data = await res.json() as any;

      expect(res.status).toBe(403);
      expect(data.slug).toBe('FORBIDDEN');
    });

    it('should ALLOW requests with cms.services permission', async () => {
      const req = new Request('http://localhost/api/check-slug?slug=test&table=services', {
        method: 'GET'
      });

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { id: 'user-123', role: 'user', permissions: { cms: { services: true } } } as any);
        await next();
      });
      testApp.route('/api/check-slug', checkSlugRoutes);

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      expect(checkSlugSpy).toHaveBeenCalled();
    });

    it('should ALLOW requests with cms.articles permission', async () => {
      const req = new Request('http://localhost/api/check-slug?slug=test&table=articles', {
        method: 'GET'
      });

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { id: 'user-123', role: 'user', permissions: { cms: { articles: true } } } as any);
        await next();
      });
      testApp.route('/api/check-slug', checkSlugRoutes);

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(200);
    });
  });

  describe('Input Validation & Constraints', () => {
    let pentestApp: Hono<AppContext>;

    beforeEach(() => {
      pentestApp = new Hono<AppContext>();
      pentestApp.use('*', async (c, next) => {
        c.set('user', { id: 'admin-123', role: 'user', permissions: { cms: { services: true } } } as any);
        await next();
      });
      pentestApp.route('/api/check-slug', checkSlugRoutes);
    });

    it('should reject requests with missing query parameters', async () => {
      const req = new Request('http://localhost/api/check-slug?table=services', { method: 'GET' });
      const res = await pentestApp.fetch(req, mockEnv);
      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.slug).toBe('VALIDATION_ERROR');
    });

    it('should reject requests with invalid tables', async () => {
      const req = new Request('http://localhost/api/check-slug?slug=test&table=invalid_table_name', { method: 'GET' });
      const res = await pentestApp.fetch(req, mockEnv);
      expect(res.status).toBe(400);
    });

    it('should return availability status and table name successfully', async () => {
      checkSlugSpy.mockResolvedValue(false);
      const req = new Request('http://localhost/api/check-slug?slug=test-slug&table=service-categories&exclude_id=id-123', { method: 'GET' });
      const res = await pentestApp.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.slug).toBe('SLUG_CHECKED');
      expect(data.data.slug).toBe('test-slug');
      expect(data.data.table).toBe('service-categories');
      expect(data.data.available).toBe(false);
      expect(checkSlugSpy).toHaveBeenCalledWith(expect.anything(), 'service-categories', 'test-slug', 'id-123');
    });

    it('should return 500 when checkSlug service fails', async () => {
      checkSlugSpy.mockRejectedValue(new Error('DATABASE_ERROR'));
      const req = new Request('http://localhost/api/check-slug?slug=test-slug&table=service-categories', { method: 'GET' });
      const res = await pentestApp.fetch(req, mockEnv);
      expect(res.status).toBe(500);
      const data = await res.json() as any;
      expect(data.slug).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
