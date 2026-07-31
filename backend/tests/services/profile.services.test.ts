import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileService } from '../../src/services/profile.services';
import * as cryptoUtils from '../../src/utils/crypto';
import * as mediaUpload from '../../src/utils/media-upload';

describe('ProfileService', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(cryptoUtils, 'hashPassword').mockResolvedValue('new_hashed_password');
    vi.spyOn(cryptoUtils, 'verifyPassword').mockResolvedValue(true);
    vi.spyOn(mediaUpload, 'removeMediaByUrl').mockResolvedValue(true);

    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      first: vi.fn()
    };
  });

  describe('getProfile', () => {
    it('should return 404 if user does not exist', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await ProfileService.getProfile(mockDb as any, 'user_123');
      expect(result.status).toBe(404);
      expect(result.error).toBe('USER_NOT_FOUND');
    });

    it('should return user and parse permissions JSON', async () => {
      mockDb.first.mockResolvedValue({
        id: 'user_123',
        permissions: '{"admin": true}'
      });

      const result = await ProfileService.getProfile(mockDb as any, 'user_123');
      expect(result.user).toBeDefined();
      expect(result.user.permissions).toEqual({ admin: true });
    });
  });

  describe('updateProfile', () => {
    it('should return 400 if setting new password without old password', async () => {
      mockDb.first.mockResolvedValue({
        id: 'user_123',
        role: 'Staff',
        password_hash: 'old_hashed'
      });

      const result = await ProfileService.updateProfile(mockDb as any, {}, 'url', { id: 'user_123' }, {
        newPassword: 'new'
      });

      expect(result.status).toBe(400);
      expect(result.error).toBe('OLD_PASSWORD_REQUIRED');
    });

    it('should return 401 if old password is invalid', async () => {
      mockDb.first.mockResolvedValue({
        id: 'user_123',
        role: 'Staff',
        password_hash: 'old_hashed'
      });
      vi.spyOn(cryptoUtils, 'verifyPassword').mockResolvedValueOnce(false);

      const result = await ProfileService.updateProfile(mockDb as any, {}, 'url', { id: 'user_123' }, {
        oldPassword: 'wrong',
        newPassword: 'new'
      });

      expect(result.status).toBe(401);
      expect(result.error).toBe('INVALID_OLD_PASSWORD');
    });

    it('should update password and name successfully', async () => {
      mockDb.first.mockResolvedValue({
        id: 'user_123',
        role: 'Staff',
        password_hash: 'old_hashed'
      });
      vi.spyOn(cryptoUtils, 'verifyPassword').mockResolvedValueOnce(true);

      const result = await ProfileService.updateProfile(mockDb as any, {}, 'url', { id: 'user_123' }, {
        oldPassword: 'correct',
        newPassword: 'new',
        full_name: 'Ahmed'
      });

      expect(result.success).toBe(true);
      expect(mockDb.run).toHaveBeenCalled();
    });

    it('should reject email collision if updated by admin', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'user_123', role: 'Admin' }) // user profile
        .mockResolvedValueOnce({ id: 'other_user' }); // email collision query

      const result = await ProfileService.updateProfile(mockDb as any, {}, 'url', { id: 'user_123' }, {
        email: 'collision@mail.com'
      });

      expect(result.status).toBe(400);
      expect(result.error).toBe('EMAIL_TAKEN');
    });
  });
});
