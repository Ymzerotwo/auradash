/**
 * ==========================================
 *        AuraDash Public Comments Services
 * ==========================================
 * 
 * Business logic layer for managing Public Comments operations.
 */

import { D1Database } from '@cloudflare/workers-types';

export const PublicCommentsService = {
  /**
   * Performs the Create Comment operation.
   * 
   * @param db - The D1 Database instance.
   */
  createComment: async (db: D1Database, body: any, id: string) => {
    const article = await db.prepare("SELECT title, slug FROM Articles WHERE id = ?").bind(body.article_id).first<{ title: string, slug: string }>();
    if (!article) return { error: 'NOT_FOUND', message: 'Article not found' };

    if (body.parent_id) {
      const parent = await db.prepare("SELECT id FROM Article_Comments WHERE id = ? AND article_id = ?").bind(body.parent_id, body.article_id).first();
      if (!parent) return { error: 'NOT_FOUND', message: 'Parent comment not found or belongs to another article' };
    }

    await db.prepare(`
      INSERT INTO Article_Comments (id, article_id, user_name, user_email, parent_id, content, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      id,
      body.article_id,
      body.user_name,
      body.user_email,
      body.parent_id || null,
      body.content
    ).run();

    return { success: true, article };
  }
};
