import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ServiceCategoryController } from '../../src/controllers/service-category.controller';
import { ServiceCategoryService } from '../../src/services/service-category.services';

// Mock cache purging to avoid runtime errors during testing
vi.mock('../../src/utils/cache.utils', () => ({
  purgePublicCache: vi.fn()
}));

describe('ServiceCategoryController', () => {
  let mockContext: any;
  let getAllSpy: any;
  let checkSlugSpy: any;
  let getByIdSpy: any;
  let createSpy: any;
  let updateSpy: any;
  let deleteSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    getAllSpy = vi.spyOn(ServiceCategoryService, 'getAll');
    checkSlugSpy = vi.spyOn(ServiceCategoryService, 'checkSlug');
    getByIdSpy = vi.spyOn(ServiceCategoryService, 'getById').mockImplementation(async (db, id) => {
      if (id === 'non-existent' || id === 'missing' || id === 'cat_invalid') return null;
      return { id, slug: 'mock-slug' } as any;
    });
    createSpy = vi.spyOn(ServiceCategoryService, 'create');
    updateSpy = vi.spyOn(ServiceCategoryService, 'update');
    deleteSpy = vi.spyOn(ServiceCategoryService, 'delete');

    mockContext = {
      req: {
        url: 'http://localhost/api/categories',
        query: vi.fn(),
        param: vi.fn(),
        valid: vi.fn()
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

  describe('getAll', () => {
    it('should fetch all service_category with search query and parameters', async () => {
      mockContext.req.query.mockImplementation((key: string) => {
        if (key === 'search') return 'Spa';
        if (key === 'page') return '1';
        if (key === 'limit') return '10';
        return '';
      });
      mockContext.get.mockReturnValue({ role: 'Admin' });
      getAllSpy.mockResolvedValue({
        data: [{ id: '1', name: 'Spa & Wellness' }],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 }
      });

      const response: any = await ServiceCategoryController.getAll(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('CATEGORIES_FETCHED');
      expect(response.data.data.categories).toHaveLength(1);
      expect(getAllSpy).toHaveBeenCalledWith(mockContext.env.DB, 'Spa', '1', '10', { role: 'Admin' }, '');
    });

    it('should return 500 when category service fails', async () => {
      mockContext.req.query.mockReturnValue('');
      getAllSpy.mockRejectedValue(new Error('DB_FAILED'));

      const response: any = await ServiceCategoryController.getAll(mockContext);
      expect(response.status).toBe(500);
      expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('checkSlug', () => {
    it('should return 400 if slug parameter is missing', async () => {
      mockContext.req.query.mockImplementation((key: string) => '');
      const response: any = await ServiceCategoryController.checkSlug(mockContext);
      expect(response.status).toBe(400);
      expect(response.data.slug).toBe('SLUG_REQUIRED');
    });

    it('should return slug availability successfully', async () => {
      mockContext.req.query.mockImplementation((key: string) => {
        if (key === 'slug') return 'hair-salon';
        if (key === 'exclude_id') return 'id-123';
        return '';
      });
      checkSlugSpy.mockResolvedValue(true);

      const response: any = await ServiceCategoryController.checkSlug(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('SLUG_CHECK');
      expect(response.data.data.available).toBe(true);
      expect(checkSlugSpy).toHaveBeenCalledWith(mockContext.env.DB, 'hair-salon', 'id-123');
    });

    it('should return 500 when checkSlug service fails', async () => {
      mockContext.req.query.mockImplementation((key: string) => {
        if (key === 'slug') return 'hair-salon';
        return '';
      });
      checkSlugSpy.mockRejectedValue(new Error('SLUG_DB_ERROR'));

      const response: any = await ServiceCategoryController.checkSlug(mockContext);
      expect(response.status).toBe(500);
      expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('getById', () => {
    it('should return category when found', async () => {
      mockContext.req.param.mockReturnValue('cat-uuid');
      mockContext.get.mockReturnValue({ role: 'Admin' });
      getByIdSpy.mockResolvedValue({ id: 'cat-uuid', name: 'Spa' });

      const response: any = await ServiceCategoryController.getById(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('CATEGORY_FETCHED');
      expect(response.data.data.category).toEqual({ id: 'cat-uuid', name: 'Spa' });
    });

    it('should return 404 if category is not found', async () => {
      mockContext.req.param.mockReturnValue('non-existent');
      getByIdSpy.mockResolvedValue(null);

      const response: any = await ServiceCategoryController.getById(mockContext);
      expect(response.status).toBe(404);
      expect(response.data.slug).toBe('CATEGORY_NOT_FOUND');
    });

    it('should return 500 when getById service fails', async () => {
      mockContext.req.param.mockReturnValue('error-uuid');
      getByIdSpy.mockRejectedValue(new Error('READ_ERROR'));

      const response: any = await ServiceCategoryController.getById(mockContext);
      expect(response.status).toBe(500);
      expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('create', () => {
    it('should create category successfully and purge cache', async () => {
      const payload = { name: 'Category 1', slug: 'cat-1', sort_order: 1 };
      mockContext.req.valid.mockReturnValue(payload);
      mockContext.get.mockReturnValue({ id: 'user_1' });
      createSpy.mockResolvedValue('new-cat-uuid');

      const response: any = await ServiceCategoryController.create(mockContext);
      expect(response.status).toBe(201);
      expect(response.data.slug).toBe('CATEGORY_CREATED');
      expect(response.data.data.id).toBe('new-cat-uuid');
      expect(createSpy).toHaveBeenCalledWith(mockContext.env.DB, payload, 'user_1');
    });

    it('should return 400 if slug already exists', async () => {
      mockContext.req.valid.mockReturnValue({ name: 'Duplicate', slug: 'duplicate' });
      mockContext.get.mockReturnValue({ id: 'user_1' });
      createSpy.mockRejectedValue(new Error('CATEGORY_EXISTS'));

      const response: any = await ServiceCategoryController.create(mockContext);
      expect(response.status).toBe(400);
      expect(response.data.slug).toBe('CATEGORY_EXISTS');
    });

    it('should return 400 if sort order is already taken', async () => {
      mockContext.req.valid.mockReturnValue({ name: 'Sorted', slug: 'sorted', sort_order: 2 });
      mockContext.get.mockReturnValue({ id: 'user_1' });
      createSpy.mockRejectedValue(new Error('SORT_ORDER_EXISTS'));

      const response: any = await ServiceCategoryController.create(mockContext);
      expect(response.status).toBe(400);
      expect(response.data.slug).toBe('SORT_ORDER_EXISTS');
    });

    it('should return 500 when creation fails unexpectedly', async () => {
      mockContext.req.valid.mockReturnValue({ name: 'Fail' });
      mockContext.get.mockReturnValue({ id: 'user_1' });
      createSpy.mockRejectedValue(new Error('UNKNOWN_DB_ERROR'));

      const response: any = await ServiceCategoryController.create(mockContext);
      expect(response.status).toBe(500);
      expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('update', () => {
    it('should update category successfully', async () => {
      mockContext.req.param.mockReturnValue('cat-uuid');
      mockContext.req.valid.mockReturnValue({ name: 'Updated Name', slug: 'updated-slug' });
      mockContext.get.mockReturnValue({ id: 'user_1' });
      updateSpy.mockResolvedValue(true);

      const response: any = await ServiceCategoryController.update(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('CATEGORY_UPDATED');
    });

    it('should return 404 if category to update is not found', async () => {
      mockContext.req.param.mockReturnValue('non-existent');
      mockContext.req.valid.mockReturnValue({ name: 'Updated' });
      mockContext.get.mockReturnValue({ id: 'user_1' });
      updateSpy.mockResolvedValue(false);

      const response: any = await ServiceCategoryController.update(mockContext);
      expect(response.status).toBe(404);
      expect(response.data.slug).toBe('CATEGORY_NOT_FOUND');
    });

    it('should return 400 if updated slug already exists', async () => {
      mockContext.req.param.mockReturnValue('cat-uuid');
      mockContext.req.valid.mockReturnValue({ slug: 'taken-slug' });
      mockContext.get.mockReturnValue({ id: 'user_1' });
      updateSpy.mockRejectedValue(new Error('CATEGORY_EXISTS'));

      const response: any = await ServiceCategoryController.update(mockContext);
      expect(response.status).toBe(400);
      expect(response.data.slug).toBe('CATEGORY_EXISTS');
    });

    it('should return 400 if updated sort order already exists', async () => {
      mockContext.req.param.mockReturnValue('cat-uuid');
      mockContext.req.valid.mockReturnValue({ sort_order: 5 });
      mockContext.get.mockReturnValue({ id: 'user_1' });
      updateSpy.mockRejectedValue(new Error('SORT_ORDER_EXISTS'));

      const response: any = await ServiceCategoryController.update(mockContext);
      expect(response.status).toBe(400);
      expect(response.data.slug).toBe('SORT_ORDER_EXISTS');
    });

    it('should return 500 when update fails unexpectedly', async () => {
      mockContext.req.param.mockReturnValue('cat-uuid');
      mockContext.req.valid.mockReturnValue({ name: 'Fail' });
      mockContext.get.mockReturnValue({ id: 'user_1' });
      updateSpy.mockRejectedValue(new Error('UNKNOWN_UPDATE_ERROR'));

      const response: any = await ServiceCategoryController.update(mockContext);
      expect(response.status).toBe(500);
      expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('delete', () => {
    it('should delete category successfully', async () => {
      mockContext.req.param.mockReturnValue('cat-uuid');
      deleteSpy.mockResolvedValue(true);

      const response: any = await ServiceCategoryController.delete(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('CATEGORY_DELETED');
    });

    it('should return 404 if category to delete is not found', async () => {
      mockContext.req.param.mockReturnValue('non-existent');
      deleteSpy.mockResolvedValue(false);

      const response: any = await ServiceCategoryController.delete(mockContext);
      expect(response.status).toBe(404);
      expect(response.data.slug).toBe('CATEGORY_NOT_FOUND');
    });

    it('should return 500 when deletion fails unexpectedly', async () => {
      mockContext.req.param.mockReturnValue('cat-uuid');
      deleteSpy.mockRejectedValue(new Error('DELETE_FAILED'));

      const response: any = await ServiceCategoryController.delete(mockContext);
      expect(response.status).toBe(500);
      expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
