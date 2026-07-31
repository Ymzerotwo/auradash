/**
 * ==========================================
 *        AuraDash Check Slug Routes
 * ==========================================
 * 
 * Defines the routing endpoints for Check Slug operations.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { checkSlugSchema } from '../validators/check-slug.validators';
import { sendResponse } from '../utils/response';
import { CheckSlugController } from '../controllers/check-slug.controller';
import { AppContext } from '../types';
import { requirePermission } from '../middleware/permission';

const checkSlugRoutes = new Hono<AppContext>();

// Require either cms.articles or cms.services permission
checkSlugRoutes.use('*', requirePermission(['cms.articles', 'cms.services']));

/**
 * GET /api/check-slug
 * Checks if a slug is available for a specific entity type.
 */
checkSlugRoutes.get(
  '/',
  zValidator('query', checkSlugSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid query parameters', null, result.error.issues);
    }
  }),
  CheckSlugController.checkSlug
);

export default checkSlugRoutes;
