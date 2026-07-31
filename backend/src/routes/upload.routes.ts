/**
 * ==========================================
 *        AuraDash Upload Routes
 * ==========================================
 * 
 * Defines the routing endpoints for Direct File Uploads.
 */

import { Hono } from 'hono';
import { UploadController } from '../controllers/upload.controller';
import { AppContext } from '../types';

const uploadRoutes = new Hono<AppContext>();

/**
 * POST /api/upload
 * Directly uploads a file asset to the storage bucket.
 */
uploadRoutes.post('/', UploadController.directUpload);

export default uploadRoutes;
