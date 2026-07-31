/**
 * ==========================================
 *        AuraDash Public Settings Routes
 * ==========================================
 * 
 * Defines public routing endpoints for Workspace Settings.
 */

import { Hono } from 'hono';
import { PublicSettingsController } from '../controllers/public-settings.controller';
import { AppContext } from '../types';

const publicSettingsRoutes = new Hono<AppContext>();

/**
 * GET /api/public/settings
 * Retrieves global workspace identity and settings.
 */
publicSettingsRoutes.get('/', PublicSettingsController.getGlobalSettings);

export default publicSettingsRoutes;
