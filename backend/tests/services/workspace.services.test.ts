import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkspaceService } from '../../src/services/general-settings.services';
import * as mediaUpload from '../../src/utils/media-upload';

describe('WorkspaceService', () => {
  let mockDb: any;
  let removeMediaByUrlSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    removeMediaByUrlSpy = vi.spyOn(mediaUpload, 'removeMediaByUrl').mockResolvedValue(true as any);

    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      first: vi.fn()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSettings', () => {
    it('should return null if no settings rows exist', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await WorkspaceService.getSettings(mockDb as any);
      expect(result).toBeNull();
    });

    it('should parse and return settings when row is found', async () => {
      mockDb.first.mockResolvedValue({
        id: '1',
        business_name: 'AuraDash',
        logo_url: 'logo.png',
        contact_info: '{"phone":"123"}',
        social_links: '{"fb":"url"}',
        locations: '[]',
        working_hours: '{"sunday":"open"}'
      });

      const result = await WorkspaceService.getSettings(mockDb as any);
      expect(result).toEqual({
        id: '1',
        siteName: 'AuraDash',
        logoUrl: 'logo.png',
        contactInfo: { phone: '123' },
        socialMedia: { fb: 'url' },
        locations: [],
        workingHours: { sunday: 'open' }
      });
    });
  });

  describe('updateIdentity', () => {
    it('should create new settings if none exists', async () => {
      mockDb.first.mockResolvedValue(null); // No existing settings

      const body = {
        siteName: 'AuraDash',
        logoUrl: 'new_logo.png'
      };

      const result = await WorkspaceService.updateIdentity(mockDb as any, {}, 'http://r2.com', body);
      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalled();
      expect(removeMediaByUrlSpy).not.toHaveBeenCalled();
    });

    it('should update existing settings and trigger old logo deletion if changed', async () => {
      mockDb.first.mockResolvedValue({
        id: '1',
        logo_url: 'old_logo.png'
      });

      const body = {
        siteName: 'AuraDash New',
        logoUrl: 'new_logo.png'
      };

      const result = await WorkspaceService.updateIdentity(mockDb as any, {}, 'http://r2.com', body);
      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalled();
      expect(removeMediaByUrlSpy).toHaveBeenCalledWith('old_logo.png', expect.anything(), expect.anything(), 'http://r2.com');
    });
  });

  describe('updateContact', () => {
    it('should update contact info successfully', async () => {
      mockDb.first.mockResolvedValue({ id: '1' });
      const result = await WorkspaceService.updateContact(mockDb as any, { contactInfo: { phone: '123' } });
      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('updateSocial', () => {
    it('should update social info successfully', async () => {
      mockDb.first.mockResolvedValue(null);
      const result = await WorkspaceService.updateSocial(mockDb as any, { socialMedia: { fb: 'url' } });
      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('updateLocations', () => {
    it('should update locations successfully', async () => {
      mockDb.first.mockResolvedValue({ id: '1' });
      const result = await WorkspaceService.updateLocations(mockDb as any, { locations: [{ city: 'NY' }] });
      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('updateWorkingHours', () => {
    it('should update working hours successfully', async () => {
      mockDb.first.mockResolvedValue(null);
      const result = await WorkspaceService.updateWorkingHours(mockDb as any, { workingHours: { sunday: { closed: true } } });
      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalled();
    });
  });
});
