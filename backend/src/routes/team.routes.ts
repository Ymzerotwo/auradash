/**
 * ==========================================
 *        AuraDash Team Routes
 * ==========================================
 * 
 * Defines the routing endpoints for Team operations.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createTeamMemberSchema, updateTeamMemberSchema, toggleStatusSchema } from '../validators/team.validators';
import { sendResponse } from '../utils/response';
import { TeamController } from '../controllers/team.controller';
import { AppContext } from '../types';
import { requirePermission } from '../middleware/permission';
import { paginationSchema } from '../validators/pagination.validators';

const teamRoutes = new Hono<AppContext>();

// Require 'settings.team' permission for all routes within this file
teamRoutes.use('*', requirePermission(['settings.team']));

/**
 * GET /api/team
 * Lists all team members with pagination.
 */
teamRoutes.get(
  '/',
  zValidator('query', paginationSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid query parameters', null, result.error.issues);
    }
  }),
  TeamController.getAll
);

/**
 * GET /api/team/stats
 * Retrieves team management statistics.
 */
teamRoutes.get('/stats', TeamController.getStats);

/**
 * GET /api/team/:id
 * Retrieves details of a specific team member.
 */
teamRoutes.get('/:id', TeamController.getById);

/**
 * POST /api/team
 * Creates a new team member.
 */
teamRoutes.post(
  '/',
  zValidator('json', createTeamMemberSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  TeamController.create
);

/**
 * PUT /api/team/:id
 * Updates an existing team member profile.
 */
teamRoutes.put(
  '/:id',
  zValidator('json', updateTeamMemberSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  TeamController.update
);

/**
 * PATCH /api/team/:id/status
 * Toggles a team member's active status.
 */
teamRoutes.patch(
  '/:id/status',
  zValidator('json', toggleStatusSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  TeamController.toggleStatus
);

/**
 * DELETE /api/team/:id
 * Deletes a specific team member.
 */
teamRoutes.delete('/:id', TeamController.delete);

export default teamRoutes;
