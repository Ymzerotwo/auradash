import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArticleService } from '../../src/services/article.services';

describe('ArticleService', () => {
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
    it('should paginate and query articles successfully', async () => {
      mockDb.all.mockResolvedValue({ results: [{ id: '1', title: 'Test Article' }] });
      mockDb.first.mockResolvedValue({ total: 1 });

      const result = await ArticleService.getAll(mockDb as any, 'search_term', 'cat_123', '1', '10', { role: 'Admin' });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('created_at'));
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('ORDER BY Articles.published_at DESC, CASE WHEN Articles.sort_order = 0 THEN 1 ELSE 0 END ASC, Articles.sort_order ASC'));
    });
  });



  describe('getById', () => {
    it('should return null if article not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await ArticleService.getById(mockDb as any, 'nonexistent');
      expect(result).toBeNull();
    });

    it('should parse meta_data and seo_data correctly', async () => {
      mockDb.first.mockResolvedValue({
        id: '123',
        meta_data: '{"key": "value"}',
        seo_data: '{"title": "seo title"}'
      });

      const result = await ArticleService.getById(mockDb as any, '123');
      expect(result.meta_data).toEqual({ key: 'value' });
      expect(result.seo_data).toEqual({ title: 'seo title' });
    });
  });

  describe('create', () => {
    it('should throw ARTICLE_EXISTS error if slug already exists', async () => {
      mockDb.first.mockResolvedValue({ id: '123' }); // slug exists

      await expect(ArticleService.create(mockDb as any, { title: 'T', slug: 's' }, 'user_1'))
        .rejects.toThrow('ARTICLE_EXISTS');
    });

    it('should throw CATEGORY_NOT_FOUND error if category does not exist', async () => {
      mockDb.first
        .mockResolvedValueOnce(null) // slug available
        .mockResolvedValueOnce(null); // category not found

      await expect(ArticleService.create(mockDb as any, { title: 'T', slug: 's', category_id: 'cat_invalid' }, 'user_1'))
        .rejects.toThrow('CATEGORY_NOT_FOUND');
    });

    it('should insert article and return id', async () => {
      mockDb.first
        .mockResolvedValueOnce(null) // slug available
        .mockResolvedValueOnce({ id: 'cat_valid' }); // category exists

      const result = await ArticleService.create(mockDb as any, { title: 'T', slug: 's', category_id: 'cat_valid' }, 'user_1');
      expect(result).toBeDefined();
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should return false if article to update does not exist', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await ArticleService.update(mockDb as any, 'invalid_id', { title: 'New' }, 'user_1');
      expect(result).toBe(false);
    });

    it('should throw ARTICLE_EXISTS if slug collisions happen', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: '123' }) // article exists
        .mockResolvedValueOnce({ id: 'other' }); // slug collision exists

      await expect(ArticleService.update(mockDb as any, '123', { slug: 'collision-slug' }, 'user_1'))
        .rejects.toThrow('ARTICLE_EXISTS');
    });

    it('should perform update successfully', async () => {
      mockDb.first
        .mockResolvedValueOnce({ id: '123' }) // article exists
        .mockResolvedValueOnce({ id: 'cat_123' }); // category exists

      const result = await ArticleService.update(mockDb as any, '123', { title: 'Updated Title', category_id: 'cat_123' }, 'user_1');
      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should return true if deletion changed row count', async () => {
      mockDb.run.mockResolvedValue({ success: true, meta: { changes: 1 } });
      const result = await ArticleService.delete(mockDb as any, '123');
      expect(result).toBe(true);
    });

    it('should return false if deletion changed 0 rows', async () => {
      mockDb.run.mockResolvedValue({ success: true, meta: { changes: 0 } });
      const result = await ArticleService.delete(mockDb as any, '123');
      expect(result).toBe(false);
    });
  });

  describe('getPublishers', () => {
    it('should filter active non-banned administrators and users with article CMS permissions', async () => {
      mockDb.all.mockResolvedValue({
        results: [
          { id: '1', full_name: 'Admin User', role: 'Admin', is_active: 1, is_banned: 0 },
          { id: '2', full_name: 'CMS Editor', role: 'Staff', is_active: 1, is_banned: 0, permissions: '{"cms":{"articles":true}}' },
          { id: '3', full_name: 'Normal Staff', role: 'Staff', is_active: 1, is_banned: 0, permissions: '{"cms":{"articles":false}}' }
        ]
      });

      const result = await ArticleService.getPublishers(mockDb as any);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });
  });
});
