/**
 * ==========================================
 *        AuraDash Team Services
 * ==========================================
 * 
 * Business logic layer for managing Team operations.
 */

import { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { hashPassword } from '../utils/crypto';
import { getPaginationOptions, paginateQuery } from '../utils/pagination';
import { RoomsService } from './rooms.services';
import { escapeLikePattern } from '../utils/sanitize';

async function hasMultipleAdmins(db: any): Promise<boolean> {
  const result = await db.prepare("SELECT COUNT(*) as count FROM Users WHERE role = 'Admin' AND is_banned = 0").first();
  return ((result?.count as number) || 0) > 1;
}

// AuraDash Team Service
// Contains the core business logic and database interactions for managing team members.
// Enforces role-based rules, validation, and optimistic state updates.
export const TeamService = {
  /**
   * Retrieves a paginated list of team members, applying search and status filters.
   * Crucial Note: Uses LEFT JOINs to fetch the real names of the users who performed audit actions.
   * 
   * @param db - The D1 Database instance.
   */
  getAll: async (db: D1Database, search: string, page: any, limit: any, status: string, currentUser: any) => {
    const paginationOptions = getPaginationOptions(page, limit, 25);
    const isAdmin = currentUser.role === 'Admin';

    const selectFields = isAdmin
      ? 'u.id, u.email, u.full_name, u.username, u.photo_url, u.role, u.job_title, u.permissions, u.is_banned, u.password_updated_at, pw_user.full_name as password_updated_by, ban_user.full_name as banned_by, cb_user.full_name as created_by, ub_user.full_name as updated_by, u.created_at, u.updated_at'
      : 'u.id, u.email, u.full_name, u.username, u.photo_url, u.role, u.job_title, u.permissions, u.is_banned';
      
    let query = isAdmin
      ? `SELECT ${selectFields} FROM Users u 
         LEFT JOIN Users pw_user ON u.password_updated_by = pw_user.id 
         LEFT JOIN Users ban_user ON u.banned_by = ban_user.id 
         LEFT JOIN Users cb_user ON u.created_by = cb_user.id 
         LEFT JOIN Users ub_user ON u.updated_by = ub_user.id`
      : `SELECT ${selectFields} FROM Users u`;
      
    let countQuery = 'SELECT COUNT(*) as total FROM Users u';
    const params: any[] = [];
    
    const filterClauses: string[] = ['u.id != ?'];
    params.push(currentUser.id);

    if (!isAdmin) {
      filterClauses.push('u.role != ?');
      params.push('Admin');
    }
    
    if (search) {
      filterClauses.push(`(u.email LIKE ? ESCAPE '\\' OR u.username LIKE ? ESCAPE '\\')`);
      const searchPattern = `%${escapeLikePattern(search)}%`;
      params.push(searchPattern, searchPattern);
    }

    if (status === 'active') {
      filterClauses.push('u.is_banned = 0');
    } else if (status === 'banned') {
      filterClauses.push('u.is_banned = 1');
    }

    if (filterClauses.length > 0) {
      const clause = ` WHERE ${filterClauses.join(' AND ')}`;
      query += clause;
      countQuery += clause;
    }
    
    query += ' ORDER BY u.created_at DESC';
    const paginatedData = await paginateQuery(db, query, countQuery, params, paginationOptions);
    
    const team = paginatedData.data.map((user: any) => {
      if (user.permissions && typeof user.permissions === 'string') {
        try { user.permissions = JSON.parse(user.permissions); } catch { user.permissions = {}; }
      }
      return user;
    });

    return { team, pagination: paginatedData.pagination };
  },

  /**
   * Calculates dashboard metrics for the team (total, active, suspended, admins).
   * 
   * @param db - The D1 Database instance.
   */
  getStats: async (db: D1Database) => {
    const query = `
      SELECT 
        COUNT(*) as totalMembers,
        SUM(CASE WHEN is_banned = 0 THEN 1 ELSE 0 END) as activeMembers,
        SUM(CASE WHEN is_banned = 1 THEN 1 ELSE 0 END) as suspendedMembers,
        SUM(CASE WHEN role = 'Admin' THEN 1 ELSE 0 END) as adminsCount
      FROM Users
    `;
    const stats = await db.prepare(query).first();
    return {
      totalMembers: (stats?.totalMembers as number) || 0,
      activeMembers: (stats?.activeMembers as number) || 0,
      suspendedMembers: (stats?.suspendedMembers as number) || 0,
      adminsCount: (stats?.adminsCount as number) || 0
    };
  },

  /**
   * Fetches a single user's detailed profile by their ID.
   * Important: Normal users cannot view another Admin's detailed profile due to the FORBIDDEN check.
   * 
   * @param db - The D1 Database instance.
   */
  getById: async (db: D1Database, id: string, currentUser: any) => {
    const isAdmin = currentUser.role === 'Admin';
    const selectFields = isAdmin
      ? 'u.id, u.email, u.full_name, u.username, u.photo_url, u.role, u.permissions, u.job_title, u.is_banned, u.password_updated_at, pw_user.full_name as password_updated_by, ban_user.full_name as banned_by, cb_user.full_name as created_by, ub_user.full_name as updated_by, u.created_at, u.updated_at'
      : 'u.id, u.email, u.full_name, u.username, u.photo_url, u.role, u.permissions, u.job_title, u.is_banned';
      
    const query = isAdmin 
      ? `SELECT ${selectFields} FROM Users u 
         LEFT JOIN Users pw_user ON u.password_updated_by = pw_user.id 
         LEFT JOIN Users ban_user ON u.banned_by = ban_user.id 
         LEFT JOIN Users cb_user ON u.created_by = cb_user.id 
         LEFT JOIN Users ub_user ON u.updated_by = ub_user.id 
         WHERE u.id = ?`
      : `SELECT ${selectFields} FROM Users u WHERE u.id = ?`;

    const user = await db.prepare(query).bind(id).first() as any;
    
    if (!user) return { error: 'USER_NOT_FOUND', message: 'Team member not found', status: 404 };
    if (user.role === 'Admin' && !isAdmin) return { error: 'FORBIDDEN', message: 'You do not have permission to view this profile', status: 403 };
    
    const member = { ...user };
    if (member.permissions) {
      try {
        member.permissions = typeof member.permissions === 'string' ? JSON.parse(member.permissions) : member.permissions;
      } catch {
        member.permissions = {};
      }
    }
    return { member };
  },

  /**
   * Creates a new team member and assigns them roles and permissions.
   * Safety Mechanism: Only existing Admins can create other Admins.
   * Handles collision detection for duplicate emails and usernames.
   * 
   * @param db - The D1 Database instance.
   */
  create: async (db: D1Database, body: any, k1: KVNamespace, currentRequester: any) => {
    if (body.role === 'Admin' && currentRequester.role !== 'Admin') {
      return { error: 'CANNOT_CREATE_ADMIN', message: 'Only existing administrators can create new Admin accounts', status: 403 };
    }
    
    const existingUser = await db.prepare('SELECT id, email, username FROM Users WHERE email = ? OR username = ?').bind(body.email, body.username).first();
    if (existingUser) {
      if ((existingUser as any).email === body.email) {
        return { error: 'VALIDATION_ERROR', message: 'Validation failed', status: 400, details: [{ field: 'email', issue: 'email_taken' }] };
      } else {
        return { error: 'VALIDATION_ERROR', message: 'Validation failed', status: 400, details: [{ field: 'username', issue: 'username_taken' }] };
      }
    }
    
    const id = crypto.randomUUID();
    const hashedPassword = await hashPassword(body.password);
    const permissionsJson = body.permissions ? JSON.stringify(body.permissions) : null;
    
    await db.prepare(`
      INSERT INTO Users (id, email, full_name, username, password_hash, role, job_title, permissions, photo_url, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, body.email, body.full_name, body.username, hashedPassword, body.role, body.job_title || null, permissionsJson, body.photo_url || null, currentRequester.id).run();
    
    await RoomsService.syncRooms(db, k1);
    return { id };
  },

  /**
   * Updates an existing team member's profile data.
   * Critical:
   * 1. Prevents users from modifying their own roles.
   * 2. Prevents the last remaining Admin from being demoted.
   * 3. Syncs the KV session cache to reflect the updated permissions/status instantly.
   * 
   * @param db - The D1 Database instance.
   */
  update: async (db: D1Database, k1: KVNamespace, id: string, body: any, currentRequester: any) => {
    const isRequesterAdmin = currentRequester.role === 'Admin';
    const targetUser = await db.prepare('SELECT id, role FROM Users WHERE id = ?').bind(id).first() as any;
    
    if (!targetUser) return { error: 'USER_NOT_FOUND', message: 'Team member not found', status: 404 };
    if (targetUser.role === 'Admin' && !isRequesterAdmin) return { error: 'CANNOT_MODIFY_ADMIN', message: 'You do not have permission to modify an administrator account', status: 403 };
    if (targetUser.id === currentRequester.id) return { error: 'CANNOT_MODIFY_SELF', message: 'You cannot modify your own account through the team management interface', status: 403 };
    
    if (body.role === 'Admin' && !isRequesterAdmin) return { error: 'CANNOT_PROMOTE_TO_ADMIN', message: 'Only existing administrators can promote a user to Admin', status: 403 };
    
    if (targetUser.role === 'Admin' && body.role === 'User') {
      const multipleAdmins = await hasMultipleAdmins(db);
      if (!multipleAdmins) return { error: 'LAST_ADMIN', message: 'Cannot demote the last administrator. Promote another user to Admin first.', status: 400 };
    }
    
    if (body.email || body.username) {
      const collision = await db.prepare('SELECT id, email, username FROM Users WHERE (email = ? OR username = ?) AND id != ?').bind(body.email || '', body.username || '', id).first();
      if (collision) {
        if (body.email && (collision as any).email === body.email) {
          return { error: 'VALIDATION_ERROR', message: 'Validation failed', status: 400, details: [{ field: 'email', issue: 'email_taken' }] };
        } else {
          return { error: 'VALIDATION_ERROR', message: 'Validation failed', status: 400, details: [{ field: 'username', issue: 'username_taken' }] };
        }
      }
    }
    
    let updateQuery = 'UPDATE Users SET updated_at = CURRENT_TIMESTAMP, updated_by = ?';
    const params: any[] = [currentRequester.id];
    
    if (body.full_name !== undefined) { updateQuery += ', full_name = ?'; params.push(body.full_name); }
    if (body.email !== undefined) { updateQuery += ', email = ?'; params.push(body.email); }
    if (body.username !== undefined) { updateQuery += ', username = ?'; params.push(body.username); }
    if (body.role !== undefined) { updateQuery += ', role = ?'; params.push(body.role); }
    if (body.job_title !== undefined) { updateQuery += ', job_title = ?'; params.push(body.job_title); }
    if (body.photo_url !== undefined) { updateQuery += ', photo_url = ?'; params.push(body.photo_url); }
    if (body.permissions !== undefined) { updateQuery += ', permissions = ?'; params.push(body.permissions ? JSON.stringify(body.permissions) : null); }
    if (body.password) {
      const hashedPassword = await hashPassword(body.password);
      updateQuery += ', password_hash = ?, password_updated_at = CURRENT_TIMESTAMP, password_updated_by = ?';
      params.push(hashedPassword, currentRequester.id);
    }
    
    updateQuery += ' WHERE id = ?';
    params.push(id);
    await db.prepare(updateQuery).bind(...params).run();

    // Sync KV cache sessions with new user data
    const sessionsList = await k1.list({ prefix: `session:${id}:` });
    if (sessionsList.keys.length > 0) {
      const freshUser = await db.prepare('SELECT email, role, is_banned, permissions FROM Users WHERE id = ?').bind(id).first() as any;
      if (freshUser) {
        if (freshUser.permissions && typeof freshUser.permissions === 'string') {
          try { freshUser.permissions = JSON.parse(freshUser.permissions); } catch { freshUser.permissions = {}; }
        }
        
        const updatePromises = sessionsList.keys.map(async (key) => {
          const sessionDataStr = await k1.get(key.name);
          if (sessionDataStr) {
            const sessionData = JSON.parse(sessionDataStr);
            sessionData.email = freshUser.email;
            sessionData.role = freshUser.role;
            sessionData.is_banned = freshUser.is_banned;
            sessionData.permissions = freshUser.permissions;
            
            const expiresAt = new Date(sessionData.expires_at).getTime();
            const now = Date.now();
            if (expiresAt > now) {
              const ttlSeconds = Math.floor((expiresAt - now) / 1000);
              await k1.put(key.name, JSON.stringify(sessionData), { expirationTtl: ttlSeconds });
            } else {
              await k1.delete(key.name);
            }
          }
        });
        await Promise.all(updatePromises);
      }
    }

    await RoomsService.syncRooms(db, k1);
    return { success: true };
  },

  /**
   * Toggles the suspended (banned) status of a team member.
   * Critical: If banned, the user's active KV sessions are instantly deleted, forcing an immediate logout.
   * 
   * @param db - The D1 Database instance.
   */
  toggleStatus: async (db: D1Database, k1: KVNamespace, id: string, body: any, currentRequester: any) => {
    const isRequesterAdmin = currentRequester.role === 'Admin';
    const targetUser = await db.prepare('SELECT role FROM Users WHERE id = ?').bind(id).first() as any;
    
    if (!targetUser) return { error: 'USER_NOT_FOUND', message: 'Team member not found', status: 404 };
    if (targetUser.role === 'Admin' && !isRequesterAdmin) return { error: 'CANNOT_MODIFY_ADMIN', message: 'You do not have permission to modify an administrator account', status: 403 };
    if (id === currentRequester.id) return { error: 'CANNOT_MODIFY_SELF', message: 'You cannot ban or deactivate your own account', status: 403 };
    
    if (targetUser.role === 'Admin') {
      const willDeactivate = body.is_banned === true;
      if (willDeactivate) {
        const multipleAdmins = await hasMultipleAdmins(db);
        if (!multipleAdmins) return { error: 'LAST_ADMIN', message: 'Cannot ban the last administrator. Promote another user to Admin first.', status: 400 };
      }
    }
    
    let updateQuery = 'UPDATE Users SET updated_at = CURRENT_TIMESTAMP, updated_by = ?';
    const params: any[] = [currentRequester.id];
    
    if (body.is_banned !== undefined) { 
      updateQuery += ', is_banned = ?, banned_by = ?'; 
      params.push(body.is_banned ? 1 : 0, body.is_banned ? currentRequester.id : null); 
    }
    
    updateQuery += ' WHERE id = ?';
    params.push(id);
    
    const result = await db.prepare(updateQuery).bind(...params).run();
    if (result.meta.changes === 0) return { error: 'USER_NOT_FOUND', message: 'Team member not found', status: 404 };
    
    if (body.is_banned === true) {
      const sessionsList = await k1.list({ prefix: `session:${id}:` });
      const deletePromises = sessionsList.keys.map(key => k1.delete(key.name));
      await Promise.all(deletePromises);
    }
    await RoomsService.syncRooms(db, k1);
    return { success: true };
  },

  /**
   * Permanently deletes a user from the system.
   * Critical Data Protection: Uses a safety check (hasComments) to prevent breaking foreign key constraints
   * or ruining the audit trail. If the user is linked to operations, they must be banned instead of deleted.
   * 
   * @param db - The D1 Database instance.
   */
  delete: async (db: D1Database, k1: KVNamespace, id: string, currentRequester: any) => {
    const isRequesterAdmin = currentRequester.role === 'Admin';
    const targetUser = await db.prepare('SELECT role FROM Users WHERE id = ?').bind(id).first() as any;
    
    if (!targetUser) return { error: 'USER_NOT_FOUND', message: 'Team member not found', status: 404 };
    if (targetUser.role === 'Admin' && !isRequesterAdmin) return { error: 'CANNOT_MODIFY_ADMIN', message: 'You do not have permission to modify an administrator account', status: 403 };
    if (id === currentRequester.id) return { error: 'CANNOT_MODIFY_SELF', message: 'You cannot delete your own account', status: 403 };
    
    if (targetUser.role === 'Admin') {
      const multipleAdmins = await hasMultipleAdmins(db);
      if (!multipleAdmins) return { error: 'LAST_ADMIN', message: 'Cannot delete the last administrator. Promote another user to Admin first.', status: 400 };
    }
    // Safety check to prevent foreign key errors and preserve the audit trail.
    // Checks if the user is linked to any operational records or audit trails.
    const checkQuery = `
      SELECT (
        (SELECT COUNT(*) FROM Articles WHERE author_id = ? OR created_by = ? OR updated_by = ?) +
        (SELECT COUNT(*) FROM Article_Comments WHERE user_id = ? OR approved_by = ?) +
        (SELECT COUNT(*) FROM Bookings WHERE created_by = ? OR updated_by = ? OR completed_by = ? OR cancelled_by = ?) +
        (SELECT COUNT(*) FROM Inbox WHERE converted_by = ? OR read_by = ? OR add_to_spam_by = ?) +
        (SELECT COUNT(*) FROM Customers WHERE add_spam_by = ? OR created_by = ? OR updated_by = ?) +
        (SELECT COUNT(*) FROM ApiKeys WHERE created_by = ?) +
        (SELECT COUNT(*) FROM Article_Categories WHERE created_by = ? OR updated_by = ?) +
        (SELECT COUNT(*) FROM service_category WHERE created_by = ? OR updated_by = ?) +
        (SELECT COUNT(*) FROM Services WHERE created_by = ? OR updated_by = ?) +
        (SELECT COUNT(*) FROM Media WHERE created_by = ?)
      ) as total_references
    `;
    const checkResult = await db.prepare(checkQuery).bind(...Array(23).fill(id)).first() as any;
    if (checkResult && (checkResult.total_references || 0) > 0) {
      return { 
        error: 'USER_HAS_OPERATIONS', 
        message: 'This user is linked to records or operations in the database and cannot be deleted. Please ban/deactivate the account instead.', 
        status: 400 
      };
    }
    
    const result = await db.prepare('DELETE FROM Users WHERE id = ?').bind(id).run();
    if (result.meta.changes === 0) return { error: 'USER_NOT_FOUND', message: 'Team member not found', status: 404 };
    
    const sessionsList = await k1.list({ prefix: `session:${id}:` });
    const deletePromises = sessionsList.keys.map(key => k1.delete(key.name));
    await Promise.all(deletePromises);
    
    await RoomsService.syncRooms(db, k1);
    return { success: true };
  }
};
