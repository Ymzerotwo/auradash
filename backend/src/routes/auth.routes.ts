/**
 * ==========================================
 *        AuraDash Authentication Routes
 * ==========================================
 * 
 * Defines the routing endpoints for Authentication operations.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema, verifyResetCodeSchema } from '../validators/auth.validators';
import { sendResponse } from '../utils/response';
import { AuthController } from '../controllers/auth.controller';
import { AppContext } from '../types';
import { rateLimiter } from '../middleware/rateLimit.middleware';

const authRoutes = new Hono<AppContext>();

/**
 * GET /api/auth/csrf
 * Returns a CSRF token.
 */
authRoutes.get('/csrf', AuthController.getCsrfToken);

/**
 * POST /api/auth/login
 * Authenticates a user.
 */
authRoutes.post(
  '/login',
  rateLimiter('LOGIN_RECOVERY_LIMITER'),
  zValidator('json', loginSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  AuthController.login
);

/**
 * POST /api/auth/logout
 * Terminates the user session.
 */
authRoutes.post('/logout', AuthController.logout);

/**
 * POST /api/auth/forgot-password
 * Initiates the password recovery flow.
 */
authRoutes.post(
  '/forgot-password',
  rateLimiter('LOGIN_RECOVERY_LIMITER'),
  zValidator('json', forgotPasswordSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  AuthController.forgotPassword
);

/**
 * POST /api/auth/resend-code
 * Resends the password recovery OTP code.
 */
authRoutes.post(
  '/resend-code',
  rateLimiter('LOGIN_RECOVERY_LIMITER'),
  zValidator('json', forgotPasswordSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  AuthController.resendResetCode
);

/**
 * POST /api/auth/reset-password
 * Resets the password using reset code.
 */
authRoutes.post(
  '/reset-password',
  rateLimiter('LOGIN_RECOVERY_LIMITER'),
  zValidator('json', resetPasswordSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  AuthController.resetPassword
);

/**
 * POST /api/auth/verify-code
 * Validates the password recovery OTP code.
 */
authRoutes.post(
  '/verify-code',
  rateLimiter('VERIFY_CODE_LIMITER'),
  zValidator('json', verifyResetCodeSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  AuthController.verifyResetCode
);

export default authRoutes;
