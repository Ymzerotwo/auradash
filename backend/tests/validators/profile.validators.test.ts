import { describe, it, expect } from 'vitest';
import { updateProfileSchema } from '../../src/validators/profile.validators';

describe('Profile Validators', () => {
  it('should validate valid profile update data', () => {
    const validData = {
      full_name: 'John Doe',
      username: 'john.doe_99',
      email: 'john@example.com',
      photo_url: 'https://example.com/avatar.jpg',
      job_title: 'Developer'
    };

    const result = updateProfileSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should validate valid password change data', () => {
    const validData = {
      oldPassword: 'current_password_123',
      newPassword: 'new_secure_password'
    };

    const result = updateProfileSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should fail if newPassword is provided but oldPassword is missing', () => {
    const invalidData = {
      newPassword: 'new_secure_password'
    };

    const result = updateProfileSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('current_password_required_for_new');
    }
  });

  it('should fail if username format is invalid', () => {
    const invalidData = {
      username: 'john!doe' // Contains exclamation mark
    };

    const result = updateProfileSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
