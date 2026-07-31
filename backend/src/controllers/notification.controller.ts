/**
 * ==========================================
 *        AuraDash Notification Controller
 * ==========================================
 * 
 * Handles HTTP requests for Notification operations.
 */

import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { NotificationService } from '../services/notification.services';

// Controller handling API requests for Notifications.
// These endpoints allow users to fetch their notifications and mark them as read.
export const NotificationController = {
  
  /**
   * Fetch a paginated list of notifications for the currently logged-in user.
   * 
   * @param c - The Hono HTTP context.
   */
  getAll: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const user = c.get('user')!;
    
    try {
      const data = await NotificationService.getNotifications(db, user.id, c.req.query('page'), c.req.query('limit'));
      return sendResponse(c, 200, 'NOTIFICATIONS_FETCHED', 'Notifications retrieved successfully', data);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch notifications', null, error.message);
    }
  },

  /**
   * Mark a specific notification as read.
   * Bumps the Meta-Cache version (notifications_version) so the frontend knows to update the unread badge.
   * 
   * @param c - The Hono HTTP context.
   */
  markAsRead: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const k1 = c.env.K1 || (c.env as any).auradash_kv;
    const user = c.get('user')!;
    const id = c.req.param('id') as string;
    
    try {
      const result = await NotificationService.markAsRead(db, k1, user.id, id);
      return sendResponse(c, 200, 'NOTIFICATION_MARKED_READ', 'Notification marked as read', result);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to mark notification as read', null, error.message);
    }
  },

  /**
   * Mark all unread notifications as read for the currently logged-in user.
   * 
   * @param c - The Hono HTTP context.
   */
  markAllAsRead: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const k1 = c.env.K1 || (c.env as any).auradash_kv;
    const user = c.get('user')!;
    
    try {
      const result = await NotificationService.markAllAsRead(db, k1, user.id);
      return sendResponse(c, 200, 'ALL_NOTIFICATIONS_MARKED_READ', 'All notifications marked as read', result);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to mark notifications as read', null, error.message);
    }
  }
};
