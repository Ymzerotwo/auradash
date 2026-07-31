import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '../../src/utils/logger';

describe('Utils: Logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ─── info ────────────────────────────────────────────────────────────────────

  describe('logger.info', () => {
    it('should log formatted message with timestamp, level, and reqId', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      logger.info('req-123', 'User logged in');
      
      expect(spy).toHaveBeenCalledOnce();
      const logMsg = spy.mock.calls[0][0];
      expect(logMsg).toContain('[INFO]');
      expect(logMsg).toContain('[ReqID: req-123]');
      expect(logMsg).toContain('User logged in');
      // Should contain ISO timestamp
      expect(logMsg).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
    });

    it('should log data as JSON when provided', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const data = { userId: 'u1', action: 'login' };
      logger.info('req-123', 'Event', data);
      
      expect(spy).toHaveBeenCalledWith(expect.any(String), JSON.stringify(data));
    });

    it('should not include data arg when data is not provided', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      logger.info('req-123', 'Simple message');
      
      expect(spy).toHaveBeenCalledWith(expect.any(String));
      expect(spy.mock.calls[0].length).toBe(1);
    });

    it('should handle circular references in data without throwing', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const circular: any = { a: 1 };
      circular.self = circular;
      
      expect(() => logger.info('req-123', 'Circular data', circular)).not.toThrow();
      expect(spy).toHaveBeenCalledOnce();
    });
  });

  // ─── warn ────────────────────────────────────────────────────────────────────

  describe('logger.warn', () => {
    it('should log formatted warning with WARN level', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      logger.warn('req-456', 'Rate limit approaching');
      
      expect(spy).toHaveBeenCalledOnce();
      const logMsg = spy.mock.calls[0][0];
      expect(logMsg).toContain('[WARN]');
      expect(logMsg).toContain('[ReqID: req-456]');
    });

    it('should log data as JSON when provided', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      logger.warn('req-456', 'Warning', { remaining: 5 });
      
      expect(spy).toHaveBeenCalledWith(expect.any(String), '{"remaining":5}');
    });

    it('should handle undefined data gracefully', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      logger.warn('req-456', 'No data');
      
      expect(spy.mock.calls[0].length).toBe(1);
    });
  });

  // ─── error ───────────────────────────────────────────────────────────────────

  describe('logger.error', () => {
    it('should log formatted error with ERROR level', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      logger.error('req-789', 'Database failed');
      
      expect(spy).toHaveBeenCalledOnce();
      const logMsg = spy.mock.calls[0][0];
      expect(logMsg).toContain('[ERROR]');
      expect(logMsg).toContain('[ReqID: req-789]');
    });

    it('should log Error stack trace when Error object provided', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const err = new Error('Connection refused');
      logger.error('req-789', 'DB error', err);
      
      expect(spy).toHaveBeenCalledWith(expect.any(String), err.stack);
    });

    it('should log non-Error objects as safe JSON', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorData = { code: 'SQLITE_BUSY', query: 'SELECT *' };
      logger.error('req-789', 'Query error', errorData);
      
      expect(spy).toHaveBeenCalledWith(expect.any(String), JSON.stringify(errorData));
    });

    it('should handle circular error objects without throwing', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const circular: any = { code: 'ERR' };
      circular.self = circular;
      
      expect(() => logger.error('req-789', 'Circular', circular)).not.toThrow();
      expect(spy).toHaveBeenCalledOnce();
    });

    it('should handle string error argument', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      logger.error('req-789', 'Something failed', 'raw string error');
      expect(spy).toHaveBeenCalledWith(expect.any(String), 'raw string error');
    });
  });

  describe('Additional Robustness Tests: Sensitive Data Redaction', () => {
    it('should redact sensitive keys (password, token, secret, authorization) case-insensitively', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const sensitiveData = {
        password: 'my-secret-password',
        api_Token: 'super-token',
        client_secret: 'secret-123',
        AUTHORIZATION: 'Bearer token-xyz',
        safe_field: 'public-data'
      };

      logger.info('req-123', 'Sensitive Data Event', sensitiveData);

      expect(spy).toHaveBeenCalledOnce();
      const stringifiedData = spy.mock.calls[0][1];
      const parsedData = JSON.parse(stringifiedData);

      expect(parsedData.password).toBe('[REDACTED]');
      expect(parsedData.api_Token).toBe('[REDACTED]');
      expect(parsedData.client_secret).toBe('[REDACTED]');
      expect(parsedData.AUTHORIZATION).toBe('[REDACTED]');
      expect(parsedData.safe_field).toBe('public-data');
    });
  });
});
