import { describe, it, expect, vi } from 'vitest';
import { sendResponse } from '../../src/utils/response';
import { Hono } from 'hono';
import { requestId } from 'hono/request-id';

/**
 * Helper: creates a minimal Hono app that calls sendResponse with given params.
 * This avoids mocking the Context object — we test through a real Hono handler.
 */
async function callSendResponse(
  code: number,
  slug: string,
  message: string,
  data?: any,
  errorDetails?: any,
  url: string = 'http://localhost:3000/test',
  env: any = { ENVIRONMENT: 'development' }
): Promise<{ status: number; body: any }> {
  const app = new Hono();
  app.use('*', requestId());
  app.all('/test', (c) => {
    return sendResponse(c, code, slug, message, data, errorDetails);
  });

  const res = await app.request(url.replace('http://localhost:3000', ''), undefined, env);
  const body = await res.json();
  return { status: res.status, body };
}

// ─── Success Response Tests ────────────────────────────────────────────────────

describe('Utils: Response - Success Responses', () => {
  it('should return success=true for 200 status', async () => {
    const { status, body } = await callSendResponse(200, 'OK', 'Success');
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.slug).toBe('OK');
    expect(body.message).toBe('Success');
  });

  it('should include data in success response', async () => {
    const data = { user: { id: '1', name: 'Test' } };
    const { body } = await callSendResponse(200, 'USER_FOUND', 'Found', data);
    expect(body.data).toEqual(data);
  });

  it('should set data to null when not provided', async () => {
    const { body } = await callSendResponse(200, 'OK', 'Success');
    expect(body.data).toBeNull();
  });

  it('should include meta with requestId and timestamp', async () => {
    const { body } = await callSendResponse(200, 'OK', 'Success');
    expect(body.meta).toBeDefined();
    expect(body.meta.requestId).toBeDefined();
    expect(body.meta.timestamp).toBeDefined();
    // Timestamp should be a valid ISO string
    expect(() => new Date(body.meta.timestamp)).not.toThrow();
  });

  it('should return success=true for 201 Created', async () => {
    const { status, body } = await callSendResponse(201, 'CREATED', 'Resource created');
    expect(status).toBe(201);
    expect(body.success).toBe(true);
  });

  it('should return success=true for 204-range codes', async () => {
    const { body } = await callSendResponse(299, 'CUSTOM', 'Custom 2xx');
    expect(body.success).toBe(true);
  });
});

// ─── Error Response Tests ──────────────────────────────────────────────────────

describe('Utils: Response - Error Responses', () => {
  it('should return success=false for 400 status', async () => {
    const { status, body } = await callSendResponse(400, 'BAD_REQUEST', 'Bad request');
    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.data).toBeNull();
  });

  it('should return success=false for 401 status', async () => {
    const { body } = await callSendResponse(401, 'UNAUTHORIZED', 'Not authenticated');
    expect(body.success).toBe(false);
    expect(body.slug).toBe('UNAUTHORIZED');
  });

  it('should return success=false for 403 status', async () => {
    const { body } = await callSendResponse(403, 'FORBIDDEN', 'Access denied');
    expect(body.success).toBe(false);
  });

  it('should return success=false for 404 status', async () => {
    const { body } = await callSendResponse(404, 'NOT_FOUND', 'Not found');
    expect(body.success).toBe(false);
  });

  it('should return success=false for 429 status', async () => {
    const { body } = await callSendResponse(429, 'RATE_LIMITED', 'Too many requests');
    expect(body.success).toBe(false);
  });

  it('should return success=false for 500 status', async () => {
    const { body } = await callSendResponse(500, 'INTERNAL_SERVER_ERROR', 'Server error');
    expect(body.success).toBe(false);
  });

  it('should return success=false for 300 status (not 2xx)', async () => {
    const { body } = await callSendResponse(300, 'REDIRECT', 'Redirecting');
    expect(body.success).toBe(false);
  });
});

// ─── Validation Error Details Tests ────────────────────────────────────────────

describe('Utils: Response - Validation Errors', () => {
  it('should map Zod-style issues to details array', async () => {
    const zodIssues = [
      { path: ['username'], message: 'username_required' },
      { path: ['password'], message: 'password_required' },
    ];
    const { body } = await callSendResponse(400, 'VALIDATION_ERROR', 'Invalid input', null, zodIssues);

    expect(body.details).toBeDefined();
    expect(body.details).toHaveLength(2);
    expect(body.details[0]).toEqual({ field: 'username', issue: 'username_required' });
    expect(body.details[1]).toEqual({ field: 'password', issue: 'password_required' });
  });

  it('should handle nested path in Zod issues', async () => {
    const zodIssues = [
      { path: ['contact', 'email'], message: 'invalid_email' },
    ];
    const { body } = await callSendResponse(400, 'VALIDATION_ERROR', 'Invalid input', null, zodIssues);

    expect(body.details[0].field).toBe('contact.email');
  });

  it('should handle empty path array', async () => {
    const zodIssues = [
      { path: [], message: 'global_error' },
    ];
    const { body } = await callSendResponse(400, 'VALIDATION_ERROR', 'Invalid input', null, zodIssues);

    expect(body.details[0].field).toBe('');
  });

  it('should not include details for non-array errorDetails on 400', async () => {
    const { body } = await callSendResponse(400, 'BAD_REQUEST', 'Bad', null, 'not an array');
    expect(body.details).toBeUndefined();
  });
});

// ─── Debug Info Tests (Development Mode) ───────────────────────────────────────

describe('Utils: Response - Debug Info', () => {
  it('should include debug info for 500 error with Error object in dev', async () => {
    const error = new Error('Database connection failed');
    const { body } = await callSendResponse(
      500, 'INTERNAL_SERVER_ERROR', 'Server error', null, error,
      'http://localhost:3000/test'
    );

    expect(body.debug).toBeDefined();
    expect(body.debug.error_message).toBe('Database connection failed');
    expect(body.debug.stack).toBeDefined();
  });

  it('should include debug info for non-Error object in dev', async () => {
    const errorInfo = { query: 'SELECT *', errorCode: 'SQLITE_BUSY' };
    const { body } = await callSendResponse(
      500, 'INTERNAL_SERVER_ERROR', 'Server error', null, errorInfo,
      'http://localhost:3000/test'
    );

    expect(body.debug).toEqual(errorInfo);
  });

  it('should not include debug info for 400 errors with non-array details', async () => {
    const error = new Error('Some error');
    const { body } = await callSendResponse(400, 'BAD_REQUEST', 'Bad', null, error);
    // 400 with non-array errorDetails → neither details nor debug
    expect(body.details).toBeUndefined();
  });

  it('should not leak debug info when production URL contains localhost in query params', async () => {
    // This validates the isProduction hostname-based fix:
    // ?redirect=http://localhost should NOT trick isProduction into false
    const app = new Hono();
    app.use('*', requestId());
    app.all('/test', (c) => {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Server error', null, new Error('DB crashed'));
    });

    const res = await app.request('https://auradash.com/test?redirect=http://localhost', undefined, { ENVIRONMENT: 'production' });
    const body = await res.json() as any;

    // Production URL → debug must NOT be included
    expect(body.debug).toBeUndefined();
  });
});

// ─── Response Envelope Structure Tests ─────────────────────────────────────────

describe('Utils: Response - Envelope Structure', () => {
  it('should always include code, slug, message, meta', async () => {
    const { body } = await callSendResponse(200, 'TEST', 'Test message');

    expect(body).toHaveProperty('success');
    expect(body).toHaveProperty('code');
    expect(body).toHaveProperty('slug');
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('meta');
    expect(body.code).toBe(200);
  });

  it('should set correct HTTP status code', async () => {
    const { status } = await callSendResponse(418, 'TEAPOT', 'I am a teapot');
    expect(status).toBe(418);
  });

  describe('Additional Robustness Tests', () => {
    it('should default to production mode and hide debug info when environment binding is completely empty or undefined', async () => {
      const error = new Error('Sensitive DB crash trace');
      const { body } = await callSendResponse(
        500, 'SERVER_ERROR', 'Internal error', null, error,
        'https://auradash.com/test',
        {} // Empty env binding
      );

      expect(body.debug).toBeUndefined();
    });

    it('should include string/object errorDetails directly in debug field for 500 error in development', async () => {
      const rawStringError = 'Something bad happened directly';
      const { body } = await callSendResponse(
        500, 'SERVER_ERROR', 'Internal error', null, rawStringError,
        'http://localhost:3000/test',
        { ENVIRONMENT: 'development' }
      );

      expect(body.debug).toBe(rawStringError);
    });
  });
});
