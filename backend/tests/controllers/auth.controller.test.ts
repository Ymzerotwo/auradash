import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthController } from '../../src/controllers/auth.controller';
import { AuthService } from '../../src/services/auth.services';

describe('Controller: AuthController', () => {
  let mockContext: any;
  let loginSpy: any;
  let logoutSpy: any;
  let forgotPasswordSpy: any;
  let verifyResetCodeSpy: any;
  let resetPasswordSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IS_VITEST = 'true';

    loginSpy = vi.spyOn(AuthService, 'login').mockResolvedValue({
      user: { id: 'user_1', username: 'ahmed', email: 'ahmed@test.com', role: 'Admin', permissions: {} },
      sessionId: 'session:user_1:uuid123',
      expiresAt: new Date(Date.now() + 3600000)
    });
    logoutSpy = vi.spyOn(AuthService, 'logout').mockResolvedValue({ success: true });
    forgotPasswordSpy = vi.spyOn(AuthService, 'forgotPassword').mockResolvedValue({ success: true });
    verifyResetCodeSpy = vi.spyOn(AuthService, 'verifyResetCode').mockResolvedValue({ success: true });
    resetPasswordSpy = vi.spyOn(AuthService, 'resetPassword').mockResolvedValue({ success: true });

    mockContext = {
      req: {
        url: 'http://localhost/api/auth/login',
        header: vi.fn(),
        raw: { headers: { get: vi.fn() } },
        valid: vi.fn()
      },
      env: {
        DB: {},
        K1: { get: vi.fn(), delete: vi.fn(), put: vi.fn() },
        CLOUDFLARE_API_TOKEN: 'cf_token_123'
      },
      get: vi.fn(),
      set: vi.fn(),
      header: vi.fn(),
      // Mock Hono's response formatter
      json: vi.fn((data, status) => ({ status, data })),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCsrfToken()', () => {
    it('should generate a fresh CSRF token and return it', async () => {
      const response: any = await AuthController.getCsrfToken(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('CSRF_TOKEN_GENERATED');
      expect(response.data.data.token).toBeDefined();
    });
  });

  describe('login()', () => {
    it('should successfully authenticate, set session cookie, and rotate CSRF token', async () => {
      mockContext.req.valid.mockReturnValue({
        username: 'ahmed',
        password: 'password123',
        rememberMe: true
      });

      const response: any = await AuthController.login(mockContext);

      expect(loginSpy).toHaveBeenCalledWith(
        mockContext.env.DB,
        expect.anything(), // KV namespace
        'ahmed',
        'password123',
        true,
        expect.any(String),
        expect.any(String)
      );

      // Verify Set-Cookie header was called for the session_id with URL-encoded colon
      expect(mockContext.header).toHaveBeenCalledWith(
        'Set-Cookie',
        expect.stringContaining('session_id=session%3Auser_1%3Auuid123'),
        expect.anything()
      );

      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('LOGIN_SUCCESS');
      expect(response.data.data.user.username).toBe('ahmed');
    });

    it('should return error response if login credentials are invalid', async () => {
      mockContext.req.valid.mockReturnValue({
        username: 'unknown',
        password: 'wrongpassword'
      });
      loginSpy.mockResolvedValue({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
        status: 401
      });

      const response: any = await AuthController.login(mockContext);

      expect(response.status).toBe(401);
      expect(response.data.slug).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('logout()', () => {
    it('should successfully log out by calling AuthService and deleting the session cookie', async () => {
      mockContext.get.mockImplementation((k: string) => k === 'session_id' ? 'session:valid_token_123' : undefined);
      
      const response: any = await AuthController.logout(mockContext);

      expect(logoutSpy).toHaveBeenCalledWith(
        mockContext.env.DB, 
        mockContext.env.K1, 
        'session:valid_token_123'
      );

      expect(mockContext.header).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('session_id='), expect.anything());
      
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('LOGOUT_SUCCESS');
      expect(response.data.message).toBe('Logged out successfully');
    });

    it('should fallback to extracting session from the cookie if context is empty', async () => {
      mockContext.get.mockReturnValue(undefined);
      
      const cookieString = 'session_id=session:fallback_cookie_token';
      mockContext.req.header.mockImplementation((name: string) => name.toLowerCase() === 'cookie' ? cookieString : undefined);
      mockContext.req.raw.headers.get.mockImplementation((name: string) => name.toLowerCase() === 'cookie' ? cookieString : undefined);
      
      await AuthController.logout(mockContext);

      expect(logoutSpy).toHaveBeenCalledWith(
        mockContext.env.DB, 
        mockContext.env.K1, 
        'session:fallback_cookie_token'
      );
    });

    it('should handle service layer errors gracefully and return 500 INTERNAL_SERVER_ERROR', async () => {
      mockContext.get.mockReturnValue('session:123');
      logoutSpy.mockRejectedValue(new Error('KV connection failed'));

      const response: any = await AuthController.logout(mockContext);

      expect(response.status).toBe(500);
      expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should set secure: true on cookies when in production (not localhost)', async () => {
      mockContext.req.url = 'https://api.auradash.com/api/auth/logout';
      mockContext.get.mockReturnValue('session:secure_token');

      await AuthController.logout(mockContext);

      expect(mockContext.header).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('Secure'), expect.anything());
    });
  });

  describe('forgotPassword()', () => {
    it('should trigger recovery flow and return generic recovery email sent status', async () => {
      mockContext.req.valid.mockReturnValue({ email: 'ahmed@test.com' });

      const response: any = await AuthController.forgotPassword(mockContext);

      expect(forgotPasswordSpy).toHaveBeenCalledWith(
        mockContext.env.DB,
        'ahmed@test.com',
        mockContext.env
      );
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('RECOVERY_EMAIL_SENT');
    });
  });

  describe('verifyResetCode()', () => {
    it('should successfully verify a valid OTP code', async () => {
      mockContext.req.valid.mockReturnValue({ email: 'ahmed@test.com', code: '123456' });

      const response: any = await AuthController.verifyResetCode(mockContext);

      expect(verifyResetCodeSpy).toHaveBeenCalledWith(
        mockContext.env.DB,
        expect.anything(),
        'ahmed@test.com',
        '123456',
        expect.any(String)
      );
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('CODE_VERIFIED');
    });

    it('should return service error if code is invalid or expired', async () => {
      mockContext.req.valid.mockReturnValue({ email: 'ahmed@test.com', code: 'wrong' });
      verifyResetCodeSpy.mockResolvedValue({
        error: 'INVALID_CODE',
        message: 'Invalid recovery code',
        status: 400
      });

      const response: any = await AuthController.verifyResetCode(mockContext);

      expect(response.status).toBe(400);
      expect(response.data.slug).toBe('INVALID_CODE');
    });
  });

  describe('resetPassword()', () => {
    it('should successfully reset password', async () => {
      mockContext.req.valid.mockReturnValue({
        email: 'ahmed@test.com',
        code: '123456',
        newPassword: 'NewPassword123!'
      });

      const response: any = await AuthController.resetPassword(mockContext);

      expect(resetPasswordSpy).toHaveBeenCalledWith(
        mockContext.env.DB,
        expect.anything(),
        'ahmed@test.com',
        '123456',
        'NewPassword123!',
        expect.any(String)
      );
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('PASSWORD_RESET_SUCCESS');
    });

    it('should return error if reset verification fails', async () => {
      mockContext.req.valid.mockReturnValue({
        email: 'ahmed@test.com',
        code: '123456',
        newPassword: 'NewPassword123!'
      });
      resetPasswordSpy.mockResolvedValue({
        error: 'CODE_EXPIRED',
        message: 'Recovery code has expired',
        status: 400
      });

      const response: any = await AuthController.resetPassword(mockContext);

      expect(response.status).toBe(400);
      expect(response.data.slug).toBe('CODE_EXPIRED');
    });
  });

  describe('Additional Robustness Tests (Controller Error Paths)', () => {
    it('should return 500 if forgotPassword throws an unhandled database error', async () => {
      mockContext.req.valid.mockReturnValue({ email: 'ahmed@test.com' });
      forgotPasswordSpy.mockRejectedValue(new Error('D1 connection failed'));

      const response: any = await AuthController.forgotPassword(mockContext);

      expect(response.status).toBe(500);
      expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should return 500 if verifyResetCode throws an unhandled KV or database error', async () => {
      mockContext.req.valid.mockReturnValue({ email: 'ahmed@test.com', code: '123456' });
      verifyResetCodeSpy.mockRejectedValue(new Error('KV operation failed'));

      const response: any = await AuthController.verifyResetCode(mockContext);

      expect(response.status).toBe(500);
      expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should return 500 if resetPassword throws an unhandled database error', async () => {
      mockContext.req.valid.mockReturnValue({
        email: 'ahmed@test.com',
        code: '123456',
        newPassword: 'NewPassword123!'
      });
      resetPasswordSpy.mockRejectedValue(new Error('Database write error'));

      const response: any = await AuthController.resetPassword(mockContext);

      expect(response.status).toBe(500);
      expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
