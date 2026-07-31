import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceCategoryService } from '../../src/services/service-category.services';

describe('ServiceCategoryService', () => {
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
    it('should query categories with search and pagination', async () => {
      mockDb.all.mockResolvedValue({ results: [{ id: 'c1', name: 'Cat 1', slug: 'cat-1', sort_order: 1, is_active: 1 }] });
      mockDb.first.mockResolvedValue({ total: 1 });

      const result = await ServiceCategoryService.getAll(mockDb as any, 'Cat', '1', '10', { role: 'Admin' });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('service_category.created_at, service_category.updated_at')
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY CASE WHEN service_category.sort_order = 0 THEN 1 ELSE 0 END ASC, service_category.sort_order ASC')
      );
      expect(mockDb.bind).toHaveBeenCalledWith('%Cat%', '%Cat%', 10, 0);
    });

    it('should query without audit fields if not admin', async () => {
      mockDb.all.mockResolvedValue({ results: [{ id: 'c1', name: 'Cat 1' }] });
      mockDb.first.mockResolvedValue({ total: 1 });

      const result = await ServiceCategoryService.getAll(mockDb as any, '', '1', '10', { role: 'User' });
      expect(result.data).toBeDefined();
      expect(mockDb.prepare).not.toHaveBeenCalledWith(
        expect.stringContaining('service_category.created_at, service_category.updated_at')
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY CASE WHEN sort_order = 0 THEN 1 ELSE 0 END ASC, sort_order ASC')
      );
    });
  });

  describe('checkSlug', () => {
    it('should return true if slug does not exist', async () => {
      mockDb.first.mockResolvedValue(null);
      const result = await ServiceCategoryService.checkSlug(mockDb as any, 'cat-slug');
      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT id FROM service_category WHERE slug = ?');
    });

    it('should return false if slug exists', async () => {
      mockDb.first.mockResolvedValue({ id: 'existing' });
      const result = await ServiceCategoryService.checkSlug(mockDb as any, 'cat-slug');
      expect(result).toBe(false);
    });

    it('should exclude current category ID when checking slug', async () => {
      mockDb.first.mockResolvedValue(null);
      const result = await ServiceCategoryService.checkSlug(mockDb as any, 'cat-slug', 'current-id');
      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT id FROM service_category WHERE slug = ? AND id != ?');
    });
  });

  describe('getById', () => {
    it('should return null if category is not found', async () => {
      mockDb.first.mockResolvedValue(null);
      const result = await ServiceCategoryService.getById(mockDb as any, 'invalid');
      expect(result).toBeNull();
    });

    it('should return category with parsed meta_data and seo_data', async () => {
      mockDb.first.mockResolvedValue({
        id: 'c1',
        name: 'Cat',
        slug: 'cat',
        meta_data: '[{"id": "1", "type": "text-info", "data": {"text": "hello"}}]',
        seo_data: '{"meta_title": "SEO"}'
      });
      const result = await ServiceCategoryService.getById(mockDb as any, 'c1');
      expect(result.meta_data).toEqual([{ id: '1', type: 'text-info', data: { text: 'hello' } }]);
      expect(result.seo_data).toEqual({ meta_title: 'SEO' });
    });

    it('should fallback to empty structures if json parsing fails', async () => {
      mockDb.first.mockResolvedValue({
        id: 'c1',
        meta_data: '{invalid-json}',
        seo_data: '{invalid-json}'
      });
      const result = await ServiceCategoryService.getById(mockDb as any, 'c1');
      expect(result.meta_data).toEqual([]);
      expect(result.seo_data).toEqual({});
    });
  });

  describe('create', () => {
    it('should throw CATEGORY_EXISTS if slug already taken', async () => {
      mockDb.first.mockResolvedValue({ id: 'existing' });

      await expect(ServiceCategoryService.create(mockDb as any, { name: 'Cat', slug: 'cat-slug' }, 'user_1'))
        .rejects.toThrow('CATEGORY_EXISTS');
    });

    it('should throw SORT_ORDER_EXISTS if sort order is already taken', async () => {
      mockDb.first
        .mockResolvedValueOnce(null) // slug ok
        .mockResolvedValueOnce({ id: 'existing_with_same_order' }); // sort order exists

      await expect(ServiceCategoryService.create(mockDb as any, { name: 'Cat', slug: 'cat-slug', sort_order: 5 }, 'user_1'))
        .rejects.toThrow('SORT_ORDER_EXISTS');
    });

    it('should auto-increment sort order if not specified or 0', async () => {
      mockDb.first
        .mockResolvedValueOnce(null) // slug ok
        .mockResolvedValueOnce({ max_val: 10 }); // max sort order is 10

      const result = await ServiceCategoryService.create(mockDb as any, { name: 'Cat', slug: 'cat-slug' }, 'user_1');
      expect(result).toBeDefined();
      expect(mockDb.run).toHaveBeenCalled();
    });

    it('should create category successfully with explicit properties', async () => {
      mockDb.first
        .mockResolvedValueOnce(null) // slug ok
        .mockResolvedValueOnce(null); // sort order ok

      const result = await ServiceCategoryService.create(
        mockDb as any,
        { name: 'Cat', slug: 'cat-slug', sort_order: 3, is_active: true, meta_data: [{ id: '1' }], seo_data: { meta_title: 'Title' } },
        'user_1'
      );
      expect(result).toBeDefined();
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should return false if target category doesn\'t exist', async () => {
      mockDb.first.mockResolvedValue(null);
      const result = await ServiceCategoryService.update(mockDb as any, 'c1', { name: 'New' }, 'user_1');
      expect(result).toBe(false);
    });

    it('should throw CATEGORY_EXISTS on slug collision', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'c1' }) // exists
        .mockResolvedValueOnce({ id: 'other' }); // slug collision

      await expect(ServiceCategoryService.update(mockDb as any, 'c1', { slug: 'slug-new' }, 'user_1'))
        .rejects.toThrow('CATEGORY_EXISTS');
    });

    it('should throw SORT_ORDER_EXISTS on sort order collision', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'c1' }) // exists
        .mockResolvedValueOnce({ id: 'other' }); // sort order collision

      await expect(ServiceCategoryService.update(mockDb as any, 'c1', { sort_order: 7 }, 'user_1'))
        .rejects.toThrow('SORT_ORDER_EXISTS');
    });

    it('should update successfully with dynamic fields', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'c1' }); // exists

      const result = await ServiceCategoryService.update(
        mockDb as any,
        'c1',
        { name: 'Updated name', slug: 'updated-slug', sort_order: 12, is_active: false, meta_data: [], seo_data: {} },
        'user_1'
      );
      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete existing category', async () => {
      mockDb.run.mockResolvedValue({ success: true, meta: { changes: 1 } });
      const result = await ServiceCategoryService.delete(mockDb as any, 'c1');
      expect(result).toBe(true);
    });

    it('should return false if no category deleted', async () => {
      mockDb.run.mockResolvedValue({ success: true, meta: { changes: 0 } });
      const result = await ServiceCategoryService.delete(mockDb as any, 'c1');
      expect(result).toBe(false);
    });
  });
});
