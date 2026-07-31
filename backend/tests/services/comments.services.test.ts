import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentsService } from '../../src/services/comments.services';

// Mock DB
const mockDb = {
  prepare: vi.fn(),
};

describe('CommentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should query comments with pagination and limit caps', async () => {
      const mockFirst = vi.fn().mockResolvedValue({ total: 5 });
      const mockAll = vi.fn().mockResolvedValue({ results: [{ id: '1', content: 'test comment' }] });
      
      const mockBind = vi.fn().mockReturnValue({
        all: mockAll,
        first: mockFirst
      });

      mockDb.prepare.mockReturnValue({
        bind: mockBind
      });

      const result = await CommentsService.getAll(mockDb as any, '1', '10', 'approved', undefined);

      expect(result.data).toBeDefined();
      expect(result.pagination.total).toBe(5);
      expect(mockDb.prepare).toHaveBeenCalledTimes(2); // One for SELECT, one for COUNT
    });
  });

  describe('approve', () => {
    it('should update the comment status to approved and record approval details', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({
        run: mockRun
      });
      mockDb.prepare.mockReturnValue({
        bind: mockBind
      });

      const result = await CommentsService.approve(mockDb as any, 'comment123', 'admin456');

      expect(result.success).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE Article_Comments'));
      expect(mockBind).toHaveBeenCalledWith('admin456', 'comment123');
    });
  });

  describe('delete', () => {
    it('should delete the comment from the database', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({
        run: mockRun
      });
      mockDb.prepare.mockReturnValue({
        bind: mockBind
      });

      const result = await CommentsService.delete(mockDb as any, 'comment123');

      expect(result.success).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM Article_Comments'));
      expect(mockBind).toHaveBeenCalledWith('comment123');
    });
  });

  describe('reply', () => {
    it('should throw error if the parent comment does not exist', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst
      });
      mockDb.prepare.mockReturnValue({
        bind: mockBind
      });

      await expect(CommentsService.reply(mockDb as any, 'non-existent', 'reply content', 'user789'))
        .rejects.toThrow('PARENT_NOT_FOUND');
    });

    it('should insert a reply comment successfully when parent exists', async () => {
      // Mock parent query and user query and insert query
      const mockFirst = vi.fn()
        .mockResolvedValueOnce({ article_id: 'article123' }) // first call for parent
        .mockResolvedValueOnce({ full_name: 'Staff Member' }); // second call for user
      
      const mockRun = vi.fn().mockResolvedValue({ success: true });

      // Setup prepare chain
      const mockBind = vi.fn().mockImplementation((...args: any[]) => {
        return {
          first: mockFirst,
          run: mockRun
        };
      });

      mockDb.prepare.mockReturnValue({
        bind: mockBind
      });

      const result = await CommentsService.reply(mockDb as any, 'parent123', 'reply content', 'user789');

      expect(result.status).toBe('approved');
      expect(result.id).toBeDefined();
      expect(mockRun).toHaveBeenCalled();
    });
  });
});
