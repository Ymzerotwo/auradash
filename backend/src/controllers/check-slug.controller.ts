/**
 * ==========================================
 *        AuraDash Check Slug Controller
 * ==========================================
 * 
 * Handles HTTP requests for Check Slug operations.
 */

import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { CheckSlugService } from '../services/check-slug.services';

// ==========================================
// AuraDash Check Slug Controller
// ==========================================
// Handles HTTP requests for verifying URL slug uniqueness across various CMS entities.
export const CheckSlugController = {
  /**
   * Checks if a provided slug is available for a specific table.
   * @param c - Hono Context wrapping the Cloudflare Worker environment.
   * @returns A standard JSON response indicating slug availability.
   * @security The query payload is strictly validated by Zod middleware prior to this controller execution, guaranteeing safe data.
   * 
   * @param c - The Hono HTTP context.
   */
  checkSlug: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    // Validated query parameters from Zod middleware
    const query = c.req.valid('query' as never) as any;

    try {
      const available = await CheckSlugService.checkSlug(
        db,
        query.table,
        query.slug,
        query.exclude_id
      );
      
      return sendResponse(c, 200, 'SLUG_CHECKED', 'Slug checked', { 
        slug: query.slug, 
        table: query.table,
        available 
      });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to check slug availability', null, error.message);
    }
  }
};
