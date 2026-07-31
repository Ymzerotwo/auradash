import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyResetCodeSchema,
} from '../../src/validators/auth.validators';

// ─── loginSchema Tests ─────────────────────────────────────────────────────────

describe('Validators: Auth - loginSchema', () => {
  it('should accept valid credentials and lowercase username', () => {
    const result = loginSchema.safeParse({
      username: 'ADMIN',
      password: 'SecurePass123!',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe('admin');
    }
  });

  it('should trim whitespace from username', () => {
    const result = loginSchema.safeParse({
      username: '  admin  ',
      password: 'SecurePass123!',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe('admin');
    }
  });

  it('should accept valid credentials with rememberMe=true', () => {
    const result = loginSchema.safeParse({
      username: 'admin',
      password: 'password',
      rememberMe: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rememberMe).toBe(true);
    }
  });

  it('should accept valid credentials with rememberMe=false', () => {
    const result = loginSchema.safeParse({
      username: 'admin',
      password: 'password',
      rememberMe: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rememberMe).toBe(false);
    }
  });

  it('should accept valid credentials without rememberMe (optional)', () => {
    const result = loginSchema.safeParse({
      username: 'admin',
      password: 'password',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rememberMe).toBeUndefined();
    }
  });

  it('should reject empty username', () => {
    const result = loginSchema.safeParse({
      username: '',
      password: 'password',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing username', () => {
    const result = loginSchema.safeParse({
      password: 'password',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty password', () => {
    const result = loginSchema.safeParse({
      username: 'admin',
      password: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing password', () => {
    const result = loginSchema.safeParse({
      username: 'admin',
    });
    expect(result.success).toBe(false);
  });

  it('should reject completely empty object', () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject non-string username', () => {
    const result = loginSchema.safeParse({
      username: 123,
      password: 'password',
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-string password', () => {
    const result = loginSchema.safeParse({
      username: 'admin',
      password: true,
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-boolean rememberMe', () => {
    const result = loginSchema.safeParse({
      username: 'admin',
      password: 'password',
      rememberMe: 'yes',
    });
    expect(result.success).toBe(false);
  });

  it('should strip unknown properties', () => {
    const result = loginSchema.safeParse({
      username: 'admin',
      password: 'password',
      extraField: 'should be stripped',
    });
    expect(result.success).toBe(true);
  });
});

// ─── forgotPasswordSchema Tests ────────────────────────────────────────────────

describe('Validators: Auth - forgotPasswordSchema', () => {
  it('should accept a valid email and lowercase it', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'USER@EXAMPLE.COM',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('should trim whitespace from email', () => {
    const result = forgotPasswordSchema.safeParse({
      email: '  user@example.com  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('should accept email with subdomain', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'user@mail.example.com',
    });
    expect(result.success).toBe(true);
  });

  it('should accept email with plus addressing', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'user+tag@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email format', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('should reject email without domain', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'user@',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty email', () => {
    const result = forgotPasswordSchema.safeParse({
      email: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing email', () => {
    const result = forgotPasswordSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject non-string email', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 12345,
    });
    expect(result.success).toBe(false);
  });
});

// ─── verifyResetCodeSchema Tests ───────────────────────────────────────────────

describe('Validators: Auth - verifyResetCodeSchema', () => {
  it('should accept valid email and 6-digit code, and lowercase email, trim code', () => {
    const result = verifyResetCodeSchema.safeParse({
      email: ' USER@example.com ',
      code: '  123456  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
      expect(result.data.code).toBe('123456');
    }
  });

  it('should reject code shorter than 6 characters', () => {
    const result = verifyResetCodeSchema.safeParse({
      email: 'user@example.com',
      code: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('should reject code longer than 6 characters', () => {
    const result = verifyResetCodeSchema.safeParse({
      email: 'user@example.com',
      code: '1234567',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty code', () => {
    const result = verifyResetCodeSchema.safeParse({
      email: 'user@example.com',
      code: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing code', () => {
    const result = verifyResetCodeSchema.safeParse({
      email: 'user@example.com',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email with valid code', () => {
    const result = verifyResetCodeSchema.safeParse({
      email: 'invalid',
      code: '123456',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty object', () => {
    const result = verifyResetCodeSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should accept alphanumeric 6-char code', () => {
    const result = verifyResetCodeSchema.safeParse({
      email: 'user@example.com',
      code: 'abc123',
    });
    expect(result.success).toBe(true);
  });
});

// ─── resetPasswordSchema Tests ─────────────────────────────────────────────────

describe('Validators: Auth - resetPasswordSchema', () => {
  it('should accept valid reset data and normalize inputs', () => {
    const result = resetPasswordSchema.safeParse({
      email: ' UsEr@Example.com ',
      code: ' 123456 ',
      newPassword: 'NewSecurePass1!',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
      expect(result.data.code).toBe('123456');
    }
  });

  it('should reject password shorter than 8 characters', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'user@example.com',
      code: '123456',
      newPassword: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('should accept exactly 8 character password meeting all rules', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'user@example.com',
      code: '123456',
      newPassword: 'Aa1!5678',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty newPassword', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'user@example.com',
      code: '123456',
      newPassword: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject password missing uppercase letter', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'user@example.com',
      code: '123456',
      newPassword: 'lowercase1!',
    });
    expect(result.success).toBe(false);
  });

  it('should reject password missing lowercase letter', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'user@example.com',
      code: '123456',
      newPassword: 'UPPERCASE1!',
    });
    expect(result.success).toBe(false);
  });

  it('should reject password missing number', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'user@example.com',
      code: '123456',
      newPassword: 'NoNumbersHere!',
    });
    expect(result.success).toBe(false);
  });

  it('should reject password missing special character', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'user@example.com',
      code: '123456',
      newPassword: 'NoSpecialChars123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing newPassword', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'user@example.com',
      code: '123456',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid code with valid password', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'user@example.com',
      code: '12345',
      newPassword: 'ValidPassword123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email with valid code and password', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'not-email',
      code: '123456',
      newPassword: 'ValidPassword123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject completely empty object', () => {
    const result = resetPasswordSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should accept very long password meeting all rules', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'user@example.com',
      code: '123456',
      newPassword: 'Aa1!' + 'B'.repeat(251),
    });
    expect(result.success).toBe(true);
  });

  describe('Zod Constraints & Max Length Tests', () => {
    it('should reject login username exceeding 255 characters', () => {
      const longUsername = 'u'.repeat(256);
      const result = loginSchema.safeParse({
        username: longUsername,
        password: 'password123'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('too_long');
      }
    });

    it('should reject login password exceeding 255 characters', () => {
      const longPassword = 'p'.repeat(256);
      const result = loginSchema.safeParse({
        username: 'user',
        password: longPassword
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('too_long');
      }
    });

    it('should reject email exceeding 255 characters', () => {
      const longEmail = 'e'.repeat(250) + '@t.com';
      const result = forgotPasswordSchema.safeParse({
        email: longEmail
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('too_long');
      }
    });

    it('should reject code with incorrect length and return invalid_code message', () => {
      const result = verifyResetCodeSchema.safeParse({
        email: 'user@example.com',
        code: '12345'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('invalid_code');
      }
    });
  });
});
