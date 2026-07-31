/**
 * ==========================================
 *        AuraDash Workspace Controller
 * ==========================================
 * 
 * Handles HTTP requests for Workspace operations.
 */

import { logger } from '../utils/logger';
// ==========================================
// AuraDash Workspace Controller
// ==========================================
// Handles HTTP requests related to the overall workspace and business settings,
// including identity, contact info, social links, working hours, and location data.
import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { purgeEntityCache } from '../utils/cache.utils';
import { AppContext } from '../types';
import { WorkspaceService } from '../services/general-settings.services';

export const WorkspaceController = {
  /**
   * Retrieves the current workspace settings.
   * If no settings exist in the database, returns a default empty fallback structure.
   * 
   * @param c - The Hono HTTP context.
   */
  getSettings: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    try {
      const settings = await WorkspaceService.getSettings(db);
      if (!settings) {
        return sendResponse(c, 200, 'SETTINGS_NOT_FOUND', 'Workspace settings not initialized', {
          settings: { siteName: '', logoUrl: null, contactInfo: {}, socialMedia: {}, locations: [], workingHours: {} }
        });
      }
      return sendResponse(c, 200, 'SETTINGS_FETCHED', 'Workspace settings retrieved successfully', { settings });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch workspace settings', null, error.message);
    }
  },

  /**
   * Updates the core identity (site name and logo) of the workspace.
   * Purges the settings cache upon success to reflect changes globally.
   * 
   * @param c - The Hono HTTP context.
   */
  updateIdentity: async (c: Context<AppContext>) => {
    const body = c.req.valid('json' as never) as any;
    const db = c.env.DB;
    try {
      await WorkspaceService.updateIdentity(db, c.env.STORAGE, c.env.R2_PUBLIC_URL, body);
      purgeEntityCache(c, 'settings');
      return sendResponse(c, 200, 'IDENTITY_UPDATED', 'Workspace identity updated successfully');
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to update workspace identity', null, error.message);
    }
  },

  /**
   * Updates the business contact information (email, phone, etc.).
   * 
   * @param c - The Hono HTTP context.
   */
  updateContact: async (c: Context<AppContext>) => {
    const body = c.req.valid('json' as never) as any;
    const db = c.env.DB;
    try {
      await WorkspaceService.updateContact(db, body);
      purgeEntityCache(c, 'settings');
      return sendResponse(c, 200, 'CONTACT_UPDATED', 'Workspace contact information updated successfully');
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to update workspace contact info', null, error.message);
    }
  },

  /**
   * Updates the business social media links.
   * 
   * @param c - The Hono HTTP context.
   */
  updateSocial: async (c: Context<AppContext>) => {
    const body = c.req.valid('json' as never) as any;
    const db = c.env.DB;
    try {
      await WorkspaceService.updateSocial(db, body);
      purgeEntityCache(c, 'settings');
      return sendResponse(c, 200, 'SOCIAL_UPDATED', 'Workspace social media links updated successfully');
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to update workspace social media', null, error.message);
    }
  },

  /**
   * Updates the physical branch locations for the business.
   * 
   * @param c - The Hono HTTP context.
   */
  updateLocations: async (c: Context<AppContext>) => {
    const body = c.req.valid('json' as never) as any;
    const db = c.env.DB;
    try {
      await WorkspaceService.updateLocations(db, body);
      purgeEntityCache(c, 'settings');
      return sendResponse(c, 200, 'LOCATIONS_UPDATED', 'Workspace locations updated successfully');
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to update workspace locations', null, error.message);
    }
  },

  /**
   * Updates the weekly operating hours for the business.
   * 
   * @param c - The Hono HTTP context.
   */
  updateWorkingHours: async (c: Context<AppContext>) => {
    const body = c.req.valid('json' as never) as any;
    const db = c.env.DB;
    try {
      await WorkspaceService.updateWorkingHours(db, body);
      purgeEntityCache(c, 'settings');
      return sendResponse(c, 200, 'WORKING_HOURS_UPDATED', 'Workspace working hours updated successfully');
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to update workspace working hours', null, error.message);
    }
  },

  /**
   * Resolves a map URL (acts as a proxy) to bypass CORS issues on the frontend.
   * CRITICAL SECURITY NOTE: This endpoint uses strict SSRF mitigation logic to
   * ensure attackers cannot use the server to probe internal networks.
   * 
   * @param c - The Hono HTTP context.
   */
  resolveMapUrl: async (c: Context<AppContext>) => {
    const url = c.req.query('url');
    if (!url) {
      return sendResponse(c, 400, 'MISSING_URL', 'URL parameter is required');
    }

    // SSRF Protection: Validate the URL before making a server-side request
    try {
      const parsedUrl = new URL(url);
      const allowedDomains = ['google.com', 'www.google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl'];
      
      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
        return sendResponse(c, 400, 'INVALID_URL', 'Only HTTP/HTTPS protocols are allowed');
      }
      
      if (!allowedDomains.includes(parsedUrl.hostname)) {
        return sendResponse(c, 400, 'INVALID_MAP_URL', 'Only Google Maps URLs are allowed for resolution');
      }
    } catch (e) {
      return sendResponse(c, 400, 'MALFORMED_URL', 'The provided URL is malformed');
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      return sendResponse(c, 200, 'MAP_RESOLVED', 'Map URL resolved successfully', { resolvedUrl: response.url });
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error resolving map URL:', error);
      return sendResponse(c, 500, 'RESOLVE_FAILED', 'Failed to resolve map URL', null, error.message);
    }
  }
};
