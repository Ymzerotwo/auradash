/**
 * ==========================================
 *        AuraDash Workspace Routes
 * ==========================================
 * 
 * Defines the routing endpoints for Workspace operations.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { 
  updateIdentitySchema, 
  updateContactSchema, 
  updateSocialSchema, 
  updateLocationsSchema, 
  updateWorkingHoursSchema 
} from '../validators/general-settings.validators';
import { sendResponse } from '../utils/response';
import { WorkspaceController } from '../controllers/general-settings.controller';
import { AppContext } from '../types';
import { requirePermission } from '../middleware/permission';
import apikeyRoutes from './apikey.routes';

const workspaceRoutes = new Hono<AppContext>();

const workspacePermission = requirePermission(['settings.workspace']);

/**
 * GET /api/workspace
 * Retrieves current workspace settings.
 */
workspaceRoutes.get('/', workspacePermission, WorkspaceController.getSettings);

/**
 * GET /api/workspace/resolve-map
 * Resolves map URLs for workspace locations.
 */
workspaceRoutes.get('/resolve-map', workspacePermission, WorkspaceController.resolveMapUrl);

/**
 * PUT /api/workspace/identity
 * Updates workspace identity profile.
 */
workspaceRoutes.put(
  '/identity',
  workspacePermission,
  zValidator('json', updateIdentitySchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid identity data', null, result.error.issues);
    }
  }),
  WorkspaceController.updateIdentity
);

/**
 * PUT /api/workspace/contact
 * Updates workspace contact info.
 */
workspaceRoutes.put(
  '/contact',
  workspacePermission,
  zValidator('json', updateContactSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid contact data', null, result.error.issues);
    }
  }),
  WorkspaceController.updateContact
);

/**
 * PUT /api/workspace/social
 * Updates workspace social links.
 */
workspaceRoutes.put(
  '/social',
  workspacePermission,
  zValidator('json', updateSocialSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid social media data', null, result.error.issues);
    }
  }),
  WorkspaceController.updateSocial
);

/**
 * PUT /api/workspace/locations
 * Updates workspace physical addresses/locations.
 */
workspaceRoutes.put(
  '/locations',
  workspacePermission,
  zValidator('json', updateLocationsSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid locations data', null, result.error.issues);
    }
  }),
  WorkspaceController.updateLocations
);

/**
 * PUT /api/workspace/working-hours
 * Updates workspace working hours scheduling.
 */
workspaceRoutes.put(
  '/working-hours',
  workspacePermission,
  zValidator('json', updateWorkingHoursSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid working hours data', null, result.error.issues);
    }
  }),
  WorkspaceController.updateWorkingHours
);

// API Keys Management
workspaceRoutes.route('/apikeys', apikeyRoutes);

export default workspaceRoutes;
