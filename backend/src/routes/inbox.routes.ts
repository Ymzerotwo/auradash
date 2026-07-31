/**
 * ==========================================
 *        AuraDash Inbox Routes
 * ==========================================
 * 
 * Defines the routing endpoints for Inbox operations.
 */

import { Hono } from 'hono';
import { InboxController } from '../controllers/inbox.controller';
import { AppContext } from '../types';
import { requirePermission } from '../middleware/permission';

const inboxRoutes = new Hono<AppContext>();

// Require 'inbox' permission for all routes within this file
inboxRoutes.use('*', requirePermission(['inbox']));

/**
 * GET /api/inbox/unread-count
 * Retrieves the count of unread inbox messages.
 */
inboxRoutes.get('/unread-count', InboxController.getUnreadCount);

/**
 * GET /api/inbox
 * Retrieves paginated inbox messages.
 */
inboxRoutes.get('/', InboxController.getMessages);

/**
 * PATCH /api/inbox/:id/status
 * Updates the status of a specific inbox message.
 */
inboxRoutes.patch('/:id/status', InboxController.updateStatus);

/**
 * DELETE /api/inbox/:id
 * Deletes a specific inbox message (restricted to Admin role).
 */
inboxRoutes.delete('/:id', requirePermission(['admin']), InboxController.deleteMessage);

export default inboxRoutes;
