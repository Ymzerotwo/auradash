/**
 * ==========================================
 *        AuraDash Public Inbox Routes
 * ==========================================
 * 
 * Defines public routing endpoints for Inbox operations.
 */

import { Hono } from 'hono';
import { InboxController } from '../controllers/inbox.controller';
import { AppContext } from '../types';
import { rateLimiter } from '../middleware/rateLimit.middleware';

const publicInboxRoutes = new Hono<AppContext>();

// Apply dedicated rate limiter to prevent inbox contact spam flooding
publicInboxRoutes.use('*', rateLimiter('PUBLIC_SUBMISSION_LIMITER'));

/**
 * POST /api/public/inbox
 * Submits a new contact message publicly.
 */
publicInboxRoutes.post('/', InboxController.createInboxMessage);

export default publicInboxRoutes;
