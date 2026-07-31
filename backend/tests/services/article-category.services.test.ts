import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArticleCategoryService } from '../../src/services/article-category.services';

describe('ArticleCategoryService', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      first: vi.fn(),
      all: vi.fn()
    };
  });

  describe('getAll', () => {
    it('should query article service_category with search and page parameters', async () => {
      mockDb.all.mockResolvedValue({ results: [{ id: '1', title: 'Tech' }] });
      mockDb.first.mockResolvedValue({ total: 1 });

      const result = await ArticleCategoryService.getAll(mockDb as any, 'tech', '1', '10', { role: 'Admin' });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('created_at'));
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('ORDER BY CASE WHEN Article_Categories.sort_order = 0 THEN 1 ELSE 0 END ASC, Article_Categories.sort_order ASC'));
    });
  });

  describe('getById', () => {
    it('should return null if category is missing', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await ArticleCategoryService.getById(mockDb as any, 'cat_123');
      expect(result).toBeNull();
    });

    it('should return category with parsed meta_data and seo_data', async () => {
      mockDb.first.mockResolvedValue({
        id: 'cat_123',
        meta_data: '{"custom": "data"}',
        seo_data: '{"title": "SEO Category"}'
      });

      const result = await ArticleCategoryService.getById(mockDb as any, 'cat_123');
      expect(result.meta_data).toEqual({ custom: 'data' });
      expect(result.seo_data).toEqual({ title: 'SEO Category' });
    });
  });

  describe('create', () => {
    it('should throw CATEGORY_EXISTS if slug is already used', async () => {
      mockDb.first.mockResolvedValue({ id: '123' });

      await expect(ArticleCategoryService.create(mockDb as any, { title: 'T', slug: 's' }, 'user_1'))
        .rejects.toThrow('CATEGORY_EXISTS');
    });

    it('should create article category successfully', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await ArticleCategoryService.create(mockDb as any, { title: 'Tech', slug: 'tech-category', is_active: true }, 'user_1');
      expect(result).toBeDefined();
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should return false if category is missing', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await ArticleCategoryService.update(mockDb as any, 'cat_123', { title: 'New' }, 'user_1');
      expect(result).toBe(false);
    });

    it('should throw CATEGORY_EXISTS if slug collision happens', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'cat_123' }) // exists
        .mockResolvedValueOnce({ id: 'other_cat' }); // collision

      await expect(ArticleCategoryService.update(mockDb as any, 'cat_123', { slug: 'collision-slug' }, 'user_1'))
        .rejects.toThrow('CATEGORY_EXISTS');
    });

    it('should perform category update successfully', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'cat_123' })
        .mockResolvedValueOnce(null); // no collision

      const result = await ArticleCategoryService.update(mockDb as any, 'cat_123', { title: 'Updated' }, 'user_1');
      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete and return true if changed row count', async () => {
      mockDb.run.mockResolvedValue({ success: true, meta: { changes: 1 } });
      const result = await ArticleCategoryService.delete(mockDb as any, 'cat_123');
      expect(result).toBe(true);
    });
  });
});
