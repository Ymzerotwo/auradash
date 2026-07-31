/**
 * ==========================================
 *        AuraDash Notification Services
 * ==========================================
 * 
 * Business logic layer for managing Notification operations.
 */

import { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { getPaginationOptions, paginateQuery } from '../utils/pagination';

// Service layer handling Database (D1) and Key-Value (KV) interactions for Notifications.
export const NotificationService = {
  
  /**
   * Publish an event to all users in a specific room (e.g. 'inbox' for admins, or specific user IDs).
   * 
   * @param db - The D1 Database instance.
   */
  publishEvent: async (
    db: D1Database,
    k1: KVNamespace,
    type: string,
    targetId: string | null,
    titleKey: string,
    bodyJson: any,
    url: string | null,
    roomName: string
  ) => {
    let userIds: string[] = [];
    
    // Dynamic permission routing ensures we only notify EXISTING, active users.
    // This prevents SQLITE_CONSTRAINT_FOREIGNKEY crashes caused by stale User IDs in KV rooms.
    if (roomName === 'inbox' || roomName.startsWith('cms.')) {
      const users = await db.prepare("SELECT id, role, permissions FROM Users WHERE is_banned = 0").all();
      for (const u of users.results) {
        if (u.role === 'Admin') {
          userIds.push(u.id as string);
        } else if (u.permissions) {
          try {
            const perms = JSON.parse(u.permissions as string);
            if (roomName === 'inbox') {
              if (perms.inbox === true || (perms.cms && perms.cms.inbox === true)) userIds.push(u.id as string);
            } else {
              const parts = roomName.split('.');
              if (parts.length === 2 && parts[0] === 'cms' && perms.cms && perms.cms[parts[1]] === true) {
                userIds.push(u.id as string);
              }
            }
          } catch {}
        }
      }
    } else if (roomName.startsWith('user:')) {
      // Direct notification to a specific user
      userIds.push(roomName.replace('user:', ''));
    } else {
      // Fallback for custom KV rooms
      const roomData = await k1.get(`room:${roomName}`);
      if (roomData) {
        try { userIds = JSON.parse(roomData); } catch {}
      }
    }

    // AuraDash (Critical Fix): Final validation pass to ensure all userIds actually exist in the DB.
    // If a user was deleted but their ID remained in a KV room or variable, inserting a Notification
    // for them would trigger a FOREIGN KEY constraint failure and crash the entire batch.
    if (userIds.length > 0) {
      // Remove duplicates
      userIds = [...new Set(userIds)];
      
      const placeholders = userIds.map(() => '?').join(',');
      const validUsers = await db.prepare(`SELECT id FROM Users WHERE id IN (${placeholders})`).bind(...userIds).all();
      const validIds = new Set(validUsers.results.map(u => u.id));
      userIds = userIds.filter(id => validIds.has(id));
    }

    if (userIds.length === 0) return;

    // 2. Prepare atomic batch insert for D1
    const stmt = db.prepare(`
      INSERT INTO Notifications (id, user_id, type, target_id, message_title, message_body, url, is_read)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);

    const batchStmts = userIds.map(userId => {
      const id = crypto.randomUUID();
      return stmt.bind(id, userId, type, targetId, titleKey, JSON.stringify(bodyJson), url);
    });

    // Cloudflare D1 has a hard limit of 100 statements per db.batch().
    // We MUST chunk the statements to prevent crashes when notifying many users.
    const D1_BATCH_SIZE = 100;
    for (let i = 0; i < batchStmts.length; i += D1_BATCH_SIZE) {
      await db.batch(batchStmts.slice(i, i + D1_BATCH_SIZE));
    }

    // 3. Update notifications_version hash for all affected users in KV
    // Cloudflare Workers have simultaneous subrequest limits.
    // We chunk the KV updates to prevent hitting rate limits or memory exhaustion.
    const KV_CHUNK_SIZE = 20;
    for (let i = 0; i < userIds.length; i += KV_CHUNK_SIZE) {
      const chunk = userIds.slice(i, i + KV_CHUNK_SIZE);
      const updateHashPromises = chunk.map(async (userId) => {
        const stateKey = `state_version:${userId}`;
        let state: any = {};
        const existingState = await k1.get(stateKey);
        if (existingState) {
          try { state = JSON.parse(existingState); } catch {}
        }
        
        // Bump notification version
        state.notifications_version = 'v' + crypto.randomUUID().slice(0, 8);
        
        await k1.put(stateKey, JSON.stringify(state));
      });
      await Promise.all(updateHashPromises);
    }
  },

  /**
   * Fetch paginated notifications for a specific user, safely parsing JSON bodies.
   * 
   * @param db - The D1 Database instance.
   */
  getNotifications: async (db: D1Database, userId: string, page: any, limit: any) => {
    // Safely handle pagination parameters to prevent DB scanning issues
    const paginationOptions = getPaginationOptions(page, limit, 20);

    const query = 'SELECT id, type, target_id, message_title, message_body, url, is_read, created_at FROM Notifications WHERE user_id = ? ORDER BY created_at DESC';
    const countQuery = 'SELECT COUNT(*) as total FROM Notifications WHERE user_id = ?';
    const params = [userId];

    const paginatedData = await paginateQuery(db, query, countQuery, params, paginationOptions);
    
    const notifications = paginatedData.data.map((row: any) => {
      if (row.message_body && typeof row.message_body === 'string') {
        try { row.message_body = JSON.parse(row.message_body); } catch {}
      }
      return row;
    });

    return { notifications, pagination: paginatedData.pagination };
  },

  /**
   * Mark a specific notification as read and bump the KV hash to update frontend badge states.
   * 
   * @param db - The D1 Database instance.
   */
  markAsRead: async (db: D1Database, k1: KVNamespace, userId: string, notificationId: string) => {
    const result = await db.prepare(
      'UPDATE Notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
    ).bind(notificationId, userId).run();

    if (result.meta.changes && result.meta.changes > 0) {
      await NotificationService.bumpNotificationHash(k1, userId);
    }
    return { success: true };
  },

  /**
   * Mark all unread notifications as read simultaneously.
   * 
   * @param db - The D1 Database instance.
   */
  markAllAsRead: async (db: D1Database, k1: KVNamespace, userId: string) => {
    const result = await db.prepare(
      'UPDATE Notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
    ).bind(userId).run();

    if (result.meta.changes && result.meta.changes > 0) {
      await NotificationService.bumpNotificationHash(k1, userId);
    }
    return { success: true };
  },

  /**
   * Helper utility to bump the 'notifications_version' in the Meta-Cache (KV).
   * This notifies connected frontends that unread counts have changed, instantly updating badges.
   * 
   * @param db - The D1 Database instance.
   */
  bumpNotificationHash: async (k1: KVNamespace, userId: string) => {
    const stateKey = `state_version:${userId}`;
    let state: any = {};
    const existingState = await k1.get(stateKey);
    if (existingState) {
      try { state = JSON.parse(existingState); } catch {}
    }
    
    state.notifications_version = 'v' + crypto.randomUUID().slice(0, 8);
    await k1.put(stateKey, JSON.stringify(state));
  }
};
