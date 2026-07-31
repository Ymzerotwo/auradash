import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProfileController } from '../../src/controllers/profile.controller';
import { ProfileService } from '../../src/services/profile.services';

describe('ProfileController', () => {
  let mockContext: any;
  let getProfileSpy: any;
  let updateProfileSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    getProfileSpy = vi.spyOn(ProfileService, 'getProfile');
    updateProfileSpy = vi.spyOn(ProfileService, 'updateProfile');

    mockContext = {
      req: {
        url: 'http://localhost/api/profile',
        json: vi.fn()
      },
      env: {
        DB: {},
        STORAGE: {},
        R2_PUBLIC_URL: 'url'
      },
      get: vi.fn(),
      json: vi.fn((data, status) => ({ status, data }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getProfile', () => {
    it('should return 401 if user is not in context', async () => {
      mockContext.get.mockReturnValue(undefined);

      const response: any = await ProfileController.getProfile(mockContext);
      expect(response.status).toBe(401);
      expect(response.data.slug).toBe('UNAUTHORIZED');
    });

    it('should return profile successfully', async () => {
      mockContext.get.mockReturnValue({ id: 'user_1' });
      getProfileSpy.mockResolvedValue({ user: { id: 'user_1', full_name: 'A' } });

      const response: any = await ProfileController.getProfile(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('PROFILE_FETCHED');
    });
  });

  describe('updateProfile', () => {
    it('should validate inputs and update profile', async () => {
      mockContext.get.mockReturnValue({ id: 'user_1' });
      mockContext.req.json.mockResolvedValue({ full_name: 'New Name' });
      updateProfileSpy.mockResolvedValue({ success: true });

      const response: any = await ProfileController.updateProfile(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('PROFILE_UPDATED');
    });
  });
});
