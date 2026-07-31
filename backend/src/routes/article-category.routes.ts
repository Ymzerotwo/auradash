/**
 * ==========================================
 *        AuraDash Article Category Routes
 * ==========================================
 * 
 * Defines the routing endpoints for Article Category operations.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createArticleCategorySchema, updateArticleCategorySchema } from '../validators/article-category.validators';
import { paginationSchema } from '../validators/pagination.validators';
import { sendResponse } from '../utils/response';
import { ArticleCategoryController } from '../controllers/article-category.controller';
import { AppContext } from '../types';
import { requirePermission } from '../middleware/permission';

const articleCategoryRoutes = new Hono<AppContext>();

// Require 'cms.articles' permission for all routes within this file
articleCategoryRoutes.use('*', requirePermission(['cms.articles']));

/**
 * GET /api/article-categories
 * Lists all article categories with pagination.
 */
articleCategoryRoutes.get(
  '/',
  zValidator('query', paginationSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid query parameters', null, result.error.issues);
    }
  }),
  ArticleCategoryController.getAll
);

/**
 * GET /api/article-categories/:id
 * Retrieves details of a specific article category.
 */
articleCategoryRoutes.get('/:id', ArticleCategoryController.getById);

/**
 * POST /api/article-categories
 * Creates a new article category.
 */
articleCategoryRoutes.post(
  '/',
  zValidator('json', createArticleCategorySchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  ArticleCategoryController.create
);

/**
 * PUT /api/article-categories/:id
 * Updates an existing article category.
 */
articleCategoryRoutes.put(
  '/:id',
  zValidator('json', updateArticleCategorySchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  ArticleCategoryController.update
);

/**
 * DELETE /api/article-categories/:id
 * Deletes a specific article category.
 */
articleCategoryRoutes.delete('/:id', ArticleCategoryController.delete);

export default articleCategoryRoutes;
