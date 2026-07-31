import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import checkSlugRoutes from '../../src/routes/check-slug.routes';
import { AppContext } from '../../src/types';

describe('Pentest: Search Controller & Routes Security', () => {
  let mockDb: any;
  let mockEnv: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null)
    };

    mockEnv = {
      DB: mockDb
    };
  });

  describe('1. Parameter Validation & Boundary Checking', () => {
    it('should reject requests missing the slug parameter', async () => {
      const req = new Request('http://localhost/api/search/check-slug?table=services', {
        method: 'GET'
      });

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { role: 'admin' } as any);
        await next();
      });
      testApp.route('/api/search/check-slug', checkSlugRoutes);

      const res = await testApp.fetch(req, mockEnv);
      const data: any = await res.json();

      expect(res.status).toBe(400);
      expect(data.slug).toBe('VALIDATION_ERROR');
      expect(data.details.some((detail: any) => detail.field === 'slug')).toBe(true);
    });

    it('should reject requests missing the table parameter', async () => {
      const req = new Request('http://localhost/api/search/check-slug?slug=test-slug', {
        method: 'GET'
      });

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { role: 'admin' } as any);
        await next();
      });
      testApp.route('/api/search/check-slug', checkSlugRoutes);

      const res = await testApp.fetch(req, mockEnv);
      const data: any = await res.json();

      expect(res.status).toBe(400);
      expect(data.slug).toBe('VALIDATION_ERROR');
      expect(data.details.some((detail: any) => detail.field === 'table')).toBe(true);
    });
  });

  describe('2. SQL Injection & Table Whitelist Verification', () => {
    it('should block non-whitelisted tables (SQL structure discovery protection)', async () => {
      const maliciousTables = [
        'users',
        'sqlite_master',
        'Services; DROP TABLE Services;--',
        'nonexistent_table'
      ];

      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { role: 'admin' } as any);
        await next();
      });
      testApp.route('/api/search/check-slug', checkSlugRoutes);

      for (const table of maliciousTables) {
        const req = new Request(`http://localhost/api/search/check-slug?slug=test&table=${encodeURIComponent(table)}`, {
          method: 'GET'
        });

        const res = await testApp.fetch(req, mockEnv);
        const data: any = await res.json();

        expect(res.status).toBe(400);
        expect(data.slug).toBe('VALIDATION_ERROR');
        expect(data.details.some((detail: any) => detail.field === 'table')).toBe(true);
        expect(mockDb.prepare).not.toHaveBeenCalled();
      }
    });

    it('should parameterized queries and bind values for allowed tables correctly', async () => {
      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { role: 'admin' } as any);
        await next();
      });
      testApp.route('/api/search/check-slug', checkSlugRoutes);

      const req = new Request('http://localhost/api/search/check-slug?slug=test-slug-1&table=services&exclude_id=123', {
        method: 'GET'
      });

      mockDb.first.mockResolvedValue({ id: 'existing-id' });

      const res = await testApp.fetch(req, mockEnv);
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.available).toBe(false);

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT id FROM Services WHERE slug = ? AND id != ?');
      expect(mockDb.bind).toHaveBeenCalledWith('test-slug-1', '123');
    });
  });

  describe('3. Information Disclosure Prevention', () => {
    it('should NOT leak database structure or query syntax errors to the client in production', async () => {
      const testApp = new Hono<AppContext>();
      testApp.use('*', async (c, next) => {
        c.set('user', { role: 'admin' } as any);
        await next();
      });
      testApp.route('/api/search/check-slug', checkSlugRoutes);

      const req = new Request('https://api.auradash.com/api/search/check-slug?slug=test-slug&table=service-categories', {
        method: 'GET'
      });

      mockDb.first.mockRejectedValue(new Error('SQLite error: database disk image is malformed'));

      const res = await testApp.fetch(req, mockEnv);
      const data: any = await res.json();

      expect(res.status).toBe(500);
      expect(data.slug).toBe('INTERNAL_SERVER_ERROR');
      
      const responseText = JSON.stringify(data);
      expect(responseText).not.toContain('SQLite error');
      expect(responseText).not.toContain('disk image is malformed');
      expect(data.debug).toBeUndefined();
    });
  });
});
