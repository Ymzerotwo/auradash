/**
 * ==========================================
 *        AuraDash Service Category Routes
 * ==========================================
 * 
 * Defines the routing endpoints for Service Category operations.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createServiceCategorySchema, updateServiceCategorySchema } from '../validators/service-category.validators';
import { paginationSchema } from '../validators/pagination.validators';
import { sendResponse } from '../utils/response';
import { ServiceCategoryController } from '../controllers/service-category.controller';
import { AppContext } from '../types';
import { requirePermission } from '../middleware/permission';

const categoryRoutes = new Hono<AppContext>();

// Require 'cms.services' permission for all routes within this file
categoryRoutes.use('*', requirePermission(['cms.services']));

/**
 * GET /api/service-categories
 * Lists all service categories with pagination.
 */
categoryRoutes.get(
  '/',
  zValidator('query', paginationSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid query parameters', null, result.error.issues);
    }
  }),
  ServiceCategoryController.getAll
);

/**
 * GET /api/service-categories/check-slug
 * Checks slug availability.
 */
categoryRoutes.get('/check-slug', ServiceCategoryController.checkSlug);

/**
 * GET /api/service-categories/:id
 * Retrieves details of a specific service category.
 */
categoryRoutes.get('/:id', ServiceCategoryController.getById);

/**
 * POST /api/service-categories
 * Creates a new service category.
 */
categoryRoutes.post(
  '/',
  zValidator('json', createServiceCategorySchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  ServiceCategoryController.create
);

/**
 * PUT /api/service-categories/:id
 * Updates an existing service category.
 */
categoryRoutes.put(
  '/:id',
  zValidator('json', updateServiceCategorySchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  ServiceCategoryController.update
);

/**
 * DELETE /api/service-categories/:id
 * Deletes a specific service category.
 */
categoryRoutes.delete('/:id', ServiceCategoryController.delete);

export default categoryRoutes;
