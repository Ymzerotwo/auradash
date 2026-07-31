/**
 * ==========================================
 *        AuraDash Public Comments Routes
 * ==========================================
 * 
 * Defines public routing endpoints for Comments operations.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createPublicCommentSchema } from '../validators/comments.validators';
import { sendResponse } from '../utils/response';
import { PublicCommentsController } from '../controllers/public-comments.controller';
import { AppContext } from '../types';
import { rateLimiter } from '../middleware/rateLimit.middleware';

const publicCommentsRoutes = new Hono<AppContext>();

// Apply dedicated rate limiter to prevent comment spam flooding
publicCommentsRoutes.use('*', rateLimiter('PUBLIC_SUBMISSION_LIMITER'));

/**
 * POST /api/public/comments
 * Submits a new comment publicly.
 */
publicCommentsRoutes.post(
  '/',
  zValidator('json', createPublicCommentSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  PublicCommentsController.create
);

export default publicCommentsRoutes;
