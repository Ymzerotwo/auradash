/**
 * ==========================================
 *        AuraDash State Services
 * ==========================================
 * 
 * Business logic layer for managing State operations.
 */

import { D1Database, KVNamespace } from '@cloudflare/workers-types';

export const StateService = {
  /**
   * Fetch state version hashes for a user from KV, initializing if not present.
   * 
   * @param db - The D1 Database instance.
   */
  getStateHash: async (k1: KVNamespace, userId: string) => {
    const stateKey = `state_version:${userId}`;
    const existingStateStr = await k1.get(stateKey);
    
    let state = {
      notifications_version: 'v0',
      inbox_version: 'v0',
      comments_version: 'v0',
      bookings_version: 'v0'
    };

    if (existingStateStr) {
      try {
        const parsed = JSON.parse(existingStateStr);
        state = { ...state, ...parsed };
      } catch {}
    } else {
      // Initialize state hash for new user
      await k1.put(stateKey, JSON.stringify(state));
    }

    return state;
  },

  /**
   * Fetch unread/pending counters from D1 database for a user, respecting their RBAC permissions.
   * 
   * @param db - The D1 Database instance.
   */
  getCounters: async (db: D1Database, user: any) => {
    // Parse user permissions safely
    const isAdmin = user.role === 'Admin';
    let perms: any = {};
    if (user.permissions) {
      try {
        perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
      } catch {}
    }

    const hasInboxPerm = (isAdmin || perms.inbox || perms.cms?.inbox) ? 1 : 0;
    const hasCommentsPerm = (isAdmin || perms.comments || perms.cms?.comments) ? 1 : 0;

    // Single smart SQL query with conditional subquery short-circuiting
    const query = `
      SELECT 
        (SELECT COUNT(id) FROM Notifications WHERE user_id = ? AND is_read = 0) as notifications,
        (CASE WHEN ? = 1 THEN (SELECT COUNT(id) FROM Inbox WHERE status = 'unread') ELSE 0 END) as inbox,
        (CASE WHEN ? = 1 THEN (SELECT COUNT(id) FROM Article_Comments WHERE status = 'pending') ELSE 0 END) as comments
    `;

    const result = await db.prepare(query).bind(user.id, hasInboxPerm, hasCommentsPerm).first<any>();

    return {
      notifications: result?.notifications || 0,
      inbox: result?.inbox || 0,
      comments: result?.comments || 0,
      bookings: 0
    };
  }
};
