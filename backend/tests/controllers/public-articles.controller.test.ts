import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicArticlesController } from '../../src/controllers/public-articles.controller';

describe('PublicArticlesController', () => {
  let mockContext: any;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ results: [] }),
      first: vi.fn().mockResolvedValue({ total: 0 })
    };

    mockContext = {
      req: {
        url: 'http://localhost/api/public/articles',
        query: vi.fn(),
        param: vi.fn()
      },
      env: {
        DB: mockDb
      },
      get: vi.fn(),
      header: vi.fn(),
      json: vi.fn((data, status) => ({ status, data }))
    };
  });

  describe('getArticles', () => {
    it('should query active, published articles successfully', async () => {
      mockContext.req.query.mockImplementation((key: string) => {
        if (key === 'page') return '1';
        return '';
      });
      mockDb.first.mockResolvedValue({ total: 1 });
      mockDb.all.mockResolvedValue({
        results: [{ id: 'a1', title: 'Test Article', seo_data: '{"desc":"test"}' }]
      });

      const response: any = await PublicArticlesController.getArticles(mockContext);

      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('ARTICLES_FETCHED');
      expect(response.data.data.articles[0].seo_data).toEqual({ desc: 'test' });
    });
  });

  describe('getArticleBySlug', () => {
    it('should return 404 if article is not found', async () => {
      mockContext.req.param.mockReturnValue('nonexistent');
      mockDb.first.mockResolvedValue(null);

      const response: any = await PublicArticlesController.getArticleBySlug(mockContext);

      expect(response.status).toBe(404);
      expect(response.data.slug).toBe('ARTICLE_NOT_FOUND');
    });
  });
});
