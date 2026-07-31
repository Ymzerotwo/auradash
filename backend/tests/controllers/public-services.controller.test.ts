import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PublicServicesController } from '../../src/controllers/public-services.controller';
import { PublicServicesService } from '../../src/services/public-services.services';

describe('PublicServicesController', () => {
  let mockContext: any;
  let getBookingCategoriesSpy: any;
  let getCategoryBySlugSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    getBookingCategoriesSpy = vi.spyOn(PublicServicesService, 'getBookingCategories');
    getCategoryBySlugSpy = vi.spyOn(PublicServicesService, 'getCategoryBySlug');

    mockContext = {
      req: {
        url: 'http://localhost/api/public',
        query: vi.fn(),
        param: vi.fn()
      },
      env: {
        DB: {}
      },
      get: vi.fn(),
      json: vi.fn((data, status) => ({ status, data }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getBookingCategories', () => {
    it('should fetch service_category successfully', async () => {
      getBookingCategoriesSpy.mockResolvedValue([{ id: '1', name: 'Cat' }]);

      const response: any = await PublicServicesController.getBookingCategories(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('BOOKING_CATEGORIES_FETCHED');
    });
  });

  describe('getCategoryBySlug', () => {
    it('should return 404 if category is missing', async () => {
      mockContext.req.param.mockReturnValue('invalid');
      getCategoryBySlugSpy.mockResolvedValue(null);

      const response: any = await PublicServicesController.getCategoryBySlug(mockContext);
      expect(response.status).toBe(404);
      expect(response.data.slug).toBe('CATEGORY_NOT_FOUND');
    });
  });
});
