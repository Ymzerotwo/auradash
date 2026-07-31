/**
 * ==========================================
 *        AuraDash Comments Routes
 * ==========================================
 * 
 * Defines the routing endpoints for Comments operations.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { replyCommentSchema } from '../validators/comments.validators';
import { sendResponse } from '../utils/response';
import { CommentsController } from '../controllers/comments.controller';
import { AppContext } from '../types';
import { requirePermission } from '../middleware/permission';

const commentsRoutes = new Hono<AppContext>();

// Require 'cms.comments' permission for all routes within this file
commentsRoutes.use('*', requirePermission(['cms.comments']));

/**
 * GET /api/comments
 * Retrieves a list of comments.
 */
commentsRoutes.get('/', CommentsController.getAll);

/**
 * PATCH /api/comments/:id/approve
 * Approves a comment for public visibility.
 */
commentsRoutes.patch('/:id/approve', CommentsController.approve);

/**
 * POST /api/comments/:id/reply
 * Submits an administrator reply to a comment.
 */
commentsRoutes.post(
  '/:id/reply',
  zValidator('json', replyCommentSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  CommentsController.reply
);

/**
 * DELETE /api/comments/:id
 * Deletes a specific comment.
 */
commentsRoutes.delete('/:id', CommentsController.delete);

export default commentsRoutes;
