/**
 * ==========================================
 *        AuraDash Public Comments Controller
 * ==========================================
 * 
 * Handles HTTP requests for Public Comments operations.
 */

import { logger } from '../utils/logger';
import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { NotificationService } from '../services/notification.services';
import { PublicCommentsService } from '../services/public-comments.services';

export const PublicCommentsController = {
  /**
   * Handles the Create operation.
   * 
   * @param c - The Hono HTTP context.
   */
  create: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    // Data is already validated and sanitized via Zod schema in routes
    const body = c.req.valid('json' as never) as any;
    
    const id = crypto.randomUUID();
    
    try {
      const result = await PublicCommentsService.createComment(db, body, id);
      
      if (result.error) {
        return sendResponse(c, 404, result.error, result.message as string);
      }

      // Dispatch Notification
      if (result.article) {
        const k1 = c.env.K1 || (c.env as any).auradash_kv;
        await NotificationService.publishEvent(
          db,
          k1,
          'SYSTEM_ALERT', // type
          id, // targetId
          'NEW_ARTICLE_COMMENT', // titleKey
          {
            articleTitle: result.article.title,
            userName: body.user_name,
            comment_id: id,
            article_id: body.article_id
          }, // bodyJson
          `/comments?highlight=${id}`, // url
          'cms.comments' // roomName
        );
      }

      // Tarpit: Artificial delay between 500ms and 1.5s to slow down automated spam bots
      // and prevent timing attacks or immediate feedback.
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 500));

      return sendResponse(c, 201, 'COMMENT_SUBMITTED', 'Comment submitted successfully and is pending approval', { id });
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error creating comment:', error);
      // DO NOT leak error.message to the public client to prevent info disclosure
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to submit comment');
    }
  }
};
