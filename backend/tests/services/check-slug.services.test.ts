import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckSlugService } from '../../src/services/check-slug.services';

describe('CheckSlugService', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      first: vi.fn()
    };
  });

  describe('service-categories table checks', () => { 
    it('should return true if slug is available in service-categories', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await CheckSlugService.checkSlug(mockDb as any, 'service-categories', 'slug-1');
      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT id FROM service_category WHERE slug = ?');
      expect(mockDb.bind).toHaveBeenCalledWith('slug-1');
    });

    it('should return false if slug is taken in service_category', async () => {
      mockDb.first.mockResolvedValue({ id: 'service-cat-uuid' });

      const result = await CheckSlugService.checkSlug(mockDb as any, 'service-categories', 'slug-1');
      expect(result).toBe(false);
    });

    it('should query categories and exclude ID when provided', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await CheckSlugService.checkSlug(mockDb as any, 'service-categories', 'slug-1', 'exclude-uuid');
      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT id FROM service_category WHERE slug = ? AND id != ?');
      expect(mockDb.bind).toHaveBeenCalledWith('slug-1', 'exclude-uuid');
    });
  });

  describe('services table checks', () => {
    it('should return true if slug is available in Services', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await CheckSlugService.checkSlug(mockDb as any, 'services', 'slug-1');
      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT id FROM Services WHERE slug = ?');
      expect(mockDb.bind).toHaveBeenCalledWith('slug-1');
    });

    it('should return false if slug is taken in Services', async () => {
      mockDb.first.mockResolvedValue({ id: 'service-uuid' });

      const result = await CheckSlugService.checkSlug(mockDb as any, 'services', 'slug-1');
      expect(result).toBe(false);
    });

    it('should query services and exclude ID when provided', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await CheckSlugService.checkSlug(mockDb as any, 'services', 'slug-1', 'exclude-uuid');
      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT id FROM Services WHERE slug = ? AND id != ?');
      expect(mockDb.bind).toHaveBeenCalledWith('slug-1', 'exclude-uuid');
    });
  });

  describe('articles table checks', () => {
    it('should return true if slug is available in Articles', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await CheckSlugService.checkSlug(mockDb as any, 'articles', 'slug-1');
      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT id FROM Articles WHERE slug = ?');
      expect(mockDb.bind).toHaveBeenCalledWith('slug-1');
    });

    it('should return false if slug is taken in Articles', async () => {
      mockDb.first.mockResolvedValue({ id: 'article-uuid' });

      const result = await CheckSlugService.checkSlug(mockDb as any, 'articles', 'slug-1');
      expect(result).toBe(false);
    });

    it('should query articles and exclude ID when provided', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await CheckSlugService.checkSlug(mockDb as any, 'articles', 'slug-1', 'exclude-uuid');
      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT id FROM Articles WHERE slug = ? AND id != ?');
      expect(mockDb.bind).toHaveBeenCalledWith('slug-1', 'exclude-uuid');
    });
  });

  describe('article_categories table checks', () => {
    it('should return true if slug is available in Article_Categories', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await CheckSlugService.checkSlug(mockDb as any, 'article_categories', 'slug-1');
      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT id FROM Article_Categories WHERE slug = ?');
      expect(mockDb.bind).toHaveBeenCalledWith('slug-1');
    });

    it('should return false if slug is taken in Article_Categories', async () => {
      mockDb.first.mockResolvedValue({ id: 'art-cat-uuid' });

      const result = await CheckSlugService.checkSlug(mockDb as any, 'article_categories', 'slug-1');
      expect(result).toBe(false);
    });

    it('should query article_categories and exclude ID when provided', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await CheckSlugService.checkSlug(mockDb as any, 'article_categories', 'slug-1', 'exclude-uuid');
      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT id FROM Article_Categories WHERE slug = ? AND id != ?');
      expect(mockDb.bind).toHaveBeenCalledWith('slug-1', 'exclude-uuid');
    });
  });
});
