/**
 * ==========================================
 *        AuraDash State Controller
 * ==========================================
 * 
 * Handles HTTP requests for State operations.
 */

import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { StateService } from '../services/state.services';

export const StateController = {
  /**
   * Handles the Get Hash operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getHash: async (c: Context<AppContext>) => {
    const k1 = c.env.K1 || (c.env as any).auradash_kv;
    const user = c.get('user');

    if (!user) {
      return sendResponse(c, 401, 'UNAUTHORIZED', 'Not authenticated');
    }

    try {
      const state = await StateService.getStateHash(k1, user.id);
      return c.json(state);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch state hash', null, error.message);
    }
  },

  /**
   * Handles the Get Counters operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getCounters: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const user = c.get('user');

    if (!user) {
      return sendResponse(c, 401, 'UNAUTHORIZED', 'Not authenticated');
    }

    try {
      const counters = await StateService.getCounters(db, user);
      return sendResponse(c, 200, 'COUNTERS_FETCHED', 'Counters retrieved successfully', counters);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch counters', null, error.message);
    }
  }
};
