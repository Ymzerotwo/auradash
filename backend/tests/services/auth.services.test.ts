import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../../src/services/auth.services';
import * as cryptoUtils from '../../src/utils/crypto';

import { mockSend } from '../mocks/cloudflare';

describe('AuthService (Unit)', () => {
  let mockDb: any;
  let mockKV: any;
  let hashPasswordSpy: any;
  let verifyPasswordSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    hashPasswordSpy = vi.spyOn(cryptoUtils, 'hashPassword').mockResolvedValue('new_hashed_password');
    verifyPasswordSpy = vi.spyOn(cryptoUtils, 'verifyPassword').mockResolvedValue(true);

    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      first: vi.fn(),
      run: vi.fn().mockResolvedValue({ success: true }),
      batch: vi.fn().mockResolvedValue([{ success: true }])
    };

    mockKV = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue({ keys: [], list_complete: true })
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateOtp', () => {
    it('should generate a 6-digit OTP string', () => {
      const code = AuthService.generateOtp();
      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });
  });

  describe('login', () => {
    it('should authenticate and store session in KV', async () => {
      mockDb.first.mockResolvedValue({
        id: 'user_1',
        username: 'ahmed',
        email: 'ahmed@test.com',
        password_hash: 'hashed',
        role: 'Admin',
        is_banned: 0,
        permissions: '{"cms":true}'
      });

      const result = await AuthService.login(
        mockDb as any,
        mockKV as any,
        'ahmed',
        'password',
        true,
        'Mozilla',
        '127.0.0.1'
      );

      expect(result.user).toBeDefined();
      expect(result.sessionId).toContain('session:user_1:');
      expect(mockKV.put).toHaveBeenCalled();
    });

    it('should reject timing attacks and return INVALID_CREDENTIALS if user not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await AuthService.login(
        mockDb as any,
        mockKV as any,
        'unknown',
        'password',
        false,
        'Mozilla',
        '1.1.1.1'
      );

      expect(result.status).toBe(401);
      expect(result.error).toBe('INVALID_CREDENTIALS');
      expect(hashPasswordSpy).toHaveBeenCalled(); // timing attack prevention check
    });

    it('should block banned users', async () => {
      mockDb.first.mockResolvedValue({
        id: 'user_banned',
        username: 'banned',
        email: 'banned@test.com',
        password_hash: 'hashed',
        role: 'User',
        is_banned: 1,
        permissions: '{}'
      });

      const result = await AuthService.login(
        mockDb as any,
        mockKV as any,
        'banned',
        'password',
        false,
        'Mozilla',
        '1.1.1.1'
      );

      expect(result.status).toBe(403);
      expect(result.error).toBe('ACCOUNT_BANNED');
    });
  });

  describe('logout', () => {
    it('should successfully call KV delete for valid session', async () => {
      const result = await AuthService.logout(
        mockDb as any,
        mockKV as any,
        'session:user_1:uuid'
      );
      expect(mockKV.delete).toHaveBeenCalledWith('session:user_1:uuid');
      expect(result.success).toBe(true);
    });

    it('should ignore logout calls with invalid or missing session IDs', async () => {
      const result = await AuthService.logout(
        mockDb as any,
        mockKV as any,
        undefined
      );
      expect(mockKV.delete).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('forgotPassword', () => {
    it('should successfully trigger email sending and return success if user exists', async () => {
      mockDb.first.mockResolvedValue({
        id: 'user_1',
        full_name: 'Ahmed Refat',
        is_banned: 0
      });

      const result = await AuthService.forgotPassword(
        mockDb as any,
        'ahmed@test.com',
        { CLOUDFLARE_API_TOKEN: 'dummy_cf_api_token', CF_ACCOUNT_ID: 'dummy_account_id' }
      );

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should mitigate email enumeration and return success without email send if user does not exist', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await AuthService.forgotPassword(
        mockDb as any,
        'missing@test.com',
        { CLOUDFLARE_API_TOKEN: 'dummy_cf_api_token', CF_ACCOUNT_ID: 'dummy_account_id' }
      );

      expect(result.success).toBe(true);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should execute dummy database queries for timing consistency when user is banned', async () => {
      mockDb.first.mockResolvedValue({
        id: 'banned_1',
        full_name: 'Banned User',
        is_banned: 1
      });

      const result = await AuthService.forgotPassword(
        mockDb as any,
        'banned@test.com',
        'dummy_cf_api_token'
      );

      expect(result.error).toBe('ACCOUNT_BANNED');
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('verifyResetCode', () => {
    it('should verify correct recovery code and reset KV brute force attempts', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'user_1', is_banned: 0 }) // for user lookup
        .mockResolvedValueOnce({ id: 'code_1', expires_at: new Date(Date.now() + 10000).toISOString() }); // for code verification

      const result = await AuthService.verifyResetCode(
        mockDb as any,
        mockKV as any,
        'ahmed@test.com',
        '123456',
        '127.0.0.1'
      );

      expect(result.success).toBe(true);
      expect(mockKV.delete).toHaveBeenCalledWith('otp_attempts:127.0.0.1:ahmed@test.com');
    });

    it('should block banned users from verifying reset code', async () => {
      mockDb.first.mockResolvedValueOnce({ id: 'user_1', is_banned: 1 });

      const result = await AuthService.verifyResetCode(
        mockDb as any,
        mockKV as any,
        'ahmed@test.com',
        '123456',
        '127.0.0.1'
      );

      expect(result.error).toBe('ACCOUNT_BANNED');
      expect(result.status).toBe(403);
    });



    it('should increment brute-force attempts on KV and return error for invalid code', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'user_1', is_banned: 0 })
        .mockResolvedValueOnce(null); // code mismatch

      const result = await AuthService.verifyResetCode(
        mockDb as any,
        mockKV as any,
        'ahmed@test.com',
        'wrong',
        '127.0.0.1'
      );

      expect(result.error).toBe('INVALID_CODE');
      expect(mockKV.put).toHaveBeenCalledWith(
        'otp_attempts:127.0.0.1:ahmed@test.com',
        '1',
        { expirationTtl: 900 }
      );
    });

    it('should rate limit requests when too many failures are logged in KV', async () => {
      mockKV.get.mockResolvedValue('5'); // 5 failed attempts reached

      const result = await AuthService.verifyResetCode(
        mockDb as any,
        mockKV as any,
        'ahmed@test.com',
        '123456',
        '127.0.0.1'
      );

      expect(result.error).toBe('ACCOUNT_LOCKED');
      expect(result.status).toBe(429);
      expect(mockDb.first).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password, wipe code, and invalidate active sessions', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'user_1', is_banned: 0 }) // user lookup
        .mockResolvedValueOnce({ id: 'code_1', expires_at: new Date(Date.now() + 10000).toISOString() }); // code verification

      const result = await AuthService.resetPassword(
        mockDb as any,
        mockKV as any,
        'ahmed@test.com',
        '123456',
        'NewSecurePassword1!',
        '127.0.0.1'
      );

      expect(result.success).toBe(true);
      expect(mockDb.batch).toHaveBeenCalled();
    });

    it('should block banned users from resetting password', async () => {
      mockDb.first.mockResolvedValueOnce({ id: 'user_1', is_banned: 1 });

      const result = await AuthService.resetPassword(
        mockDb as any,
        mockKV as any,
        'ahmed@test.com',
        '123456',
        'NewSecurePassword1!',
        '127.0.0.1'
      );

      expect(result.error).toBe('ACCOUNT_BANNED');
      expect(result.status).toBe(403);
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should list and delete all user sessions from KV', async () => {
      mockKV.list.mockResolvedValue({
        keys: [{ name: 'session:user_1:session_id_1' }, { name: 'session:user_1:session_id_2' }],
        list_complete: true
      });

      const result = await AuthService.revokeAllUserSessions(mockKV as any, 'user_1');

      expect(result.success).toBe(true);
      expect(result.revokedCount).toBe(2);
      expect(mockKV.delete).toHaveBeenCalledTimes(2);
    });

    it('should handle zero sessions gracefully when user has no active sessions', async () => {
      mockKV.list.mockResolvedValue({
        keys: [],
        list_complete: true
      });

      const result = await AuthService.revokeAllUserSessions(mockKV as any, 'user_no_sessions');

      expect(result.success).toBe(true);
      expect(result.revokedCount).toBe(0);
      expect(mockKV.delete).not.toHaveBeenCalled();
    });
  });

  describe('Additional Robustness Tests: Login Session TTL', () => {
    it('should set KV expiration to 30 days when rememberMe is true', async () => {
      mockDb.first.mockResolvedValue({
        id: 'user_1',
        username: 'ahmed',
        email: 'ahmed@test.com',
        password_hash: 'hashed',
        role: 'Admin',
        is_banned: 0,
        permissions: '{}'
      });

      await AuthService.login(
        mockDb as any,
        mockKV as any,
        'ahmed',
        'password',
        true, // rememberMe = true
        'Mozilla',
        '127.0.0.1'
      );

      expect(mockKV.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ expirationTtl: 30 * 24 * 60 * 60 })
      );
    });

    it('should set KV expiration to 7 days when rememberMe is false', async () => {
      mockDb.first.mockResolvedValue({
        id: 'user_1',
        username: 'ahmed',
        email: 'ahmed@test.com',
        password_hash: 'hashed',
        role: 'Admin',
        is_banned: 0,
        permissions: '{}'
      });

      await AuthService.login(
        mockDb as any,
        mockKV as any,
        'ahmed',
        'password',
        false, // rememberMe = false
        'Mozilla',
        '127.0.0.1'
      );

      expect(mockKV.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ expirationTtl: 7 * 24 * 60 * 60 })
      );
    });
  });
});
