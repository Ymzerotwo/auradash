/**
 * ==========================================
 *        AuraDash Team Controller
 * ==========================================
 * 
 * Handles HTTP requests for Team operations.
 */

import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { TeamService } from '../services/team.services';

// AuraDash Team Controller
// Handles incoming HTTP requests for team management (users/staff).
// Extracts parameters/body from the request and delegates business logic to TeamService.
export const TeamController = {
  /**
   * Fetches a paginated list of team members with optional search and status filtering.
   * Access is controlled by the user's role (Admins see all details, Users see limited details).
   * 
   * @param c - The Hono HTTP context.
   */
  getAll: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    try {
      const data = await TeamService.getAll(db, c.req.query('search') || '', c.req.query('page'), c.req.query('limit'), c.req.query('status') || 'all', c.get('user')!);
      return sendResponse(c, 200, 'TEAM_FETCHED', 'Team members retrieved successfully', data);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch team members', null, error.message);
    }
  },

  /**
   * Retrieves aggregated statistics for the team (total, active, banned, admins).
   * Useful for dashboard overview metrics.
   * 
   * @param c - The Hono HTTP context.
   */
  getStats: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    try {
      const stats = await TeamService.getStats(db);
      return sendResponse(c, 200, 'TEAM_STATS_FETCHED', 'Team statistics retrieved successfully', { stats });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch team stats', null, error.message);
    }
  },

  /**
   * Fetches a specific team member's detailed profile by their ID.
   * Admins can view anyone; standard users have restricted access depending on the target profile.
   * 
   * @param c - The Hono HTTP context.
   */
  getById: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    try {
      const result = await TeamService.getById(db, c.req.param('id') as string, c.get('user')!);
      if (result.error) return sendResponse(c, result.status as any, result.error, result.message, null, (result as any).details);
      return sendResponse(c, 200, 'TEAM_MEMBER_FETCHED', 'Team member retrieved successfully', result);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch team member', null, error.message);
    }
  },

  /**
   * Creates a new team member account.
   * Handles password hashing and initial permission assignment.
   * 
   * @param c - The Hono HTTP context.
   */
  create: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const body = c.req.valid('json' as never) as any;
    try {
      const k1 = c.env.K1 || (c.env as any).auradash_kv;
      const result = await TeamService.create(db, body, k1, c.get('user')!);
      if (result.error) return sendResponse(c, result.status as any, result.error, result.message, null, result.details);
      return sendResponse(c, 201, 'TEAM_MEMBER_CREATED', 'Team member created successfully', { id: result.id });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to create team member', null, error.message);
    }
  },

  /**
   * Updates an existing team member's profile (name, role, job title, etc.).
   * Also invalidates existing active sessions in KV if sensitive data changes.
   * 
   * @param c - The Hono HTTP context.
   */
  update: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const body = c.req.valid('json' as never) as any;
    try {
      const k1 = c.env.K1 || (c.env as any).auradash_kv;
      const result = await TeamService.update(db, k1, c.req.param('id') as string, body, c.get('user')!);
      if (result.error) return sendResponse(c, result.status as any, result.error, result.message, null, result.details);
      return sendResponse(c, 200, 'TEAM_MEMBER_UPDATED', 'Team member updated successfully');
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to update team member', null, error.message);
    }
  },

  /**
   * Toggles the ban status of a team member (Ban / Unban).
   * Instantly revokes sessions if the user gets banned.
   * 
   * @param c - The Hono HTTP context.
   */
  toggleStatus: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const body = c.req.valid('json' as never) as any;
    try {
      const k1 = c.env.K1 || (c.env as any).auradash_kv;
      const result = await TeamService.toggleStatus(db, k1, c.req.param('id') as string, body, c.get('user')!);
      if (result.error) return sendResponse(c, result.status as any, result.error, result.message, null, (result as any).details);
      return sendResponse(c, 200, 'TEAM_MEMBER_STATUS_UPDATED', 'Team member status updated successfully');
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to update team member status', null, error.message);
    }
  },

  /**
   * Permanently deletes a team member from the system.
   * Enforces constraints (e.g. preventing the deletion of the last admin or users with operations history).
   * 
   * @param c - The Hono HTTP context.
   */
  delete: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    try {
      const k1 = c.env.K1 || (c.env as any).auradash_kv;
      const result = await TeamService.delete(db, k1, c.req.param('id') as string, c.get('user')!);
      if (result.error) return sendResponse(c, result.status as any, result.error, result.message, null, (result as any).details);
      return sendResponse(c, 200, 'TEAM_MEMBER_DELETED', 'Team member deleted successfully');
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to delete team member', null, error.message);
    }
  }
};
