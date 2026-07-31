/**
 * ==========================================
 *        AuraDash Comments Services
 * ==========================================
 * 
 * Business logic layer for managing Comments operations.
 */

import { D1Database } from '@cloudflare/workers-types';
import { getPaginationOptions, paginateQuery } from '../utils/pagination';
import { escapeLikePattern } from '../utils/sanitize';

// Service layer handling Database (D1) interactions for Comments.
export const CommentsService = {

  /**
   * Retrieve a paginated list of comments. Joins Articles and Users to provide rich context (e.g. article title, replier name).
   * 
   * @param db - The D1 Database instance.
   */
  getAll: async (db: D1Database, pageStr: string | undefined, limitStr: string | undefined, statusStr: string | undefined, searchStr: string | undefined) => {
    // getPaginationOptions safely parses inputs, capping the limit to prevent database overload (DoS mitigation).
    const paginationOptions = getPaginationOptions(pageStr, limitStr, 20);

    let baseQuery = `FROM Article_Comments c 
                     JOIN Articles a ON c.article_id = a.id 
                     LEFT JOIN Users u ON c.approved_by = u.id
                     LEFT JOIN Users u_replier ON c.user_id = u_replier.id
                     LEFT JOIN Article_Comments c_parent ON c.parent_id = c_parent.id`;
    const params: any[] = [];
    const filterClauses: string[] = [];

    if (statusStr && statusStr !== 'all') {
      filterClauses.push(`c.status = ?`);
      params.push(statusStr);
    }

    // Protected against SQL wildcard abuse (e.g. % or _) using escapeLikePattern.
    if (searchStr) {
      filterClauses.push(`(c.user_name LIKE ? ESCAPE '\\' OR c.user_email LIKE ? ESCAPE '\\' OR c.content LIKE ? ESCAPE '\\')`);
      const searchPattern = `%${escapeLikePattern(searchStr)}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (filterClauses.length > 0) {
      baseQuery += ` WHERE ${filterClauses.join(' AND ')}`;
    }

    const query = `SELECT c.id, c.article_id, c.user_name, c.user_email, c.parent_id, c.content, c.status, c.created_at, c.approved_at, a.title as article_title, 
                          u.full_name as approved_by_name,
                          u_replier.full_name as user_full_name,
                          c_parent.user_name as parent_user_name
                   ${baseQuery} 
                   ORDER BY c.created_at DESC`;
                   
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;

    // paginateQuery automatically calculates offsets and bounds, ensuring stable pagination.
    return paginateQuery(db, query, countQuery, params, paginationOptions);
  },

  /**
   * Mark a comment as approved, recording the timestamp and the Admin ID who approved it.
   * 
   * @param db - The D1 Database instance.
   */
  approve: async (db: D1Database, commentId: string, adminId: string) => {
    const result = await db.prepare(`
      UPDATE Article_Comments 
      SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = ? 
      WHERE id = ?
    `).bind(adminId, commentId).run();

    if (!result.success) throw new Error('FAILED_TO_APPROVE');
    return { success: true };
  },

  /**
   * Delete a specific comment. Because of ON DELETE CASCADE in the schema, nested replies will also be deleted automatically.
   * 
   * @param db - The D1 Database instance.
   */
  delete: async (db: D1Database, commentId: string) => {
    const result = await db.prepare("DELETE FROM Article_Comments WHERE id = ?").bind(commentId).run();
    if (!result.success) throw new Error('FAILED_TO_DELETE');
    return { success: true };
  },

  /**
   * Insert an official reply from an Admin/Staff member to an existing comment.
   * 
   * @param db - The D1 Database instance.
   */
  reply: async (db: D1Database, commentId: string, content: string, userId: string) => {
    // We must fetch the parent's article_id to ensure the reply is correctly linked to the same article.
    const parent = await db.prepare("SELECT article_id FROM Article_Comments WHERE id = ?").bind(commentId).first<{ article_id: string }>();
    if (!parent) {
      throw new Error('PARENT_NOT_FOUND');
    }

    const user = await db.prepare("SELECT full_name FROM Users WHERE id = ?").bind(userId).first<{ full_name: string }>();
    const userName = user?.full_name || 'Staff';

    const id = crypto.randomUUID();

    
    // Auto-approve the parent comment if an admin is replying to it
    await db.prepare(`
      UPDATE Article_Comments 
      SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = ? 
      WHERE id = ? AND status != 'approved'
    `).bind(userId, commentId).run();

    // Admin replies are automatically marked as 'approved' by the admin who posted them.
    await db.prepare(`
      INSERT INTO Article_Comments (id, article_id, user_name, user_id, parent_id, content, status, approved_at, approved_by)
      VALUES (?, ?, ?, ?, ?, ?, 'approved', CURRENT_TIMESTAMP, ?)
    `).bind(
      id,
      parent.article_id,
      userName,
      userId,
      commentId,
      content,
      userId
    ).run();

    return { id, status: 'approved' };
  }
};
