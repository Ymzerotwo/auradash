/**
 * ==========================================
 *        AuraDash Dashboard Controller
 * ==========================================
 * 
 * Handles HTTP requests for Dashboard operations.
 */

import { logger } from '../utils/logger';
import { Context } from 'hono';
import { DashboardService } from '../services/dashboard.services';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';

export const DashboardController = {
  /**
   * Handles the Get Statistics operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getStatistics: async (c: Context<AppContext>) => {
    try {
      const db = c.env.DB;
      const startDate = c.req.query('startDate');
      const endDate = c.req.query('endDate');
      const page = parseInt(c.req.query('page') || '1', 10);
      const limit = parseInt(c.req.query('limit') || '20', 10);

      const stats = await DashboardService.getStats(db, startDate, endDate);
      const timelineData = await DashboardService.getTimeline(db, startDate, endDate, page, limit);

      return sendResponse(c, 200, 'SUCCESS', 'Dashboard statistics retrieved successfully', {
        stats,
        timeline: timelineData.timeline,
        hasMore: timelineData.hasMore,
        page,
        limit
      });
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Dashboard Error:', error);
      return sendResponse(c, 500, 'SERVER_ERROR', 'Failed to retrieve dashboard statistics');
    }
  }
};
