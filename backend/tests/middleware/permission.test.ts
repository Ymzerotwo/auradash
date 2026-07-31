import { Hono } from 'hono';
import { describe, it, expect } from 'vitest';
import { requirePermission } from '../../src/middleware/permission';

describe('Middleware: Permission', () => {
  const getApp = () => {
    const app = new Hono<{ Variables: { user: any } }>();
    
    // Fake auth middleware to inject user
    app.use('*', async (c, next) => {
      const userHeader = c.req.header('x-test-user');
      if (userHeader) {
        c.set('user', JSON.parse(userHeader));
      }
      await next();
    });

    app.get('/admin-only', requirePermission(['admin']), (c) => c.text('OK'));
    app.get('/editor', requirePermission(['editor']), (c) => c.text('OK'));
    app.get('/write-articles', requirePermission(['articles.write']), (c) => c.text('OK'));
    app.get('/multiple-or', requirePermission(['manager', 'articles.write']), (c) => c.text('OK'));
    app.get('/multiple-and', requirePermission(['manager', 'articles.write'], { mode: 'AND' }), (c) => c.text('OK'));
    
    return app;
  };

  it('should reject requests without user', async () => {
    const app = getApp();
    const res = await app.request('/admin-only');
    expect(res.status).toBe(401);
  });

  it('should allow admin to access anything', async () => {
    const app = getApp();
    const res = await app.request('/editor', {
      headers: { 'x-test-user': JSON.stringify({ role: 'admin' }) }
    });
    expect(res.status).toBe(200);
  });

  it('should allow user with specific role', async () => {
    const app = getApp();
    const res = await app.request('/editor', {
      headers: { 'x-test-user': JSON.stringify({ role: 'editor' }) }
    });
    expect(res.status).toBe(200);
  });

  it('should reject user with wrong role', async () => {
    const app = getApp();
    const res = await app.request('/editor', {
      headers: { 'x-test-user': JSON.stringify({ role: 'user' }) }
    });
    expect(res.status).toBe(403);
  });

  it('should allow user with JSON string permission', async () => {
    const app = getApp();
    const res = await app.request('/write-articles', {
      headers: { 
        'x-test-user': JSON.stringify({ 
          role: 'user', 
          permissions: JSON.stringify({ articles: { write: true } }) 
        }) 
      }
    });
    expect(res.status).toBe(200);
  });

  it('should allow user with JSON object permission', async () => {
    const app = getApp();
    const res = await app.request('/write-articles', {
      headers: { 
        'x-test-user': JSON.stringify({ 
          role: 'user', 
          permissions: { articles: { write: true } } 
        }) 
      }
    });
    expect(res.status).toBe(200);
  });

  it('should reject user with explicitly denied permission', async () => {
    const app = getApp();
    const res = await app.request('/write-articles', {
      headers: { 
        'x-test-user': JSON.stringify({ 
          role: 'user', 
          permissions: { articles: { write: false } } 
        }) 
      }
    });
    expect(res.status).toBe(403);
  });

  it('should reject user missing the specific permission path', async () => {
    const app = getApp();
    const res = await app.request('/write-articles', {
      headers: { 
        'x-test-user': JSON.stringify({ 
          role: 'user', 
          permissions: { articles: { read: true } } 
        }) 
      }
    });
    expect(res.status).toBe(403);
  });

  it('should normalize randomly cased roles', async () => {
    const app = getApp();
    const res = await app.request('/admin-only', {
      headers: { 'x-test-user': JSON.stringify({ role: 'aDmIn' }) }
    });
    expect(res.status).toBe(200);
  });

  it('should reject JSON prototype pollution disguised as permissions', async () => {
    const app = getApp();
    const res = await app.request('/write-articles', {
      headers: { 
        'x-test-user': JSON.stringify({ 
          role: 'user', 
          permissions: '{"__proto__": {"write": true}}' 
        }) 
      }
    });
    expect(res.status).toBe(403);
  });

  it('should reject constructor prototype pollution attempts', async () => {
    const app = getApp();
    const res = await app.request('/write-articles', {
      headers: { 
        'x-test-user': JSON.stringify({ 
          role: 'user', 
          permissions: { constructor: { prototype: true } } 
        }) 
      }
    });
    expect(res.status).toBe(403);
  });

  it('should fail closed when permissions JSON is malformed', async () => {
    const app = getApp();
    const res = await app.request('/write-articles', {
      headers: { 
        'x-test-user': JSON.stringify({ 
          role: 'user', 
          permissions: '{ broken_json: "yes", }' 
        }) 
      }
    });
    expect(res.status).toBe(403);
  });

  it('should reject access for non-existent permission paths via hasOwnProperty check', async () => {
    const app = getApp();
    
    // Mount custom route that checks a non-existent path on Object.prototype like 'toString'
    app.get('/tostring-check', requirePermission(['toString']), (c) => c.text('OK'));

    const res = await app.request('/tostring-check', {
      headers: { 
        'x-test-user': JSON.stringify({ 
          role: 'user', 
          permissions: { articles: { read: true } } 
        }) 
      }
    });
    expect(res.status).toBe(403);
  });

  // AND Mode Tests
  it('should reject user in AND mode who has the role but lacks the permission', async () => {
    const app = getApp();
    const res = await app.request('/multiple-and', {
      headers: { 
        'x-test-user': JSON.stringify({ 
          role: 'manager', 
          permissions: { articles: { write: false } } 
        }) 
      }
    });
    expect(res.status).toBe(403);
  });

  it('should reject user in AND mode who has the permission but lacks the role', async () => {
    const app = getApp();
    const res = await app.request('/multiple-and', {
      headers: { 
        'x-test-user': JSON.stringify({ 
          role: 'user', 
          permissions: { articles: { write: true } } 
        }) 
      }
    });
    expect(res.status).toBe(403);
  });

  it('should allow user in AND mode who has both the role and the permission', async () => {
    const app = getApp();
    const res = await app.request('/multiple-and', {
      headers: { 
        'x-test-user': JSON.stringify({ 
          role: 'manager', 
          permissions: { articles: { write: true } } 
        }) 
      }
    });
    expect(res.status).toBe(200);
  });

  // OR Mode Tests
  it('should allow user in OR mode who has either the role or the permission', async () => {
    const app = getApp();
    // User has role but lacks permission
    const res1 = await app.request('/multiple-or', {
      headers: { 
        'x-test-user': JSON.stringify({ 
          role: 'manager', 
          permissions: { articles: { write: false } } 
        }) 
      }
    });
    expect(res1.status).toBe(200);

    // User has permission but lacks role
    const res2 = await app.request('/multiple-or', {
      headers: { 
        'x-test-user': JSON.stringify({ 
          role: 'user', 
          permissions: { articles: { write: true } } 
        }) 
      }
    });
    expect(res2.status).toBe(200);
  });

  it('should reject user in OR mode who lacks both the role and the permission', async () => {
    const app = getApp();
    const res = await app.request('/multiple-or', {
      headers: { 
        'x-test-user': JSON.stringify({ 
          role: 'user', 
          permissions: { articles: { write: false } } 
        }) 
      }
    });
    expect(res.status).toBe(403);
  });

  describe('Additional Robustness Tests', () => {
    it('should fail closed (return 403) when allowedRoles parameter is empty', async () => {
      const app = new Hono<{ Variables: { user: any } }>();
      app.use('*', async (c, next) => {
        c.set('user', { role: 'user', permissions: { articles: { write: true } } });
        await next();
      });
      // Empty rules array
      app.get('/empty-rules', requirePermission([]), (c) => c.text('OK'));

      const res = await app.request('/empty-rules');
      expect(res.status).toBe(403);
    });

    it('should reject access if user.permissions is null or missing entirely', async () => {
      const app = getApp();
      const res = await app.request('/write-articles', {
        headers: { 
          'x-test-user': JSON.stringify({ 
            role: 'user'
            // permissions is missing
          }) 
        }
      });
      expect(res.status).toBe(403);
    });

    it('should reject when a matching permission path lands on a nested object instead of a boolean true leaf', async () => {
      const app = getApp();
      const res = await app.request('/write-articles', {
        headers: { 
          'x-test-user': JSON.stringify({ 
            role: 'user', 
            // articles.write is an object, not boolean true
            permissions: { articles: { write: { allowed: true } } } 
          }) 
        }
      });
      expect(res.status).toBe(403);
    });
  });
});
