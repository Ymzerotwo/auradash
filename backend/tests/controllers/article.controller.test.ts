import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArticleController } from '../../src/controllers/article.controller';
import { ArticleService } from '../../src/services/article.services';

describe('ArticleController', () => {
  let mockContext: any;
  let getAllSpy: any;
  let getByIdSpy: any;
  let createSpy: any;
  let updateSpy: any;
  let deleteSpy: any;
  let getPublishersSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    getAllSpy = vi.spyOn(ArticleService, 'getAll');
    getByIdSpy = vi.spyOn(ArticleService, 'getById').mockImplementation(async (db, id) => {
      if (id === 'non-existent' || id === 'missing' || id === 'cat_invalid') return null;
      return { id, slug: 'mock-slug' } as any;
    });
    createSpy = vi.spyOn(ArticleService, 'create');
    updateSpy = vi.spyOn(ArticleService, 'update');
    deleteSpy = vi.spyOn(ArticleService, 'delete');
    getPublishersSpy = vi.spyOn(ArticleService, 'getPublishers');

    mockContext = {
      req: {
        url: 'http://localhost/api/articles',
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
    it('should successfully return articles list', async () => {
      mockContext.req.query.mockReturnValue('');
      mockContext.get.mockReturnValue({ role: 'Admin' });
      getAllSpy.mockResolvedValue({
        data: [{ id: '1', title: 'Article 1' }],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 }
      });

      const response: any = await ArticleController.getAll(mockContext);

      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('ARTICLES_FETCHED');
      expect(response.data.data.articles).toHaveLength(1);
    });

    it('should handle service errors with 500 status', async () => {
      getAllSpy.mockRejectedValue(new Error('DB failure'));

      const response: any = await ArticleController.getAll(mockContext);

      expect(response.status).toBe(500);
      expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
    });
  });



  describe('getById', () => {
    it('should return 404 if article not found', async () => {
      mockContext.req.param.mockReturnValue('non-existent');
      getByIdSpy.mockResolvedValue(null);

      const response: any = await ArticleController.getById(mockContext);
      expect(response.status).toBe(404);
      expect(response.data.slug).toBe('ARTICLE_NOT_FOUND');
    });

    it('should return article if exists', async () => {
      mockContext.req.param.mockReturnValue('123');
      getByIdSpy.mockResolvedValue({ id: '123', title: 'Found' });

      const response: any = await ArticleController.getById(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.data.article.title).toBe('Found');
    });
  });

  describe('create', () => {
    it('should return 201 when creation is successful', async () => {
      mockContext.req.valid.mockReturnValue({ title: 'A', slug: 's' });
      mockContext.get.mockReturnValue({ id: 'user_123' });
      createSpy.mockResolvedValue('new_id');

      const response: any = await ArticleController.create(mockContext);
      expect(response.status).toBe(201);
      expect(response.data.data.id).toBe('new_id');
    });

    it('should return 400 if slug collision happens', async () => {
      mockContext.req.valid.mockReturnValue({ title: 'A', slug: 's' });
      mockContext.get.mockReturnValue({ id: 'user_123' });
      createSpy.mockRejectedValue(new Error('ARTICLE_EXISTS'));

      const response: any = await ArticleController.create(mockContext);
      expect(response.status).toBe(400);
      expect(response.data.slug).toBe('ARTICLE_EXISTS');
    });
  });

  describe('update', () => {
    it('should return 404 if article is not found', async () => {
      mockContext.req.param.mockReturnValue('123');
      mockContext.req.valid.mockReturnValue({ title: 'A' });
      mockContext.get.mockReturnValue({ id: 'user_123' });
      getByIdSpy.mockResolvedValueOnce(null);

      const response: any = await ArticleController.update(mockContext);
      expect(response.status).toBe(404);
    });
  });

  describe('delete', () => {
    it('should return 200 on successful deletion', async () => {
      mockContext.req.param.mockReturnValue('123');
      deleteSpy.mockResolvedValue(true);

      const response: any = await ArticleController.delete(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('ARTICLE_DELETED');
    });
  });
});
