import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArticleCategoryController } from '../../src/controllers/article-category.controller';
import { ArticleCategoryService } from '../../src/services/article-category.services';

describe('ArticleCategoryController', () => {
  let mockContext: any;
  let getAllSpy: any;
  let getByIdSpy: any;
  let createSpy: any;
  let updateSpy: any;
  let deleteSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    getAllSpy = vi.spyOn(ArticleCategoryService, 'getAll');
    getByIdSpy = vi.spyOn(ArticleCategoryService, 'getById').mockImplementation(async (db, id) => {
      if (id === 'cat_invalid' || id === 'non-existent' || id === 'missing') return null;
      return { id, slug: 'mock-slug' } as any;
    });
    createSpy = vi.spyOn(ArticleCategoryService, 'create');
    updateSpy = vi.spyOn(ArticleCategoryService, 'update');
    deleteSpy = vi.spyOn(ArticleCategoryService, 'delete');

    mockContext = {
      req: {
        url: 'http://localhost/api/article-categories',
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
    it('should retrieve service_category successfully', async () => {
      mockContext.req.query.mockReturnValue('');
      mockContext.get.mockReturnValue({ role: 'Admin' });
      getAllSpy.mockResolvedValue({
        data: [{ id: '1', title: 'Tech' }],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 }
      });

      const response: any = await ArticleCategoryController.getAll(mockContext);

      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('CATEGORIES_FETCHED');
    });
  });

  describe('getById', () => {
    it('should return 404 if category is missing', async () => {
      mockContext.req.param.mockReturnValue('cat_invalid');
      getByIdSpy.mockResolvedValue(null);

      const response: any = await ArticleCategoryController.getById(mockContext);
      expect(response.status).toBe(404);
      expect(response.data.slug).toBe('CATEGORY_NOT_FOUND');
    });
  });

  describe('create', () => {
    it('should return 201 on success', async () => {
      mockContext.req.valid.mockReturnValue({ title: 'T', slug: 's' });
      mockContext.get.mockReturnValue({ id: 'admin_123' });
      createSpy.mockResolvedValue('new_cat_id');

      const response: any = await ArticleCategoryController.create(mockContext);
      expect(response.status).toBe(201);
      expect(response.data.data.id).toBe('new_cat_id');
    });
  });

  describe('update', () => {
    it('should return 400 if category exists with new slug', async () => {
      mockContext.req.param.mockReturnValue('1');
      mockContext.req.valid.mockReturnValue({ slug: 's' });
      mockContext.get.mockReturnValue({ id: 'admin_123' });
      updateSpy.mockRejectedValue(new Error('CATEGORY_EXISTS'));

      const response: any = await ArticleCategoryController.update(mockContext);
      expect(response.status).toBe(400);
      expect(response.data.slug).toBe('CATEGORY_EXISTS');
    });
  });

  describe('delete', () => {
    it('should return 200 on delete success', async () => {
      mockContext.req.param.mockReturnValue('1');
      deleteSpy.mockResolvedValue(true);

      const response: any = await ArticleCategoryController.delete(mockContext);
      expect(response.status).toBe(200);
    });
  });
});
