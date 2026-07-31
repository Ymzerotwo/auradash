import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkspaceController } from '../../src/controllers/general-settings.controller';
import { WorkspaceService } from '../../src/services/general-settings.services';

describe('WorkspaceController', () => {
  let mockContext: any;
  let getSettingsSpy: any;
  let updateIdentitySpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    getSettingsSpy = vi.spyOn(WorkspaceService, 'getSettings');
    updateIdentitySpy = vi.spyOn(WorkspaceService, 'updateIdentity');

    mockContext = {
      req: {
        url: 'http://localhost/api/workspace',
        query: vi.fn(),
        param: vi.fn(),
        valid: vi.fn()
      },
      env: {
        DB: {},
        STORAGE: {},
        R2_PUBLIC_URL: 'http://r2.com'
      },
      get: vi.fn(),
      json: vi.fn((data, status) => ({ status, data }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSettings', () => {
    it('should return default fallback settings if not initialized', async () => {
      getSettingsSpy.mockResolvedValue(null);

      const response: any = await WorkspaceController.getSettings(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('SETTINGS_NOT_FOUND');
      expect(response.data.data.settings.siteName).toBe('');
    });

    it('should return workspace settings if exists', async () => {
      getSettingsSpy.mockResolvedValue({
        id: '1',
        siteName: 'AuraDash'
      } as any);

      const response: any = await WorkspaceController.getSettings(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('SETTINGS_FETCHED');
      expect(response.data.data.settings.siteName).toBe('AuraDash');
    });
  });

  describe('updateIdentity', () => {
    it('should update identity settings successfully', async () => {
      mockContext.req.valid.mockReturnValue({ siteName: 'New name' });
      updateIdentitySpy.mockResolvedValue(true);

      const response: any = await WorkspaceController.updateIdentity(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('IDENTITY_UPDATED');
    });
  });

  describe('updateContact', () => {
    it('should update contact successfully', async () => {
      mockContext.req.valid.mockReturnValue({ contactInfo: { phone: '123' } });
      vi.spyOn(WorkspaceService, 'updateContact').mockResolvedValue(true);

      const response: any = await WorkspaceController.updateContact(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('CONTACT_UPDATED');
    });
  });

  describe('updateSocial', () => {
    it('should update social successfully', async () => {
      mockContext.req.valid.mockReturnValue({ socialMedia: { facebook: 'url' } });
      vi.spyOn(WorkspaceService, 'updateSocial').mockResolvedValue(true);

      const response: any = await WorkspaceController.updateSocial(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('SOCIAL_UPDATED');
    });
  });

  describe('updateLocations', () => {
    it('should update locations successfully', async () => {
      mockContext.req.valid.mockReturnValue({ locations: [] });
      vi.spyOn(WorkspaceService, 'updateLocations').mockResolvedValue(true);

      const response: any = await WorkspaceController.updateLocations(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('LOCATIONS_UPDATED');
    });
  });

  describe('updateWorkingHours', () => {
    it('should update working hours successfully', async () => {
      mockContext.req.valid.mockReturnValue({ workingHours: {} });
      vi.spyOn(WorkspaceService, 'updateWorkingHours').mockResolvedValue(true);

      const response: any = await WorkspaceController.updateWorkingHours(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('WORKING_HOURS_UPDATED');
    });
  });

  describe('resolveMapUrl', () => {
    it('should reject requests with missing URL', async () => {
      mockContext.req.query.mockReturnValue(undefined);
      const response: any = await WorkspaceController.resolveMapUrl(mockContext);
      expect(response.status).toBe(400);
      expect(response.data.slug).toBe('MISSING_URL');
    });

    it('should block SSRF attempts with invalid protocols', async () => {
      mockContext.req.query.mockReturnValue('file:///etc/passwd');
      const response: any = await WorkspaceController.resolveMapUrl(mockContext);
      expect(response.status).toBe(400);
      expect(response.data.slug).toBe('INVALID_URL');
    });

    it('should block SSRF attempts with non-Google domains', async () => {
      mockContext.req.query.mockReturnValue('https://127.0.0.1/admin');
      const response: any = await WorkspaceController.resolveMapUrl(mockContext);
      expect(response.status).toBe(400);
      expect(response.data.slug).toBe('INVALID_MAP_URL');
    });

    it('should block malformed URLs', async () => {
      mockContext.req.query.mockReturnValue('not-a-url');
      const response: any = await WorkspaceController.resolveMapUrl(mockContext);
      expect(response.status).toBe(400);
      expect(response.data.slug).toBe('MALFORMED_URL');
    });

    it('should resolve valid Google Maps URL', async () => {
      mockContext.req.query.mockReturnValue('https://maps.app.goo.gl/some_id');
      const mockFetchResponse = { url: 'https://maps.google.com/resolved' };
      global.fetch = vi.fn().mockResolvedValue(mockFetchResponse as any);

      const response: any = await WorkspaceController.resolveMapUrl(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('MAP_RESOLVED');
      expect(response.data.data.resolvedUrl).toBe('https://maps.google.com/resolved');
    });
  });
});
