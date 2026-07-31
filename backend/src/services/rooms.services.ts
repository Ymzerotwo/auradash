/**
 * ==========================================
 *        AuraDash Rooms Services
 * ==========================================
 * 
 * Business logic layer for managing Rooms operations.
 */

import { D1Database, KVNamespace } from '@cloudflare/workers-types';

export const RoomsService = {
  /**
   * Synchronizes the members of specific capability rooms in KV Cache.
   * This is triggered whenever user roles, permissions, or statuses change.
   * 
   * @param db - The D1 Database instance.
   */
  syncRooms: async (db: D1Database, k1: KVNamespace) => {
    // 1. Fetch all active users who can potentially receive notifications
    const users = await db.prepare(
      "SELECT id, role, permissions FROM Users WHERE is_banned = 0"
    ).all();

    if (!users.results) return;

    // Define the rooms we care about
    const commentsRoom: string[] = [];
    const bookingsRoom: string[] = [];
    const inboxRoom: string[] = [];

    // 2. Evaluate permissions and sort users into rooms
    for (const user of users.results as any[]) {
      if (user.role === 'Admin') {
        commentsRoom.push(user.id);
        bookingsRoom.push(user.id);
        inboxRoom.push(user.id);
        continue;
      }

      if (user.permissions) {
        let perms: any = {};
        if (typeof user.permissions === 'string') {
          try { perms = JSON.parse(user.permissions); } catch { }
        } else {
          perms = user.permissions;
        }

        // Evaluate cms.comments
        if (perms['cms.comments'] === true) {
          commentsRoom.push(user.id);
        }

        // Evaluate operations.calendar (Bookings)
        if (perms['operations.calendar'] === true) {
          bookingsRoom.push(user.id);
        }

        // Evaluate inbox
        if (perms['inbox'] === true) {
          inboxRoom.push(user.id);
        }
      }
    }

    // 3. Update KV Namespace
    await Promise.all([
      k1.put('room:cms.comments', JSON.stringify(commentsRoom)),
      k1.put('room:operations.calendar', JSON.stringify(bookingsRoom)),
      k1.put('room:inbox', JSON.stringify(inboxRoom))
    ]);
  }
};
