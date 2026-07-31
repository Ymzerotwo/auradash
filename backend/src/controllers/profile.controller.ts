/**
 * ==========================================
 *        AuraDash Profile Controller
 * ==========================================
 * 
 * Handles HTTP requests for Profile operations.
 */

import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { ProfileService } from '../services/profile.services';
import { updateProfileSchema } from '../validators/profile.validators';

export const ProfileController = {
  /**
   * Handles the Get Profile operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getProfile: async (c: Context<AppContext>) => {
    const user = c.get('user');
    if (!user) {
      return sendResponse(c, 401, 'UNAUTHORIZED', 'Not authenticated');
    }

    const db = c.env.DB;
    try {
      const result = await ProfileService.getProfile(db, user.id);
      if (result.error) {
        return sendResponse(c, result.status as any, result.error, result.message);
      }
      return sendResponse(c, 200, 'PROFILE_FETCHED', 'User profile retrieved successfully', { user: result.user });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch profile', null, error.message);
    }
  },

  /**
   * Handles the Update Profile operation.
   * 
   * @param c - The Hono HTTP context.
   */
  updateProfile: async (c: Context<AppContext>) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const rawBody = await c.req.json();

    const parsed = updateProfileSchema.safeParse(rawBody);
    if (!parsed.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, parsed.error.issues);
    }
    const body = parsed.data;

    try {
      const result = await ProfileService.updateProfile(db, c.env.STORAGE, c.env.R2_PUBLIC_URL, user, body);
      if (result.error) {
        return sendResponse(c, result.status as any, result.error, result.message);
      }
      return sendResponse(c, 200, 'PROFILE_UPDATED', 'Profile updated successfully');
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to update profile', null, error.message);
    }
  }
};
