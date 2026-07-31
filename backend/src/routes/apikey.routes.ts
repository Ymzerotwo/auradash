/**
 * ==========================================
 *        AuraDash API Key Routes
 * ==========================================
 * 
 * Defines the routing endpoints for API Key operations.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { AppContext } from '../types';
import { ApiKeyController } from '../controllers/apikey.controller';
import { createApiKeySchema } from '../validators/apikey.validators';
import { sendResponse } from '../utils/response';
import { requirePermission } from '../middleware/permission';
import { paginationSchema } from '../validators/pagination.validators';

const apikeyRoutes = new Hono<AppContext>();

// Require 'settings.api_key' permission for all routes within this file
apikeyRoutes.use('*', requirePermission(['settings.api_key']));

/**
 * POST /api/apikey
 * Creates a new API key (handles both production and test keys).
 */
apikeyRoutes.post(
  '/',
  zValidator('json', createApiKeySchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  ApiKeyController.createApiKey
);

/**
 * GET /api/apikey
 * Lists all API keys with pagination.
 */
apikeyRoutes.get(
  '/',
  zValidator('query', paginationSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid query parameters', null, result.error.issues);
    }
  }),
  ApiKeyController.listApiKeys
);

/**
 * DELETE /api/apikey/:id
 * Revokes and deletes a specific API key.
 */
apikeyRoutes.delete('/:id', ApiKeyController.deleteApiKey);

export default apikeyRoutes;
