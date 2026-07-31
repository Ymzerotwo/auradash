import { z } from 'zod';
import { sanitizeForDb } from '../utils/sanitize';

/**
 * Validates the login request body.
 * Enforces strict trimming and lowercasing to prevent case-sensitivity bypasses.
 */
export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, { message: 'username_required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
  password: z.string().min(1, { message: 'password_required' }).max(255, { message: 'too_long' }),
  rememberMe: z.boolean().optional(),
});

/**
 * Validates the forgot password request.
 */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'invalid_email' }).min(1, { message: 'email_required' }).max(255, { message: 'too_long' }),
});

/**
 * Validates the reset password payload, ensuring the new password meets security standards.
 */
export const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'invalid_email' }).min(1, { message: 'email_required' }).max(255, { message: 'too_long' }),
  code: z.string().trim().min(6, { message: 'invalid_code' }).max(6, { message: 'invalid_code' }).transform(sanitizeForDb),
  newPassword: z
    .string()
    .min(8, { message: 'password_too_short' })
    .max(255, { message: 'too_long' })
    .regex(/[A-Z]/, { message: 'password_no_uppercase' })
    .regex(/[a-z]/, { message: 'password_no_lowercase' })
    .regex(/[0-9]/, { message: 'password_no_number' })
    .regex(/[^A-Za-z0-9]/, { message: 'password_no_special' }),
});

/**
 * Validates the reset code verification payload without changing the password.
 */
export const verifyResetCodeSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'invalid_email' }).min(1, { message: 'email_required' }).max(255, { message: 'too_long' }),
  code: z.string().trim().min(6, { message: 'invalid_code' }).max(6, { message: 'invalid_code' }).transform(sanitizeForDb),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;
