/**
 * ==========================================
 *        AuraDash Media Routes
 * ==========================================
 * 
 * Defines the routing endpoints for Media Library operations.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { MediaController } from '../controllers/media.controller';
import { requirePermission } from '../middleware/permission';
import { updateMediaSchema } from '../validators/media.validators';
import { AppContext } from '../types';
import { sendResponse } from '../utils/response';
import { bodyLimit } from 'hono/body-limit';
import { paginationSchema } from '../validators/pagination.validators';

const mediaRoutes = new Hono<AppContext>();

/**
 * GET /api/media
 * Lists all media library records with pagination.
 */
mediaRoutes.get(
  '/',
  requirePermission(['settings.media', 'cms.articles', 'cms.services']),
  zValidator('query', paginationSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid query parameters', null, result.error.issues);
    }
  }),
  MediaController.getAllMedia
);

/**
 * GET /api/media/:id
 * Retrieves metadata for a specific media item.
 */
mediaRoutes.get('/:id', requirePermission(['settings.media', 'cms.articles', 'cms.services']), MediaController.getMediaById);

/**
 * POST /api/media
 * Uploads a new media asset.
 */
mediaRoutes.post(
  '/',
  requirePermission(['settings.media', 'cms.articles', 'cms.services']),
  bodyLimit({
    maxSize: 100 * 1024 * 1024, 
    onError: (c) => {
      return sendResponse(c, 413, 'PAYLOAD_TOO_LARGE', 'File size exceeds the 100MB limit', null);
    },
  }),
  MediaController.createMedia
);

/**
 * PATCH /api/media/:id
 * Updates metadata of an existing media record.
 */
mediaRoutes.patch(
  '/:id',
  requirePermission(['settings.media']),
  zValidator('json', updateMediaSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  MediaController.updateMedia
);

/**
 * GET /api/media/:id/download
 * Downloads the source file of a media item.
 */
mediaRoutes.get('/:id/download', requirePermission(['settings.media', 'cms.articles', 'cms.services']), MediaController.downloadMedia);

/**
 * DELETE /api/media/:id
 * Deletes a media asset and removes it from storage.
 */
mediaRoutes.delete('/:id', requirePermission(['settings.media']), MediaController.deleteMedia);

export default mediaRoutes;
