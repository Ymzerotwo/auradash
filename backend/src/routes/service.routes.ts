/**
 * ==========================================
 *        AuraDash Service Routes
 * ==========================================
 * 
 * Defines the routing endpoints for Service operations.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createServiceSchema, updateServiceSchema } from '../validators/service.validators';
import { paginationSchema } from '../validators/pagination.validators';
import { sendResponse } from '../utils/response';
import { ServiceController } from '../controllers/service.controller';
import { AppContext } from '../types';
import { requirePermission } from '../middleware/permission';

const serviceRoutes = new Hono<AppContext>();

// Require 'cms.services' permission for all routes within this file
serviceRoutes.use('*', requirePermission(['cms.services']));

/**
 * GET /api/services
 * Lists all services with pagination.
 */
serviceRoutes.get(
  '/',
  zValidator('query', paginationSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid query parameters', null, result.error.issues);
    }
  }),
  ServiceController.getAll
);

/**
 * GET /api/services/check-slug
 * Checks service slug availability.
 */
serviceRoutes.get('/check-slug', ServiceController.checkSlug);

/**
 * GET /api/services/:id
 * Retrieves details of a specific service.
 */
serviceRoutes.get('/:id', ServiceController.getById);

/**
 * POST /api/services
 * Creates a new service.
 */
serviceRoutes.post(
  '/',
  zValidator('json', createServiceSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  ServiceController.create
);

/**
 * PUT /api/services/:id
 * Updates an existing service.
 */
serviceRoutes.put(
  '/:id',
  zValidator('json', updateServiceSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  ServiceController.update
);

/**
 * DELETE /api/services/:id
 * Deletes a specific service.
 */
serviceRoutes.delete('/:id', ServiceController.delete);

export default serviceRoutes;
