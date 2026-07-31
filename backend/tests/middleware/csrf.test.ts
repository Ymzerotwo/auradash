import { Hono } from 'hono';
import { describe, it, expect } from 'vitest';
import { csrfProtection, rotateCsrfToken } from '../../src/middleware/csrf';

describe('Middleware: CSRF', () => {
  it('should skip safe methods (GET, HEAD, OPTIONS)', async () => {
    const app = new Hono();
    app.use('*', csrfProtection);
    app.get('/', (c) => c.text('OK'));
    app.options('/', (c) => c.text('OK'));

    const getRes = await app.request('/');
    expect(getRes.status).toBe(200);

    const headRes = await app.request('/', { method: 'HEAD' });
    expect(headRes.status).toBe(200);

    const optionsRes = await app.request('/', { method: 'OPTIONS' });
    expect(optionsRes.status).toBe(200);
  });

  it('should skip /csrf endpoint', async () => {
    const app = new Hono();
    app.use('*', csrfProtection);
    app.post('/api/auth/csrf', (c) => c.text('OK'));

    const res = await app.request('/api/auth/csrf', { method: 'POST' });
    expect(res.status).toBe(200);
  });

  it('should reject POST without tokens', async () => {
    const app = new Hono();
    app.use('*', csrfProtection);
    app.post('/', (c) => c.text('OK'));

    const res = await app.request('/', { method: 'POST' });
    expect(res.status).toBe(403);
    const data = await res.json() as any;
    expect(data.slug).toBe('CSRF_TOKEN_MISMATCH');
  });

  it('should reject POST with mismatched tokens', async () => {
    const app = new Hono();
    app.use('*', csrfProtection);
    app.post('/', (c) => c.text('OK'));

    const res = await app.request('/', {
      method: 'POST',
      headers: {
        'x-csrf-token': 'token1',
        'Cookie': 'csrf_token=token2'
      }
    });
    expect(res.status).toBe(403);
  });

  it('should accept POST with matching tokens', async () => {
    const app = new Hono();
    app.use('*', csrfProtection);
    app.post('/', (c) => c.text('OK'));

    const res = await app.request('/', {
      method: 'POST',
      headers: {
        'x-csrf-token': 'match123',
        'Cookie': 'csrf_token=match123'
      }
    });
    expect(res.status).toBe(200);
  });

  it('should rotate token correctly', async () => {
    const app = new Hono();
    app.get('/csrf', (c) => {
      const token = rotateCsrfToken(c);
      return c.json({ token });
    });

    const res = await app.request('/csrf');
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.token).toHaveLength(64); // 32 bytes hex = 64 chars
    expect(res.headers.get('x-csrf-token')).toBe(data.token);
    expect(res.headers.get('set-cookie')).toContain(`csrf_token=${data.token}`);
  });

  it('should reject PUT and DELETE methods without tokens', async () => {
    const app = new Hono();
    app.use('*', csrfProtection);
    app.put('/', (c) => c.text('OK'));
    app.delete('/', (c) => c.text('OK'));

    const putRes = await app.request('/', { method: 'PUT' });
    expect(putRes.status).toBe(403);

    const deleteRes = await app.request('/', { method: 'DELETE' });
    expect(deleteRes.status).toBe(403);
  });

  it('should detect isProduction correctly using hostname, not URL string matching', async () => {
    // A production URL containing "localhost" in the query param should still
    // be treated as production (hostname-based check, not string includes)
    const app = new Hono();
    app.use('*', csrfProtection);
    app.post('/api/action', (c) => c.text('OK'));

    // Request to a production-like host — missing Origin/Referer → should be blocked
    const res = await app.request('https://auradash.com/api/action?redirect=http://localhost', {
      method: 'POST',
      headers: {
        'x-csrf-token': 'valid_token',
        'Cookie': 'csrf_token=valid_token'
        // No Origin or Referer
      }
    });
    expect(res.status).toBe(403);
    const data = await res.json() as any;
    expect(data.slug).toBe('CSRF_MISSING_SOURCE');
  });

  it('should reject requests from unauthorized origins', async () => {
    const app = new Hono();
    app.use('*', csrfProtection);
    app.post('/', (c) => c.text('OK'));

    const res = await app.request('https://auradash.com/', {
      method: 'POST',
      headers: {
        'x-csrf-token': 'match123',
        'Cookie': 'csrf_token=match123',
        'Origin': 'https://evil-phishing-site.com'
      }
    });
    expect(res.status).toBe(403);
    const data = await res.json() as any;
    expect(data.slug).toBe('CSRF_ORIGIN_MISMATCH');
  });

  it('should use env ALLOWED_ORIGINS when provided', async () => {
    const app = new Hono<{ Bindings: { ALLOWED_ORIGINS: string } }>();
    app.use('*', csrfProtection);
    app.post('/', (c) => c.text('OK'));

    const res = await app.request('https://auradash.com/', {
      method: 'POST',
      headers: {
        'x-csrf-token': 'match123',
        'Cookie': 'csrf_token=match123',
        'Origin': 'https://custom-app.com'
      }
    }, {
      ALLOWED_ORIGINS: 'https://custom-app.com,https://staging.custom-app.com'
    });
    expect(res.status).toBe(200);
  });

  it('should reject origin not in env ALLOWED_ORIGINS when provided', async () => {
    const app = new Hono<{ Bindings: { ALLOWED_ORIGINS: string } }>();
    app.use('*', csrfProtection);
    app.post('/', (c) => c.text('OK'));

    const res = await app.request('https://auradash.com/', {
      method: 'POST',
      headers: {
        'x-csrf-token': 'match123',
        'Cookie': 'csrf_token=match123',
        'Origin': 'https://auradash.com' // Not in ALLOWED_ORIGINS
      }
    }, {
      ALLOWED_ORIGINS: 'https://custom-app.com'
    });
    expect(res.status).toBe(403);
    const data = await res.json() as any;
    expect(data.slug).toBe('CSRF_ORIGIN_MISMATCH');
  });

  describe('Additional Robustness Tests', () => {
    it('should return 403 CSRF_INVALID_SOURCE if Origin header is a malformed URL', async () => {
      const app = new Hono();
      app.use('*', csrfProtection);
      app.post('/', (c) => c.text('OK'));

      const res = await app.request('https://auradash.com/', {
        method: 'POST',
        headers: {
          'x-csrf-token': 'match123',
          'Cookie': 'csrf_token=match123',
          'Origin': 'http://[invalid-ipv6'
        }
      });
      expect(res.status).toBe(403);
      const data = await res.json() as any;
      expect(data.slug).toBe('CSRF_INVALID_SOURCE');
    });

    it('should allow requests with matched tokens but without Origin/Referer headers in local development (localhost)', async () => {
      const app = new Hono();
      app.use('*', csrfProtection);
      app.post('/', (c) => c.text('OK'));

      // Request URL is on localhost (development) -> isProductionRequest evaluates to false
      const res = await app.request('http://localhost/', {
        method: 'POST',
        headers: {
          'x-csrf-token': 'match123',
          'Cookie': 'csrf_token=match123'
          // No Origin or Referer header
        }
      });
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('OK');
    });
  });
});
