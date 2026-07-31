import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sessionMiddleware } from '../../src/middleware/session';
import { AppContext } from '../../src/types';

describe('Middleware: Session', () => {
  const getApp = () => {
    const app = new Hono<AppContext>();
    app.use('*', sessionMiddleware);
    app.get('/protected', (c) => {
      const user = c.get('user');
      return c.json({ ok: true, user });
    });
    return app;
  };

  const sessionId = 'session:123456';

  beforeEach(async () => {
    // Clean KV
    await env.K1.delete(sessionId);
  });

  it('should reject requests without session_id', async () => {
    const app = getApp();
    const res = await app.request('/protected', undefined, env as any);
    expect(res.status).toBe(401);
  });

  it('should reject invalid session format', async () => {
    const app = getApp();
    const res = await app.request('/protected', {
      headers: { Cookie: 'session_id=invalid123' }
    }, env as any);
    expect(res.status).toBe(401);
  });

  it('should reject session not found in KV', async () => {
    const app = getApp();
    const res = await app.request('/protected', {
      headers: { Cookie: `session_id=${sessionId}` }
    }, env as any);
    expect(res.status).toBe(401);
  });

  it('should reject banned user session', async () => {
    await env.K1.put(sessionId, JSON.stringify({ 
      user_id: 'user_1', role: 'User', is_banned: 1, 
      expires_at: new Date(Date.now() + 100000).toISOString() 
    }));
    const app = getApp();
    const res = await app.request('/protected', {
      headers: { Cookie: `session_id=${sessionId}` }
    }, env as any);
    expect(res.status).toBe(403);
    const data = await res.json() as any;
    expect(data.slug).toBe('ACCOUNT_BANNED');
  });

  it('should reject expired session', async () => {
    await env.K1.put(sessionId, JSON.stringify({ 
      user_id: 'user_1', role: 'User',
      is_banned: 0, 
      expires_at: new Date(Date.now() - 10000).toISOString() 
    }));
    const app = getApp();
    const res = await app.request('/protected', {
      headers: { Cookie: `session_id=${sessionId}` }
    }, env as any);
    expect(res.status).toBe(401);
    const data = await res.json() as any;
    expect(data.slug).toBe('SESSION_EXPIRED');
  });

  it('should accept valid session via Cookie', async () => {
    await env.K1.put(sessionId, JSON.stringify({ 
      user_id: 'user_1',
      email: 'test@example.com',
      role: 'User',
      is_banned: 0, 
      expires_at: new Date(Date.now() + 100000).toISOString() 
    }));
    const app = getApp();
    const res = await app.request('/protected', {
      headers: { Cookie: `session_id=${sessionId}` }
    }, env as any);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.user.id).toBe('user_1');
    expect(data.user.email).toBe('test@example.com');
  });

  it('should accept valid session via Authorization Bearer', async () => {
    await env.K1.put(sessionId, JSON.stringify({ 
      user_id: 'user_1',
      role: 'User',
      is_banned: 0, 
      expires_at: new Date(Date.now() + 100000).toISOString() 
    }));
    const app = getApp();
    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${sessionId}` }
    }, env as any);
    expect(res.status).toBe(200);
  });

  it('should reject corrupted JSON in KV with CORRUPT_SESSION', async () => {
    await env.K1.put(sessionId, '{ this is not valid JSON!!!');
    const app = getApp();
    const res = await app.request('/protected', {
      headers: { Cookie: `session_id=${sessionId}` }
    }, env as any);
    expect(res.status).toBe(401);
    const data = await res.json() as any;
    expect(data.slug).toBe('CORRUPT_SESSION');
    // Verify corrupted session was purged from KV
    const remaining = await env.K1.get(sessionId);
    expect(remaining).toBeNull();
  });

  it('should reject session data missing required fields with INVALID_SESSION_DATA', async () => {
    // Session exists but lacks user_id and role — schema validation should catch this
    await env.K1.put(sessionId, JSON.stringify({ 
      expires_at: new Date(Date.now() + 100000).toISOString(),
      some_garbage: true
    }));
    const app = getApp();
    const res = await app.request('/protected', {
      headers: { Cookie: `session_id=${sessionId}` }
    }, env as any);
    expect(res.status).toBe(401);
    const data = await res.json() as any;
    expect(data.slug).toBe('INVALID_SESSION_DATA');
    // Verify invalid session was purged from KV
    const remaining = await env.K1.get(sessionId);
    expect(remaining).toBeNull();
  });

  it('should handle type coercion securely for is_banned flags', async () => {
    await env.K1.put(sessionId, JSON.stringify({ 
      user_id: 'user_1',
      role: 'User',
      is_banned: 'false', // string "false" - if coerced naively as Boolean("false"), it is true
      expires_at: new Date(Date.now() + 100000).toISOString() 
    }));
    const app = getApp();
    const res = await app.request('/protected', {
      headers: { Cookie: `session_id=${sessionId}` }
    }, env as any);
    expect(res.status).toBe(200);
  });

  it('should suspend account if IP and User-Agent both change', async () => {
    await env.K1.put(sessionId, JSON.stringify({ 
      user_id: 'user_1',
      role: 'User',
      is_banned: 0,
      ip_address: '1.2.3.4',
      user_agent: 'Old-Browser',
      expires_at: new Date(Date.now() + 100000).toISOString() 
    }));
    
    const originalDB = (env as any).DB;
    (env as any).DB = {
      ...originalDB,
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true }),
      batch: originalDB?.batch || vi.fn()
    };

    const app = getApp();
    const res = await app.request('/protected', {
      headers: { 
        Cookie: `session_id=${sessionId}`,
        'cf-connecting-ip': '5.6.7.8',
        'user-agent': 'New-Browser'
      }
    }, env as any);

    expect(res.status).toBe(403);
    const data = await res.json() as any;
    expect(data.slug).toBe('ACCOUNT_SUSPENDED');
    
    const remaining = await env.K1.get(sessionId);
    expect(remaining).toBeNull();
    
    expect((env as any).DB.prepare).toHaveBeenCalledWith('UPDATE Users SET is_banned = 1 WHERE id = ?');
    expect((env as any).DB.bind).toHaveBeenCalledWith('user_1');

    (env as any).DB = originalDB;
  });

  it('should update session IP if IP changes but User-Agent matches', async () => {
    await env.K1.put(sessionId, JSON.stringify({ 
      user_id: 'user_1',
      role: 'User',
      is_banned: 0,
      ip_address: '1.2.3.4',
      user_agent: 'Same-Browser',
      expires_at: new Date(Date.now() + 100000).toISOString() 
    }));

    const app = getApp();
    const res = await app.request('/protected', {
      headers: { 
        Cookie: `session_id=${sessionId}`,
        'cf-connecting-ip': '5.6.7.8',
        'user-agent': 'Same-Browser'
      }
    }, env as any);

    expect(res.status).toBe(200);
    
    const updatedSessionStr = await env.K1.get(sessionId);
    const updatedSession = JSON.parse(updatedSessionStr as string);
    expect(updatedSession.ip_address).toBe('5.6.7.8');
    expect(updatedSession.user_agent).toBe('Same-Browser');
  });

  it('should invalidate session but not ban account if role is Admin and IP/User-Agent both change', async () => {
    await env.K1.put(sessionId, JSON.stringify({ 
      user_id: 'admin_1',
      role: 'Admin',
      is_banned: 0,
      ip_address: '1.2.3.4',
      user_agent: 'Old-Browser',
      expires_at: new Date(Date.now() + 100000).toISOString() 
    }));
    
    const originalDB = (env as any).DB;
    (env as any).DB = {
      ...originalDB,
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true }),
      batch: originalDB?.batch || vi.fn()
    };

    const app = getApp();
    const res = await app.request('/protected', {
      headers: { 
        Cookie: `session_id=${sessionId}`,
        'cf-connecting-ip': '5.6.7.8',
        'user-agent': 'New-Browser'
      }
    }, env as any);

    expect(res.status).toBe(401);
    const data = await res.json() as any;
    expect(data.slug).toBe('SESSION_INVALIDATED');
    
    const remaining = await env.K1.get(sessionId);
    expect(remaining).toBeNull();
    
    expect((env as any).DB.prepare).not.toHaveBeenCalledWith('UPDATE Users SET is_banned = 1 WHERE id = ?');

    (env as any).DB = originalDB;
  });

  describe('Additional Robustness Tests', () => {
    it('should reject session IDs that do not start with the required "session:" prefix', async () => {
      const app = getApp();
      const res = await app.request('/protected', {
        headers: { Cookie: 'session_id=usr_12345_uuid' }
      }, env as any);

      expect(res.status).toBe(401);
      const data = await res.json() as any;
      expect(data.slug).toBe('UNAUTHORIZED');
    });

    it('should automatically set the client IP and User-Agent if the session in KV does not have them recorded yet', async () => {
      await env.K1.put(sessionId, JSON.stringify({ 
        user_id: 'user_1',
        role: 'User',
        is_banned: 0,
        expires_at: new Date(Date.now() + 100000).toISOString() 
      }));

      const app = getApp();
      const res = await app.request('/protected', {
        headers: { 
          Cookie: `session_id=${sessionId}`,
          'cf-connecting-ip': '1.2.3.4',
          'user-agent': 'Chrome-Browser'
        }
      }, env as any);

      expect(res.status).toBe(200);
      
      const stored = JSON.parse(await env.K1.get(sessionId) as string);
      expect(stored.ip_address).toBe('1.2.3.4');
      expect(stored.user_agent).toBe('Chrome-Browser');
    });
  });
});
