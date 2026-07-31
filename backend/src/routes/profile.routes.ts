/**
 * ==========================================
 *        AuraDash Profile Routes
 * ==========================================
 * 
 * Defines the routing endpoints for Profile operations.
 */

import { Hono } from 'hono';
import { ProfileController } from '../controllers/profile.controller';
import { AppContext } from '../types';

const profileRoutes = new Hono<AppContext>();

/**
 * GET /api/profile
 * Retrieves the current authenticated user's profile.
 */
profileRoutes.get('/', ProfileController.getProfile);

/**
 * PUT /api/profile
 * Updates the current authenticated user's profile details.
 */
profileRoutes.put('/', ProfileController.updateProfile);

export default profileRoutes;
