import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CommentsController } from '../../src/controllers/comments.controller';
import { CommentsService } from '../../src/services/comments.services';

describe('CommentsController (Admin)', () => {
  let mockContext: any;
  let getAllSpy: any;
  let approveSpy: any;
  let deleteSpy: any;
  let replySpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    getAllSpy = vi.spyOn(CommentsService, 'getAll');
    approveSpy = vi.spyOn(CommentsService, 'approve');
    deleteSpy = vi.spyOn(CommentsService, 'delete');
    replySpy = vi.spyOn(CommentsService, 'reply');

    mockContext = {
      req: {
        url: 'http://localhost/api/comments',
        query: vi.fn(),
        param: vi.fn(),
        valid: vi.fn()
      },
      env: {
        DB: {
          prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnThis(),
            first: vi.fn().mockResolvedValue({ slug: 'test-article' })
          })
        }
      },
      get: vi.fn(),
      json: vi.fn((data, status) => ({ status, data }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAll', () => {
    it('should retrieve all comments', async () => {
      mockContext.req.query.mockReturnValue('');
      getAllSpy.mockResolvedValue({
        comments: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
      });

      const response: any = await CommentsController.getAll(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('COMMENTS_FETCHED');
    });
  });

  describe('approve', () => {
    it('should approve a comment successfully', async () => {
      mockContext.get.mockReturnValue({ id: 'admin_1' });
      mockContext.req.param.mockReturnValue('comment_123');
      approveSpy.mockResolvedValue({ success: true });

      const response: any = await CommentsController.approve(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('COMMENT_APPROVED');
    });
  });

  describe('delete', () => {
    it('should delete a comment successfully', async () => {
      mockContext.req.param.mockReturnValue('comment_123');
      deleteSpy.mockResolvedValue({ success: true });

      const response: any = await CommentsController.delete(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('COMMENT_DELETED');
    });
  });

  describe('reply', () => {
    it('should submit reply successfully', async () => {
      mockContext.get.mockReturnValue({ id: 'admin_1' });
      mockContext.req.param.mockReturnValue('comment_123');
      mockContext.req.valid.mockReturnValue({ content: 'My reply' });
      replySpy.mockResolvedValue({ id: 'reply_123', status: 'approved' });

      const response: any = await CommentsController.reply(mockContext);
      expect(response.status).toBe(201);
      expect(response.data.slug).toBe('COMMENT_REPLY_CREATED');
    });

    it('should return 404 if parent comment is missing', async () => {
      mockContext.get.mockReturnValue({ id: 'admin_1' });
      mockContext.req.param.mockReturnValue('comment_123');
      mockContext.req.valid.mockReturnValue({ content: 'My reply' });
      replySpy.mockRejectedValue(new Error('PARENT_NOT_FOUND'));

      const response: any = await CommentsController.reply(mockContext);
      expect(response.status).toBe(404);
      expect(response.data.slug).toBe('PARENT_NOT_FOUND');
    });
  });
});
