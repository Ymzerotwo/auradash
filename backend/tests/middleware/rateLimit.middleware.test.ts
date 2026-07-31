import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimiter } from '../../src/middleware/rateLimit.middleware';

describe('Middleware: Rate Limiter', () => {
  let mockContext: any;
  let mockNext: any;
  let mockLimit: any;

  beforeEach(() => {
    mockLimit = vi.fn().mockResolvedValue({ success: true });
    
    mockContext = {
      req: {
        header: vi.fn().mockImplementation((name: string) => {
          if (name === 'cf-connecting-ip') return '1.2.3.4';
          if (name === 'x-test-rate-limit') return 'true';
          return undefined;
        }),
        url: 'http://localhost/api/public/data'
      },
      env: {
        PUBLIC_LIMITER: {
          limit: mockLimit
        }
      },
      json: vi.fn((data, status) => ({ data, status })),
      get: vi.fn()
    };
    
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('should call next() if the path is in excludePaths', async () => {
    mockContext.req.url = 'http://localhost/api/public/inbox/messages';
    const middleware = rateLimiter('PUBLIC_LIMITER', ['/inbox', '/comments']);
    
    await middleware(mockContext, mockNext);
    
    expect(mockLimit).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call limiter with correct IP and call next() if successful', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      if (name === 'cf-connecting-ip') return '1.2.3.4';
      return undefined;
    });
    const middleware = rateLimiter('PUBLIC_LIMITER', ['/inbox', '/comments']);
    
    await middleware(mockContext, mockNext);
    
    expect(mockLimit).toHaveBeenCalledWith({ key: '1.2.3.4_guest' });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 429 if rate limit is exceeded', async () => {
    mockLimit.mockResolvedValue({ success: false });
    mockContext.req.header.mockImplementation((name: string) => {
      if (name === 'cf-connecting-ip') return '1.2.3.4';
      return undefined;
    });
    const middleware = rateLimiter('PUBLIC_LIMITER', []);
    
    const response = await middleware(mockContext, mockNext) as any;
    
    expect(mockLimit).toHaveBeenCalledWith({ key: '1.2.3.4_guest' });
    expect(response.status).toBe(429);
    expect(response.data.slug).toBe('RATE_LIMIT_EXCEEDED');
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next() if the limiter binding does not exist in local dev', async () => {
    mockContext.env.PUBLIC_LIMITER = undefined;
    const middleware = rateLimiter('PUBLIC_LIMITER', []);
    
    await middleware(mockContext, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
  });

  it('should NOT match partial path segments when excluding paths', async () => {
    // '/health' should NOT match '/healthcheck'
    mockContext.req.url = 'http://localhost/healthcheck';
    mockContext.req.header.mockImplementation((name: string) => {
      if (name === 'cf-connecting-ip') return '1.2.3.4';
      return undefined;
    });
    mockLimit.mockResolvedValue({ success: false });
    const middleware = rateLimiter('PUBLIC_LIMITER', ['/health']);

    const response = await middleware(mockContext, mockNext) as any;
    
    // Should NOT be excluded — /healthcheck is not /health
    expect(response.status).toBe(429);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should fallback to x-real-ip when cf-connecting-ip is absent', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      if (name === 'cf-connecting-ip') return undefined;
      if (name === 'x-real-ip') return '10.0.0.1';
      return undefined;
    });
    const middleware = rateLimiter('PUBLIC_LIMITER');
    
    await middleware(mockContext, mockNext);
    
    expect(mockLimit).toHaveBeenCalledWith({ key: '10.0.0.1_guest' });
  });

  it('should use composite key with user ID when user is authenticated', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      if (name === 'cf-connecting-ip') return '192.168.1.1';
      return undefined;
    });
    mockContext.get.mockImplementation((key: string) => {
      if (key === 'user') return { id: 'usr_12345' };
      return undefined;
    });
    const middleware = rateLimiter('PUBLIC_LIMITER');
    
    await middleware(mockContext, mockNext);
    
    expect(mockLimit).toHaveBeenCalledWith({ key: '192.168.1.1_usr_12345' });
  });

  it('should properly consume quota using DASHBOARD_LIMITER', async () => {
    mockContext.env.DASHBOARD_LIMITER = { limit: mockLimit };
    mockContext.req.header.mockImplementation(() => '10.0.0.1');
    const middleware = rateLimiter('DASHBOARD_LIMITER');
    
    await middleware(mockContext, mockNext);
    expect(mockLimit).toHaveBeenCalledWith({ key: '10.0.0.1_guest' });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should properly consume quota using STATE_LIMITER', async () => {
    mockContext.env.STATE_LIMITER = { limit: mockLimit };
    mockContext.req.header.mockImplementation(() => '10.0.0.1');
    const middleware = rateLimiter('STATE_LIMITER');
    
    await middleware(mockContext, mockNext);
    expect(mockLimit).toHaveBeenCalledWith({ key: '10.0.0.1_guest' });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should properly consume quota using NOTIFICATIONS_LIMITER', async () => {
    mockContext.env.NOTIFICATIONS_LIMITER = { limit: mockLimit };
    mockContext.req.header.mockImplementation(() => '10.0.0.1');
    const middleware = rateLimiter('NOTIFICATIONS_LIMITER');
    
    await middleware(mockContext, mockNext);
    expect(mockLimit).toHaveBeenCalledWith({ key: '10.0.0.1_guest' });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should reject evasion attempts using query strings', async () => {
    mockContext.req.url = 'http://localhost/api/public/data?ignore=/inbox';
    mockContext.req.header.mockImplementation((name: string) => {
      if (name === 'cf-connecting-ip') return '198.51.100.1';
      return undefined;
    });
    mockLimit.mockResolvedValueOnce({ success: false });
    
    const middleware = rateLimiter('PUBLIC_LIMITER', ['/inbox']);

    const response = await middleware(mockContext, mockNext) as any;
    
    expect(response.status).toBe(429);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should identify valid exclusions despite trailing slashes', async () => {
    mockContext.req.url = 'http://localhost/api/public/inbox/';
    const middleware = rateLimiter('PUBLIC_LIMITER', ['/inbox']);

    await middleware(mockContext, mockNext);
    
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it('should perfectly isolate users behind the same NAT (Shared Office IP Attack)', async () => {
    const ip = '104.28.0.0';
    mockContext.req.header.mockImplementation(() => ip);
    mockContext.env.DASHBOARD_LIMITER = { limit: mockLimit };
    const middleware = rateLimiter('DASHBOARD_LIMITER');

    // User A maxes out quota
    mockContext.get.mockImplementation((k: string) => k === 'user' ? { id: 'user_malicious' } : undefined);
    mockLimit.mockResolvedValueOnce({ success: false });
    const responseA = await middleware(mockContext, mockNext) as any;
    
    expect(responseA.status).toBe(429);
    expect(mockLimit).toHaveBeenCalledWith({ key: `${ip}_user_malicious` });
    
    // User B makes request from same IP
    mockContext.get.mockImplementation((k: string) => k === 'user' ? { id: 'user_legit' } : undefined);
    mockLimit.mockResolvedValueOnce({ success: true });
    await middleware(mockContext, mockNext);
    
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockLimit).toHaveBeenCalledWith({ key: `${ip}_user_legit` });
  });

  it('should strictly isolate quotas between different limiters', async () => {
    const ip = '1.2.3.4';
    mockContext.req.header.mockImplementation(() => ip);
    
    const mockDashboardLimit = vi.fn().mockResolvedValue({ success: false });
    const mockStateLimit = vi.fn().mockResolvedValue({ success: true });
    
    mockContext.env.DASHBOARD_LIMITER = { limit: mockDashboardLimit };
    mockContext.env.STATE_LIMITER = { limit: mockStateLimit };

    const dashMiddleware = rateLimiter('DASHBOARD_LIMITER');
    const stateMiddleware = rateLimiter('STATE_LIMITER');

    const dashResponse = await dashMiddleware(mockContext, mockNext) as any;
    expect(dashResponse.status).toBe(429);
    expect(mockDashboardLimit).toHaveBeenCalledWith({ key: `${ip}_guest` });

    await stateMiddleware(mockContext, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockStateLimit).toHaveBeenCalledWith({ key: `${ip}_guest` });
  });

  it('should handle Concurrent Flooding (Race Condition Simulation) without crashing', async () => {
    mockContext.req.header.mockImplementation(() => '99.99.99.99');
    const middleware = rateLimiter('PUBLIC_LIMITER');
    
    let calls = 0;
    mockLimit.mockImplementation(async () => {
      calls++;
      return { success: calls <= 5 };
    });

    const promises = Array.from({ length: 50 }).map(() => middleware(mockContext, mockNext));
    const results = await Promise.all(promises);

    const passed = mockNext.mock.calls.length;
    const blocked = results.filter((r: any) => r && r.status === 429).length;

    expect(passed).toBe(5);
    expect(blocked).toBe(45);
    expect(mockLimit).toHaveBeenCalledTimes(50);
  });

  describe('Additional Robustness Tests', () => {
    it('should fallback connecting IP to "unknown" if both cf-connecting-ip and x-real-ip headers are missing', async () => {
      mockContext.req.header.mockImplementation(() => undefined); // No IP headers at all
      const middleware = rateLimiter('PUBLIC_LIMITER');

      await middleware(mockContext, mockNext);

      expect(mockLimit).toHaveBeenCalledWith({ key: 'unknown_guest' });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle exclusion match correctly when requesting path matches excluded path but has nested sub-paths', async () => {
      // Excluded: '/inbox'
      // Requesting: '/api/public/inbox/conversations/123'
      mockContext.req.url = 'http://localhost/api/public/inbox/conversations/123';
      const middleware = rateLimiter('PUBLIC_LIMITER', ['/inbox']);

      await middleware(mockContext, mockNext);

      expect(mockLimit).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
