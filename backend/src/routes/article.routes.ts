/**
 * ==========================================
 *        AuraDash Article Routes
 * ==========================================
 * 
 * Defines the routing endpoints for Article operations.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createArticleSchema, updateArticleSchema } from '../validators/article.validators';
import { paginationSchema } from '../validators/pagination.validators';
import { sendResponse } from '../utils/response';
import { ArticleController } from '../controllers/article.controller';
import { AppContext } from '../types';
import { requirePermission } from '../middleware/permission';

const articleRoutes = new Hono<AppContext>();

// Require 'cms.articles' permission for all routes within this file
articleRoutes.use('*', requirePermission(['cms.articles']));

/**
 * GET /api/articles
 * Lists all articles with pagination.
 */
articleRoutes.get(
  '/',
  zValidator('query', paginationSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid query parameters', null, result.error.issues);
    }
  }),
  ArticleController.getAll
);

/**
 * GET /api/articles/publishers
 * Retrieves the list of publishers.
 */
articleRoutes.get('/publishers', ArticleController.getPublishers);

/**
 * GET /api/articles/:id
 * Retrieves details of a specific article.
 */
articleRoutes.get('/:id', ArticleController.getById);

/**
 * POST /api/articles
 * Creates a new article.
 */
articleRoutes.post(
  '/',
  zValidator('json', createArticleSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  ArticleController.create
);

/**
 * PUT /api/articles/:id
 * Updates an existing article.
 */
articleRoutes.put(
  '/:id',
  zValidator('json', updateArticleSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  ArticleController.update
);

/**
 * DELETE /api/articles/:id
 * Deletes a specific article.
 */
articleRoutes.delete('/:id', ArticleController.delete);

export default articleRoutes;
