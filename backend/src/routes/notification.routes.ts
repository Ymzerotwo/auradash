/**
 * ==========================================
 *        AuraDash Notification Routes
 * ==========================================
 * 
 * Defines the routing endpoints for Notification operations.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { sendResponse } from '../utils/response';
import { NotificationController } from '../controllers/notification.controller';
import { AppContext } from '../types';
import { paginationSchema } from '../validators/pagination.validators';

const notificationRoutes = new Hono<AppContext>();

/**
 * GET /api/notifications
 * Retrieves paginated notifications.
 */
notificationRoutes.get(
  '/',
  zValidator('query', paginationSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid query parameters', null, result.error.issues);
    }
  }),
  NotificationController.getAll
);

/**
 * POST /api/notifications/mark-all-read
 * Marks all notifications as read.
 */
notificationRoutes.post('/mark-all-read', NotificationController.markAllAsRead);

/**
 * PATCH /api/notifications/:id/read
 * Marks a specific notification as read.
 */
notificationRoutes.patch('/:id/read', NotificationController.markAsRead);

export default notificationRoutes;
