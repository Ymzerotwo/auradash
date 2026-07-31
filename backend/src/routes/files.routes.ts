/**
 * ==========================================
 *        AuraDash Files Routes
 * ==========================================
 * 
 * [INACTIVE / DISABLED] Note: This route module is currently INACTIVE.
 * Files are served directly via Cloudflare R2 Public URL (R2_PUBLIC_URL).
 * Defines the routing endpoints for Files operations.
 */

import { Hono } from 'hono';
import { FilesController } from '../controllers/files.controller';
import { AppContext } from '../types';

const filesRoutes = new Hono<AppContext>();

/**
 * GET /files/*
 * Serves static files uploaded to the storage bucket.
 */
filesRoutes.get('/*', FilesController.serveFile);

export default filesRoutes;
