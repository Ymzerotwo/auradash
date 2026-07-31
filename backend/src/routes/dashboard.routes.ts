/**
 * ==========================================
 *        AuraDash Dashboard Routes
 * ==========================================
 * 
 * Defines the routing endpoints for Dashboard operations.
 */

import { Hono } from 'hono';
import { DashboardController } from '../controllers/dashboard.controller';
import { requirePermission } from '../middleware/permission';
import { sessionMiddleware } from '../middleware/session';
import { AppContext } from '../types';

const dashboardRoutes = new Hono<AppContext>();

// Apply auth and permission middleware to all dashboard routes
dashboardRoutes.use('/*', sessionMiddleware, requirePermission(['dashboard']));

/**
 * GET /api/dashboard
 * Retrieves dashboard overview statistics.
 */
dashboardRoutes.get('/', DashboardController.getStatistics);

export default dashboardRoutes;
