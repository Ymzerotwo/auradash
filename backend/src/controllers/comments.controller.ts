/**
 * ==========================================
 *        AuraDash Comments Controller
 * ==========================================
 * 
 * Handles HTTP requests for Comments operations.
 */

import { logger } from '../utils/logger';
import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { CommentsService } from '../services/comments.services';
import { purgeEntityCache } from '../utils/cache.utils';

// Controller handling CMS operations for Article Comments.
// Restricted to Admins and users with 'cms.comments' permissions.
export const CommentsController = {
  
  /**
   * Fetch a paginated list of comments with optional filtering by status (pending, approved, spam).
   * 
   * @param c - The Hono HTTP context.
   */
  getAll: async (c: Context<AppContext>) => {
    try {
      const data = await CommentsService.getAll(c.env.DB, c.req.query('page'), c.req.query('limit'), c.req.query('status'), c.req.query('search'));
      return sendResponse(c, 200, 'COMMENTS_FETCHED', 'Comments retrieved successfully', data);
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error fetching comments:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch comments');
    }
  },

  /**
   * Approve a pending comment, making it visible to the public.
   * Must purge the 'articles' cache since public article endpoints display approved comments.
   * 
   * @param c - The Hono HTTP context.
   */
  approve: async (c: Context<AppContext>) => {
    try {
      const user = c.get('user')!;
      const id = c.req.param('id') as string;
      const db = c.env.DB;

      await CommentsService.approve(db, id, user.id);
      
      // Clear related caches to reflect the newly approved comment instantly.
      purgeEntityCache(c, 'comments');
      purgeEntityCache(c, 'articles');

      return sendResponse(c, 200, 'COMMENT_APPROVED', 'Comment approved successfully');
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error approving comment:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to approve comment');
    }
  },

  /**
   * Permanently delete a comment and its nested replies (via database CASCADE).
   * 
   * @param c - The Hono HTTP context.
   */
  delete: async (c: Context<AppContext>) => {
    try {
      const id = c.req.param('id') as string;
      const db = c.env.DB;

      await CommentsService.delete(db, id);
      
      // Clear related caches to remove the comment from the public interface.
      purgeEntityCache(c, 'comments');
      purgeEntityCache(c, 'articles');

      return sendResponse(c, 200, 'COMMENT_DELETED', 'Comment deleted successfully');
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error deleting comment:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to delete comment');
    }
  },

  /**
   * Submit an official admin/staff reply to a specific user comment.
   * 
   * @param c - The Hono HTTP context.
   */
  reply: async (c: Context<AppContext>) => {
    try {
      const user = c.get('user')!;
      const id = c.req.param('id') as string;
      
      // Input data is guaranteed to be safe and structured because it has already passed through the Zod validator middleware in the routes.
      const body = c.req.valid('json' as never) as any;
      const db = c.env.DB;

      const result = await CommentsService.reply(db, id, body.content, user.id);
      
      purgeEntityCache(c, 'comments');
      purgeEntityCache(c, 'articles');

      return sendResponse(c, 201, 'COMMENT_REPLY_CREATED', 'Reply submitted successfully', result);
    } catch (error: any) {
      if (error.message === 'PARENT_NOT_FOUND') {
        return sendResponse(c, 404, 'PARENT_NOT_FOUND', 'Parent comment not found');
      }
      logger.error(c.get('requestId') || 'unknown', 'Error replying to comment:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to submit reply');
    }
  }
};
