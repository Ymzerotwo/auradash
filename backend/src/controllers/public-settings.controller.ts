/**
 * ==========================================
 *        AuraDash Public Settings Controller
 * ==========================================
 * 
 * Handles HTTP requests for Public Settings operations.
 */

import { logger } from '../utils/logger';
import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { PublicSettingsService } from '../services/public-settings.services';

export const PublicSettingsController = {
  /**
   * Fetch global site settings (e.g., site name, contact info, social media links).
   * 
   * @param c - The Hono HTTP context.
   */
  getGlobalSettings: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    try {
      const settings = await PublicSettingsService.getGlobalSettings(db);
      return sendResponse(c, 200, 'SETTINGS_FETCHED', 'Global settings retrieved', { settings });
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error fetching global settings:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve global settings');
    }
  }
};
