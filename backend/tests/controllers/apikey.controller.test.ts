import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { ApiKeyController } from '../../src/controllers/apikey.controller';
import { ApiKeyService } from '../../src/services/apikey.services';
import apikeyRoutes from '../../src/routes/apikey.routes';
import { AppContext } from '../../src/types';

describe('Controller: ApiKeyController', () => {
  let mockContext: any;
  let createSpy: any;
  let listSpy: any;
  let deleteSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IS_VITEST = 'true';

    createSpy = vi.spyOn(ApiKeyService, 'createApiKey').mockImplementation(async (db, data: any, secret, userId) => {
      if (data.type === 'test') {
        return {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: data.name,
          domain: 'test',
          apiKey: 'auradash_ts.mock.sig',
          created_at: new Date().toISOString(),
          type: 'test',
          expires_at: new Date(Date.now() + (data.expiresInHours || 24) * 3600 * 1000).toISOString()
        };
      }
      return {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: data.name,
        domain: data.domain || 'example.com',
        apiKey: 'sk_mock123456789',
        created_at: new Date().toISOString(),
        type: 'production'
      };
    });

    listSpy = vi.spyOn(ApiKeyService, 'listApiKeys').mockResolvedValue({
      data: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Key',
          domain: 'example.com',
          short_key: 'mock123',
          created_at: new Date().toISOString()
        }
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      }
    });

    deleteSpy = vi.spyOn(ApiKeyService, 'deleteApiKey').mockResolvedValue(undefined);

    mockContext = {
      req: {
        url: 'http://localhost/api/apikey',
        valid: vi.fn(),
        param: vi.fn(),
        query: vi.fn()
      },
      env: {
        DB: {},
        AURADASH_MASTER_SECRET: 'mock_master_secret_123'
      },
      get: vi.fn(),
      json: vi.fn((data, status) => ({ status, data })),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createApiKey()', () => {
    it('should successfully create an API key when valid data is provided', async () => {
      mockContext.get.mockReturnValue({ id: 'user_123' });
      mockContext.req.valid.mockReturnValue({
        name: 'Test Key',
        domain: 'example.com'
      });

      const response: any = await ApiKeyController.createApiKey(mockContext);

      expect(createSpy).toHaveBeenCalledWith(
        mockContext.env.DB,
        { name: 'Test Key', domain: 'example.com' },
        'mock_master_secret_123',
        'user_123'
      );

      expect(response.status).toBe(201);
      expect(response.data.slug).toBe('API_KEY_CREATED');
      expect(response.data.data.apiKey).toBe('sk_mock123456789');
    });

    it('should return 500 MISSING_MASTER_SECRET if AURADASH_MASTER_SECRET is missing', async () => {
      mockContext.env.AURADASH_MASTER_SECRET = undefined;

      const response: any = await ApiKeyController.createApiKey(mockContext);

      expect(createSpy).not.toHaveBeenCalled();
      expect(response.status).toBe(500);
      expect(response.data.slug).toBe('MISSING_MASTER_SECRET');
    });

    it('should return 500 INTERNAL_SERVER_ERROR if service throws an error', async () => {
      mockContext.req.valid.mockReturnValue({ name: 'Test', domain: 'example.com' });
      createSpy.mockRejectedValue(new Error('DB Error'));

      const response: any = await ApiKeyController.createApiKey(mockContext);

      expect(response.status).toBe(500);
      expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
      expect(response.data.data).toBe(null); 
    });
  });

  describe('listApiKeys()', () => {
    it('should return 200 and the list of API keys (Admin should see log fields)', async () => {
      mockContext.get.mockReturnValue({ id: 'admin_123', role: 'admin' });
      listSpy.mockResolvedValue({
        data: [{ id: '1', name: 'Test Key', domain: 'example.com', short_key: 'mock123', created_by: 'user_1', created_by_name: 'John', created_at: '2026-06-19T00:00:00Z' }]
      });

      const response: any = await ApiKeyController.listApiKeys(mockContext);

      expect(listSpy).toHaveBeenCalledWith(mockContext.env.DB, undefined, undefined);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('API_KEYS_FETCHED');
      expect(response.data.data.data[0].created_by).toBeDefined();
      expect(response.data.data.data[0].created_by_name).toBeDefined();
      expect(response.data.data.data[0].created_at).toBeDefined();
    });

    it('should filter out created_by, created_by_name, and created_at if the user is NOT an admin', async () => {
      mockContext.get.mockReturnValue({ id: 'user_123', role: 'User' });
      listSpy.mockResolvedValue({
        data: [{ id: '1', name: 'Test Key', domain: 'example.com', short_key: 'mock123', created_by: 'user_1', created_by_name: 'John', created_at: '2026-06-19T00:00:00Z' }]
      });

      const response: any = await ApiKeyController.listApiKeys(mockContext);

      expect(response.status).toBe(200);
      expect(response.data.data.data[0].created_by).toBeUndefined();
      expect(response.data.data.data[0].created_by_name).toBeUndefined();
      expect(response.data.data.data[0].created_at).toBeUndefined();
      expect(response.data.data.data[0].short_key).toBeDefined();
    });

    it('should return 500 if service throws an error', async () => {
      listSpy.mockRejectedValue(new Error('DB Error'));

      const response: any = await ApiKeyController.listApiKeys(mockContext);

      expect(response.status).toBe(500);
      expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('deleteApiKey()', () => {
    it('should return 200 when API key is successfully deleted', async () => {
      mockContext.req.param.mockReturnValue('mock-id-123');

      const response: any = await ApiKeyController.deleteApiKey(mockContext);

      expect(deleteSpy).toHaveBeenCalledWith(mockContext.env.DB, 'mock-id-123');
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('API_KEY_DELETED');
    });

    it('should return 404 if API key is not found', async () => {
      mockContext.req.param.mockReturnValue('non-existent-id');
      deleteSpy.mockRejectedValue(new Error('NOT_FOUND'));

      const response: any = await ApiKeyController.deleteApiKey(mockContext);

      expect(response.status).toBe(404);
      expect(response.data.slug).toBe('NOT_FOUND');
    });

    it('should return 500 if service throws a general error', async () => {
      mockContext.req.param.mockReturnValue('mock-id-123');
      deleteSpy.mockRejectedValue(new Error('DB Error'));

      const response: any = await ApiKeyController.deleteApiKey(mockContext);

      expect(response.status).toBe(500);
      expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('Integration Security', () => {
    const mockEnv = {
      DB: {},
      AURADASH_MASTER_SECRET: 'super-secret-key-123'
    };

    it('should REJECT requests without the settings.api_key permission', async () => {
      const req = new Request('http://localhost/api/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', domain: 'example.com' })
      });

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { id: 'user-123', role: 'user', permissions: { cms: { articles: true } } } as any);
        await next();
      });
      testApp.route('/api/apikey', apikeyRoutes);

      const res = await testApp.fetch(req, mockEnv);
      const data: any = await res.json();

      expect(res.status).toBe(403);
      expect(data.slug).toBe('FORBIDDEN');
    });

    it('should REJECT requests with completely empty permissions', async () => {
      const req = new Request('http://localhost/api/apikey', {
        method: 'GET'
      });

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { id: 'user-123', role: 'user', permissions: {} } as any);
        await next();
      });
      testApp.route('/api/apikey', apikeyRoutes);

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(403);
    });

    it('should ALLOW requests with the correct settings.api_key permission', async () => {
      const req = new Request('http://localhost/api/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', domain: 'example.com' })
      });

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { id: 'admin-123', role: 'user', permissions: { settings: { api_key: true } } } as any);
        await next();
      });
      testApp.route('/api/apikey', apikeyRoutes);

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(201);
    });

    it('should block extremely long names (Buffer Overflow / DoS prevention)', async () => {
      const hugeName = 'A'.repeat(1000);
      const req = new Request('http://localhost/api/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: hugeName, domain: 'example.com' })
      });

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { id: 'admin-123', role: 'user', permissions: { settings: { api_key: true } } } as any);
        await next();
      });
      testApp.route('/api/apikey', apikeyRoutes);

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(400);
      const data: any = await res.json();
      expect(data.slug).toBe('VALIDATION_ERROR');
    });

    it('should block malformed domains (Regex Bypass)', async () => {
      const maliciousDomains = [
        'javascript:alert(1)',
        '<script>alert(1)</script>',
        'http://example.com" onload="alert(1)"',
        'ftp://invalid-scheme.com'
      ];

      for (const domain of maliciousDomains) {
        const req = new Request('http://localhost/api/apikey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Valid Name', domain })
        });

        const testApp = new Hono<AppContext>();
        testApp.use('*', async (c, next) => {
          c.set('user', { id: 'admin-123', role: 'user', permissions: { settings: { api_key: true } } } as any);
          await next();
        });
        testApp.route('/api/apikey', apikeyRoutes);

        const res = await testApp.fetch(req, mockEnv);
        expect(res.status).toBe(400);
      }
    });

    it('should ignore Mass Assignment attempts (Zod Stripping)', async () => {
      const req = new Request('http://localhost/api/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: 'Hacked Key', 
          domain: 'example.com',
          id: 'admin-key-id',
          created_by: 'another-user',
          is_admin: true
        })
      });

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { id: 'admin-123', role: 'user', permissions: { settings: { api_key: true } } } as any);
        await next();
      });
      testApp.route('/api/apikey', apikeyRoutes);

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(201);

      expect(createSpy).toHaveBeenCalledWith(
        expect.anything(),
        { name: 'Hacked Key', domain: 'example.com', type: 'production', expiresInHours: 24 },
        expect.anything(),
        expect.anything()
      );
    });

    it('should sanitize HTML tags from valid-length strings (Controller Sanitizer)', async () => {
      const maliciousName = 'My <b>Key</b>';
      const req = new Request('http://localhost/api/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: maliciousName, 
          domain: 'example.com' 
        })
      });

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { id: 'admin-123', role: 'user', permissions: { settings: { api_key: true } } } as any);
        await next();
      });
      testApp.route('/api/apikey', apikeyRoutes);

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(201);

      const calledData = createSpy.mock.calls[0][1];
      expect(calledData.name).toBe('My &lt;b&gt;Key&lt;/b&gt;');
    });

    it('should allow creating a test key without a domain', async () => {
      const req = new Request('http://localhost/api/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'test',
          name: 'My Custom Test Key',
          expiresInHours: 12
        })
      });

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { id: 'admin-123', role: 'user', permissions: { settings: { api_key: true } } } as any);
        await next();
      });
      testApp.route('/api/apikey', apikeyRoutes);

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(201);
      const body: any = await res.json();
      expect(body.data.apiKey).toContain('auradash_ts');
      expect(body.data.expires_at).toBeDefined();
    });

    it('should reject test key if expiresInHours is greater than 24', async () => {
      const req = new Request('http://localhost/api/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'test',
          name: 'My Custom Test Key',
          expiresInHours: 25
        })
      });

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { id: 'admin-123', role: 'user', permissions: { settings: { api_key: true } } } as any);
        await next();
      });
      testApp.route('/api/apikey', apikeyRoutes);

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(400);
    });
  });
});
