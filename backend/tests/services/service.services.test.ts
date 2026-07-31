import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceService } from '../../src/services/service.services';

describe('ServiceService', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      first: vi.fn(),
      all: vi.fn().mockResolvedValue({ results: [] })
    };
  });

  describe('getAll', () => {
    it('should query services table with pagination and categories', async () => {
      mockDb.first.mockResolvedValue({ total: 1 });
      const result = await ServiceService.getAll(mockDb as any, 'Hair', 'cat_1', '1', '10', { role: 'Admin' });
      expect(result).toBeDefined();
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('Services.created_at, Services.updated_at')
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY CASE WHEN Services.sort_order = 0 THEN 1 ELSE 0 END ASC, Services.sort_order ASC')
      );
      expect(mockDb.bind).toHaveBeenCalledWith('%Hair%', '%Hair%', 'cat_1', 10, 0);
    });

    it('should handle category_id as "null"', async () => {
      mockDb.first.mockResolvedValue({ total: 1 });
      const result = await ServiceService.getAll(mockDb as any, '', 'null', '1', '10', { role: 'User' });
      expect(result).toBeDefined();
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('category_id IS NULL')
      );
    });

    it('should filter without audit fields for non-admin', async () => {
      mockDb.first.mockResolvedValue({ total: 1 });
      const result = await ServiceService.getAll(mockDb as any, '', '', '1', '10', { role: 'User' });
      expect(result).toBeDefined();
      expect(mockDb.prepare).not.toHaveBeenCalledWith(
        expect.stringContaining('Services.created_at, Services.updated_at')
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY CASE WHEN sort_order = 0 THEN 1 ELSE 0 END ASC, sort_order ASC')
      );
    });
  });

  describe('checkSlug', () => {
    it('should check if service slug is available', async () => {
      mockDb.first.mockResolvedValue(null);
      const result = await ServiceService.checkSlug(mockDb as any, 'slug');
      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT id FROM Services WHERE slug = ?');
    });

    it('should return false if slug is taken', async () => {
      mockDb.first.mockResolvedValue({ id: '123' });
      const result = await ServiceService.checkSlug(mockDb as any, 'slug');
      expect(result).toBe(false);
    });

    it('should exclude current service ID when checking slug', async () => {
      mockDb.first.mockResolvedValue(null);
      const result = await ServiceService.checkSlug(mockDb as any, 'slug', 'current-id');
      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT id FROM Services WHERE slug = ? AND id != ?');
    });
  });

  describe('getById', () => {
    it('should return null if service is missing', async () => {
      mockDb.first.mockResolvedValue(null);
      const result = await ServiceService.getById(mockDb as any, '1');
      expect(result).toBeNull();
    });

    it('should parse JSON meta_data and seo_data successfully', async () => {
      mockDb.first.mockResolvedValue({
        id: '1',
        meta_data: '[{"id": "meta-1"}]',
        seo_data: '{"meta_title": "SEO Title"}'
      });
      const result = await ServiceService.getById(mockDb as any, '1');
      expect(result.meta_data).toEqual([{ id: 'meta-1' }]);
      expect(result.seo_data).toEqual({ meta_title: 'SEO Title' });
    });

    it('should fallback to default objects on parsing errors', async () => {
      mockDb.first.mockResolvedValue({
        id: '1',
        meta_data: 'invalid_json',
        seo_data: 'invalid_json'
      });
      const result = await ServiceService.getById(mockDb as any, '1');
      expect(result.meta_data).toEqual([]);
      expect(result.seo_data).toEqual({});
    });
  });

  describe('create', () => {
    it('should throw SERVICE_EXISTS if slug is already used', async () => {
      mockDb.first.mockResolvedValue({ id: '1' });
      await expect(ServiceService.create(mockDb as any, { name: 'S', slug: 's' }, 'user_1'))
        .rejects.toThrow('SERVICE_EXISTS');
    });

    it('should throw CATEGORY_NOT_FOUND if category does not exist', async () => {
      mockDb.first
        .mockResolvedValueOnce(null) // slug check ok
        .mockResolvedValueOnce(null); // category check not found

      await expect(ServiceService.create(mockDb as any, { name: 'S', slug: 's', category_id: 'missing-cat' }, 'user_1'))
        .rejects.toThrow('CATEGORY_NOT_FOUND');
    });

    it('should throw SORT_ORDER_EXISTS if sort order is already taken within category', async () => {
      mockDb.first
        .mockResolvedValueOnce(null) // slug ok
        .mockResolvedValueOnce({ id: 'cat-1' }) // category exists
        .mockResolvedValueOnce({ id: 'other-service' }); // sort order exists

      await expect(ServiceService.create(mockDb as any, { name: 'S', slug: 's', category_id: 'cat-1', sort_order: 5 }, 'user_1'))
        .rejects.toThrow('SORT_ORDER_EXISTS');
    });

    it('should auto-increment sort_order within category if not specified', async () => {
      mockDb.first
        .mockResolvedValueOnce(null) // slug ok
        .mockResolvedValueOnce({ id: 'cat-1' }) // category exists
        .mockResolvedValueOnce({ max_val: 15 }); // max sort order is 15

      const result = await ServiceService.create(mockDb as any, { name: 'S', slug: 's', category_id: 'cat-1' }, 'user_1');
      expect(result).toBeDefined();
      expect(mockDb.run).toHaveBeenCalled();
    });

    it('should auto-increment sort_order with NULL category if not specified', async () => {
      mockDb.first
        .mockResolvedValueOnce(null) // slug ok
        .mockResolvedValueOnce({ max_val: 8 }); // max sort order is 8

      const result = await ServiceService.create(mockDb as any, { name: 'S', slug: 's' }, 'user_1');
      expect(result).toBeDefined();
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should return false if service to update does not exist', async () => {
      mockDb.first.mockResolvedValue(null);
      const result = await ServiceService.update(mockDb as any, 'missing-id', { name: 'S' }, 'user_1');
      expect(result).toBe(false);
    });

    it('should throw SERVICE_EXISTS on slug collision', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'srv-1', category_id: 'cat-1' }) // exists
        .mockResolvedValueOnce({ id: 'other-srv' }); // slug collision

      await expect(ServiceService.update(mockDb as any, 'srv-1', { slug: 'colliding-slug' }, 'user_1'))
        .rejects.toThrow('SERVICE_EXISTS');
    });

    it('should throw SORT_ORDER_EXISTS on sort order collision', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'srv-1', category_id: 'cat-1' }) // exists
        .mockResolvedValueOnce({ id: 'other-srv' }); // sort order collision

      await expect(ServiceService.update(mockDb as any, 'srv-1', { sort_order: 10 }, 'user_1'))
        .rejects.toThrow('SORT_ORDER_EXISTS');
    });

    it('should throw CATEGORY_NOT_FOUND if updated category_id is missing', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'srv-1', category_id: 'cat-1' }) // exists
        .mockResolvedValueOnce(null); // category not found

      await expect(ServiceService.update(mockDb as any, 'srv-1', { category_id: 'missing-cat' }, 'user_1'))
        .rejects.toThrow('CATEGORY_NOT_FOUND');
    });

    it('should update service successfully with custom properties', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: 'srv-1', category_id: 'cat-1' }) // exists
        .mockResolvedValueOnce(null) // slug collision check ok
        .mockResolvedValueOnce(null) // sort order collision check ok
        .mockResolvedValueOnce({ id: 'cat-2' }); // updated category exists check

      const result = await ServiceService.update(
        mockDb as any,
        'srv-1',
        { name: 'New Name', slug: 'new-slug', category_id: 'cat-2', sort_order: 4, is_active: false, meta_data: [], seo_data: {} },
        'user_1'
      );
      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete service successfully and return true', async () => {
      mockDb.run.mockResolvedValue({ success: true, meta: { changes: 1 } });
      const result = await ServiceService.delete(mockDb as any, 'srv-1');
      expect(result).toBe(true);
    });

    it('should return false if no service deleted', async () => {
      mockDb.run.mockResolvedValue({ success: true, meta: { changes: 0 } });
      const result = await ServiceService.delete(mockDb as any, 'srv-1');
      expect(result).toBe(false);
    });
  });
});
