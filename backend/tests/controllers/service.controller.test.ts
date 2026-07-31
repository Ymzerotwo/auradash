import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Hono } from 'hono';
import { ServiceService } from '../../src/services/service.services';
import serviceRoutes from '../../src/routes/service.routes';
import { AppContext } from '../../src/types';

// Mock cache purging to avoid runtime/binding errors during testing
vi.mock('../../src/utils/cache.utils', () => ({
  purgeEntityCache: vi.fn()
}));

const mockEnv = {
  ENVIRONMENT: 'development',
  DB: {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue({ success: true }),
    all: vi.fn().mockResolvedValue({ results: [] })
  }
};

describe('Pentest: Service Controller & Routes Security', () => {
  let createSpy: any;
  let updateSpy: any;
  let deleteSpy: any;
  let getByIdSpy: any;
  let getAllSpy: any;
  let checkSlugSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    createSpy = vi.spyOn(ServiceService, 'create').mockResolvedValue('test-service-id');
    updateSpy = vi.spyOn(ServiceService, 'update').mockResolvedValue(true);
    deleteSpy = vi.spyOn(ServiceService, 'delete').mockResolvedValue(true);
    getAllSpy = vi.spyOn(ServiceService, 'getAll').mockResolvedValue({
      data: [],
      pagination: { total: 0, totalPages: 0, page: 1, limit: 20 }
    });
    checkSlugSpy = vi.spyOn(ServiceService, 'checkSlug').mockResolvedValue(true);
    getByIdSpy = vi.spyOn(ServiceService, 'getById').mockResolvedValue({
      id: 'test-id',
      category_id: 'cat-123',
      name: 'Safe Name',
      slug: 'safe-slug',
      meta_data: [],
      seo_data: {},
      sort_order: 0,
      is_active: true
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Authorization & RBAC Bypass (Broken Access Control)', () => {
    it('should REJECT requests to GET / without the cms.services permission', async () => {
      const req = new Request('http://localhost/api/services', {
        method: 'GET'
      });

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { id: 'user-123', role: 'user', permissions: {} } as any);
        await next();
      });
      testApp.route('/api/services', serviceRoutes);

      const res = await testApp.fetch(req, mockEnv);
      const data = await res.json() as any;

      expect(res.status).toBe(403);
      expect(data.slug).toBe('FORBIDDEN');
    });

    it('should REJECT requests to POST / without the cms.services permission', async () => {
      const req = new Request('http://localhost/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Service',
          slug: 'new-service',
          meta_data: [],
          seo_data: {}
        })
      });

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { id: 'user-123', role: 'user', permissions: {} } as any);
        await next();
      });
      testApp.route('/api/services', serviceRoutes);

      const res = await testApp.fetch(req, mockEnv);
      const data = await res.json() as any;

      expect(res.status).toBe(403);
      expect(data.slug).toBe('FORBIDDEN');
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('should ALLOW requests with the correct cms.services permission', async () => {
      const req = new Request('http://localhost/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Service',
          slug: 'new-service',
          meta_data: [],
          seo_data: {}
        })
      });

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { id: 'admin-123', role: 'user', permissions: { cms: { services: true } } } as any);
        await next();
      });
      testApp.route('/api/services', serviceRoutes);

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(201);
      expect(createSpy).toHaveBeenCalled();
    });
  });

  describe('2. Input Validation & Zod Bypass (Injection & Validation Bypasses)', () => {
    let pentestApp: Hono<AppContext>;

    beforeEach(() => {
      pentestApp = new Hono<AppContext>();
      pentestApp.use('*', async (c, next) => {
        c.set('user', { id: 'admin-123', role: 'user', permissions: { cms: { services: true } } } as any);
        await next();
      });
      pentestApp.route('/api/services', serviceRoutes);
    });

    it('should block extremely long names or slugs (Buffer Overflow / DoS prevention)', async () => {
      const hugeName = 'A'.repeat(1000);
      const req = new Request('http://localhost/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: hugeName,
          slug: 'valid-slug',
          meta_data: [],
          seo_data: {}
        })
      });

      const res = await pentestApp.fetch(req, mockEnv);
      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.slug).toBe('VALIDATION_ERROR');
    });

    it('should block invalid slug formats (Regex Bypass / XSS in URL)', async () => {
      const maliciousSlugs = [
        'invalid slug name',
        'invalid/slug',
        'invalid_slug',
        'slug<script>alert(1)</script>',
        'slug?param=val'
      ];

      for (const slug of maliciousSlugs) {
        const req = new Request('http://localhost/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Valid Name',
            slug,
            meta_data: [],
            seo_data: {}
          })
        });

        const res = await pentestApp.fetch(req, mockEnv);
        expect(res.status).toBe(400);
        const data = await res.json() as any;
        expect(data.slug).toBe('VALIDATION_ERROR');
      }
    });

    it('should ignore Mass Assignment attempts (Zod Stripping)', async () => {
      const req = new Request('http://localhost/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Hacked Service',
          slug: 'hacked-service',
          id: 'injected-uuid-123',
          created_at: '2020-01-01T00:00:00.000Z',
          created_by: 'another-user',
          is_admin_flag: true,
          meta_data: [],
          seo_data: {}
        })
      });

      const res = await pentestApp.fetch(req, mockEnv);
      expect(res.status).toBe(201);

      expect(createSpy).toHaveBeenCalledWith(
        expect.anything(),
        {
          name: 'Hacked Service',
          slug: 'hacked-service',
          meta_data: [],
          seo_data: { meta_title: 'Hacked Service' },
          sort_order: 0,
          is_active: true
        },
        'admin-123'
      );
      
      const calledData = createSpy.mock.calls[0][1];
      expect(calledData).not.toHaveProperty('id');
      expect(calledData).not.toHaveProperty('created_at');
      expect(calledData).not.toHaveProperty('created_by');
      expect(calledData).not.toHaveProperty('is_admin_flag');
    });

    it('should reject non-integer sort_order types to prevent SQL injection or type confusion', async () => {
      const maliciousPayloads = [
        "1",
        1.5,
        { $gt: 0 },
        [1, 2, 3]
      ];

      for (const payload of maliciousPayloads) {
        const req = new Request('http://localhost/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Valid Name',
            slug: 'valid-slug-order',
            meta_data: [],
            seo_data: {},
            sort_order: payload
          })
        });

        const res = await pentestApp.fetch(req, mockEnv);
        expect(res.status).toBe(400);
        const data = await res.json() as any;
        expect(data.slug).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('3. XSS & Sanitization (Stored XSS)', () => {
    let pentestApp: Hono<AppContext>;

    beforeEach(() => {
      pentestApp = new Hono<AppContext>();
      pentestApp.use('*', async (c, next) => {
        c.set('user', { id: 'admin-123', role: 'user', permissions: { cms: { services: true } } } as any);
        await next();
      });
      pentestApp.route('/api/services', serviceRoutes);
    });

    it('should sanitize HTML tags from service name and category_id', async () => {
      const maliciousName = 'Web <b>Development</b>';
      const maliciousCategoryId = '<script>alert("xss")</script>cat-id';
      const req = new Request('http://localhost/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: maliciousCategoryId,
          name: maliciousName,
          slug: 'web-development',
          meta_data: [],
          seo_data: {}
        })
      });

      const res = await pentestApp.fetch(req, mockEnv);
      expect(res.status).toBe(201);

      const calledData = createSpy.mock.calls[0][1];
      expect(calledData.name).toBe('Web &lt;b&gt;Development&lt;/b&gt;'); // escaped
      expect(calledData.category_id).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;cat-id'); // escaped with double quote entity
    });
  });

  describe('4. Information Disclosure Prevention', () => {
    let pentestApp: Hono<AppContext>;

    beforeEach(() => {
      pentestApp = new Hono<AppContext>();
      pentestApp.use('*', async (c, next) => {
        c.set('user', { id: 'admin-123', role: 'user', permissions: { cms: { services: true } } } as any);
        await next();
      });
      pentestApp.route('/api/services', serviceRoutes);
    });

    it('should NOT leak database or system error details on 500 failures in production', async () => {
      createSpy.mockRejectedValue(new Error('D1_ERROR: Constraint failure: Services.slug must be unique'));

      // Use a production domain so sendResponse hides debug stack trace
      const req = new Request('https://api.auradash.com/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Failing Service',
          slug: 'fail-slug',
          meta_data: [],
          seo_data: {}
        })
      });

      const res = await pentestApp.fetch(req, { ENVIRONMENT: 'production', DB: mockEnv.DB });
      const data = await res.json() as any;

      expect(res.status).toBe(500);
      expect(data.slug).toBe('INTERNAL_SERVER_ERROR');
      
      const responseText = JSON.stringify(data);
      expect(responseText).not.toContain('D1_ERROR');
      expect(responseText).not.toContain('Constraint failure');
      expect(data.debug).toBeUndefined();
    });

    it('should safely handle SORT_ORDER_EXISTS error without leaking internals', async () => {
      createSpy.mockRejectedValue(new Error('SORT_ORDER_EXISTS'));

      const req = new Request('https://api.auradash.com/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Conflicting Order Service',
          slug: 'conflict-slug',
          meta_data: [],
          seo_data: {},
          sort_order: 1
        })
      });

      const res = await pentestApp.fetch(req, mockEnv);
      const data = await res.json() as any;

      expect(res.status).toBe(400);
      expect(data.slug).toBe('SORT_ORDER_EXISTS');
      expect(data.message).toBe('This sort order is already taken by another service');
    });
  });

  describe('5. Expanded Service Route Handlers', () => {
    let pentestApp: Hono<AppContext>;

    beforeEach(() => {
      pentestApp = new Hono<AppContext>();
      pentestApp.use('*', async (c, next) => {
        c.set('user', { id: 'admin-123', role: 'user', permissions: { cms: { services: true } } } as any);
        await next();
      });
      pentestApp.route('/api/services', serviceRoutes);
    });

    describe('GET /check-slug', () => {
      it('should return 400 if slug parameter is missing', async () => {
        const req = new Request('http://localhost/api/services/check-slug', {
          method: 'GET'
        });
        const res = await pentestApp.fetch(req, mockEnv);
        expect(res.status).toBe(400);
        const data = await res.json() as any;
        expect(data.slug).toBe('SLUG_REQUIRED');
      });

      it('should return 200 with slug availability', async () => {
        checkSlugSpy.mockResolvedValue(true);
        const req = new Request('http://localhost/api/services/check-slug?slug=test-slug&exclude_id=123', {
          method: 'GET'
        });
        const res = await pentestApp.fetch(req, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as any;
        expect(data.slug).toBe('SLUG_CHECK');
        expect(data.data.available).toBe(true);
        expect(checkSlugSpy).toHaveBeenCalledWith(expect.anything(), 'test-slug', '123');
      });

      it('should return 500 when checkSlug service fails', async () => {
        checkSlugSpy.mockRejectedValue(new Error('CHECK_FAILED'));
        const req = new Request('http://localhost/api/services/check-slug?slug=test-slug', {
          method: 'GET'
        });
        const res = await pentestApp.fetch(req, mockEnv);
        expect(res.status).toBe(500);
        const data = await res.json() as any;
        expect(data.slug).toBe('INTERNAL_SERVER_ERROR');
      });
    });

    describe('GET /:id', () => {
      it('should return 200 when service is found', async () => {
        const mockService = { id: 'srv-1', name: 'Service 1', slug: 'srv-1', meta_data: [], seo_data: {} };
        getByIdSpy.mockResolvedValue(mockService);

        const req = new Request('http://localhost/api/services/srv-1', {
          method: 'GET'
        });
        const res = await pentestApp.fetch(req, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as any;
        expect(data.slug).toBe('SERVICE_FETCHED');
        expect(data.data.service).toEqual(mockService);
      });

      it('should return 404 when service is not found', async () => {
        getByIdSpy.mockResolvedValue(null);

        const req = new Request('http://localhost/api/services/missing', {
          method: 'GET'
        });
        const res = await pentestApp.fetch(req, mockEnv);
        expect(res.status).toBe(404);
        const data = await res.json() as any;
        expect(data.slug).toBe('SERVICE_NOT_FOUND');
      });

      it('should return 500 when getById fails', async () => {
        getByIdSpy.mockRejectedValue(new Error('FETCH_FAILED'));

        const req = new Request('http://localhost/api/services/srv-1', {
          method: 'GET'
        });
        const res = await pentestApp.fetch(req, mockEnv);
        expect(res.status).toBe(500);
        const data = await res.json() as any;
        expect(data.slug).toBe('INTERNAL_SERVER_ERROR');
      });
    });

    describe('PUT /:id', () => {
      it('should update service successfully', async () => {
        updateSpy.mockResolvedValue(true);

        const req = new Request('http://localhost/api/services/srv-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Updated Name',
            slug: 'updated-slug'
          })
        });
        const res = await pentestApp.fetch(req, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as any;
        expect(data.slug).toBe('SERVICE_UPDATED');
        expect(updateSpy).toHaveBeenCalledWith(
          expect.anything(),
          'srv-1',
          { name: 'Updated Name', slug: 'updated-slug', seo_data: { meta_title: 'Updated Name' } },
          'admin-123'
        );
      });

      it('should return 404 if service to update is not found', async () => {
        updateSpy.mockResolvedValue(false);

        const req = new Request('http://localhost/api/services/missing', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Updated Name'
          })
        });
        const res = await pentestApp.fetch(req, mockEnv);
        expect(res.status).toBe(404);
        const data = await res.json() as any;
        expect(data.slug).toBe('SERVICE_NOT_FOUND');
      });

      it('should return 400 if slug already exists', async () => {
        updateSpy.mockRejectedValue(new Error('SERVICE_EXISTS'));

        const req = new Request('http://localhost/api/services/srv-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: 'existing-slug'
          })
        });
        const res = await pentestApp.fetch(req, mockEnv);
        expect(res.status).toBe(400);
        const data = await res.json() as any;
        expect(data.slug).toBe('SERVICE_EXISTS');
      });

      it('should return 400 if category is not found', async () => {
        updateSpy.mockRejectedValue(new Error('CATEGORY_NOT_FOUND'));

        const req = new Request('http://localhost/api/services/srv-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category_id: 'missing-cat'
          })
        });
        const res = await pentestApp.fetch(req, mockEnv);
        expect(res.status).toBe(400);
        const data = await res.json() as any;
        expect(data.slug).toBe('CATEGORY_NOT_FOUND');
      });

      it('should return 400 if sort order exists', async () => {
        updateSpy.mockRejectedValue(new Error('SORT_ORDER_EXISTS'));

        const req = new Request('http://localhost/api/services/srv-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sort_order: 10
          })
        });
        const res = await pentestApp.fetch(req, mockEnv);
        expect(res.status).toBe(400);
        const data = await res.json() as any;
        expect(data.slug).toBe('SORT_ORDER_EXISTS');
      });

      it('should return 500 when update service fails unexpectedly', async () => {
        updateSpy.mockRejectedValue(new Error('UNKNOWN_ERROR'));

        const req = new Request('http://localhost/api/services/srv-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Crash'
          })
        });
        const res = await pentestApp.fetch(req, mockEnv);
        expect(res.status).toBe(500);
        const data = await res.json() as any;
        expect(data.slug).toBe('INTERNAL_SERVER_ERROR');
      });
    });

    describe('DELETE /:id', () => {
      it('should delete service successfully', async () => {
        deleteSpy.mockResolvedValue(true);

        const req = new Request('http://localhost/api/services/srv-1', {
          method: 'DELETE'
        });
        const res = await pentestApp.fetch(req, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as any;
        expect(data.slug).toBe('SERVICE_DELETED');
        expect(deleteSpy).toHaveBeenCalledWith(expect.anything(), 'srv-1');
      });

      it('should return 404 if service to delete is not found', async () => {
        deleteSpy.mockResolvedValue(false);

        const req = new Request('http://localhost/api/services/missing', {
          method: 'DELETE'
        });
        const res = await pentestApp.fetch(req, mockEnv);
        expect(res.status).toBe(404);
        const data = await res.json() as any;
        expect(data.slug).toBe('SERVICE_NOT_FOUND');
      });

      it('should return 500 when delete service fails unexpectedly', async () => {
        deleteSpy.mockRejectedValue(new Error('CRASH'));

        const req = new Request('http://localhost/api/services/srv-1', {
          method: 'DELETE'
        });
        const res = await pentestApp.fetch(req, mockEnv);
        expect(res.status).toBe(500);
        const data = await res.json() as any;
        expect(data.slug).toBe('INTERNAL_SERVER_ERROR');
      });
    });
  });
});
