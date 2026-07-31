import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicServicesService } from '../../src/services/public-services.services';
import { PublicSettingsService } from '../../src/services/public-settings.services';

describe('PublicServicesService', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ results: [] }),
      first: vi.fn().mockResolvedValue(null)
    };
  });

  describe('getBookingCategories', () => {
    it('should return active categories', async () => {
      mockDb.all.mockResolvedValue({ results: [{ id: '1', name: 'Cat' }] });

      const result = await PublicServicesService.getBookingCategories(mockDb as any);
      expect(result).toHaveLength(1);
    });
  });

  describe('getBookingServices', () => {
    it('should return active services', async () => {
      mockDb.all.mockResolvedValue({ results: [{ id: '1', name: 'Service' }] });

      const result = await PublicServicesService.getBookingServices(mockDb as any);
      expect(result).toHaveLength(1);
    });
  });

  describe('getBookingCategoryServices', () => {
    it('should query category slug and return results', async () => {
      mockDb.all.mockResolvedValue({ results: [{ id: 's1', name: 'S' }] });

      const result = await PublicServicesService.getBookingCategoryServices(mockDb as any, 'cat-slug');
      expect(result).toHaveLength(1);
      expect(mockDb.bind).toHaveBeenCalledWith('cat-slug');
    });
  });

  describe('getCategories', () => {
    it('should return paginated and mapped categories', async () => {
      mockDb.all.mockResolvedValue({
        results: [{ id: '1', name: 'Cat', slug: 'cat', meta_data: '[]', seo_data: '{}' }]
      });
      mockDb.first.mockResolvedValue({ total: 1 });

      const result = await PublicServicesService.getCategories(mockDb as any, '1', '10');
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].meta_data).toEqual([]);
      expect(result.pagination.total).toBe(1);
    });

    it('should handle meta_data gracefully if it parses to an object instead of array', async () => {
      mockDb.all.mockResolvedValue({
        results: [{ id: '1', name: 'Cat', slug: 'cat', meta_data: '{"some":"object"}', seo_data: '{}' }]
      });
      mockDb.first.mockResolvedValue({ total: 1 });

      const result = await PublicServicesService.getCategories(mockDb as any, '1', '10');
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].meta_data).toEqual([]); // Fallback to empty array
    });
  });

  describe('getCategoryBySlug', () => {
    it('should return null if category doesn\'t exist', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await PublicServicesService.getCategoryBySlug(mockDb as any, 'slug');
      expect(result).toBeNull();
    });
  });

  describe('getServiceBySlug', () => {
    it('should return null if service doesn\'t exist', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await PublicServicesService.getServiceBySlug(mockDb as any, 'invalid-slug');
      expect(result).toBeNull();
    });

    it('should return mapped service data', async () => {
      mockDb.first.mockResolvedValue({ id: 's1', name: 'Service', slug: 'service-slug', meta_data: '[]', seo_data: '{}', category_id: 'c1' });

      const result = await PublicServicesService.getServiceBySlug(mockDb as any, 'service-slug');
      expect(result).not.toBeNull();
      if (result) {
        expect(result.id).toBe('s1');
        expect(result.meta_data).toEqual([]);
      }
    });
  });

  describe('getGlobalSettings', () => {
    it('should return default settings if empty', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await PublicSettingsService.getGlobalSettings(mockDb as any);
      expect(result.siteName).toBe('');
      expect(result.currency).toBe('USD');
    });

    it('should parse stored settings correctly', async () => {
      mockDb.first.mockResolvedValue({
        business_name: 'Aura',
        logo_url: 'logo',
        contact_info: '{"phone":"1"}',
        social_links: '[]',
        locations: '[]',
        working_hours: '{}',
        currency: 'USD',
        timezone: 'UTC'
      });

      const result = await PublicSettingsService.getGlobalSettings(mockDb as any);
      expect(result.siteName).toBe('Aura');
      expect(result.contactInfo).toEqual({ phone: '1' });
    });
  });
});
