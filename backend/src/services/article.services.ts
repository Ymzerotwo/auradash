/**
 * ==========================================
 *        AuraDash Article Services
 * ==========================================
 * 
 * Business logic layer for managing Article operations.
 */

import { D1Database } from '@cloudflare/workers-types';
import { getPaginationOptions, paginateQuery } from '../utils/pagination';
import { escapeLikePattern } from '../utils/sanitize';

// Service layer handling Database (D1) interactions for Articles.
export const ArticleService = {
  
  /**
   * Retrieve a paginated list of articles. Includes creator/updater details if the requesting user is an Admin.
   * 
   * @param db - The D1 Database instance.
   */
  getAll: async (db: D1Database, search: string, categoryId: any, status: string | undefined, page: any, limit: any, currentUser?: any) => {
    const paginationOptions = getPaginationOptions(page, limit, 20);
    const isAdmin = currentUser?.role === 'Admin';
    const auditFields = isAdmin
      ? ', Articles.created_at, u_creator.full_name as created_by_name, Articles.updated_at, u_updater.full_name as updated_by_name'
      : '';
    const joinClause = isAdmin
      ? ' LEFT JOIN Users u_creator ON Articles.created_by = u_creator.id LEFT JOIN Users u_updater ON Articles.updated_by = u_updater.id'
      : '';

    let query = `SELECT Articles.id, Articles.category_id, Articles.title, Articles.slug, Articles.excerpt, Articles.preview_image_url, Articles.reading_time_minutes, Articles.author_id, Articles.published_at, Articles.meta_data, Articles.seo_data, Articles.sort_order, Articles.is_active${auditFields} FROM Articles${joinClause}`;
    let countQuery = 'SELECT COUNT(*) as total FROM Articles';
    const params: any[] = [];
    const filterClauses: string[] = [];

    // Search inputs must be escaped using escapeLikePattern to prevent LIKE injection vulnerabilities.
    if (search) {
      filterClauses.push(`(Articles.slug LIKE ? ESCAPE '\\' OR Articles.title LIKE ? ESCAPE '\\')`);
      const searchPattern = `%${escapeLikePattern(search)}%`;
      params.push(searchPattern, searchPattern);
    }

    if (categoryId) {
      if (categoryId === 'null') {
        filterClauses.push('Articles.category_id IS NULL');
      } else {
        filterClauses.push('Articles.category_id = ?');
        params.push(categoryId);
      }
    }

    if (status === 'active') {
      filterClauses.push('Articles.is_active = 1');
    } else if (status === 'inactive') {
      filterClauses.push('Articles.is_active = 0');
    }

    if (filterClauses.length > 0) {
      const clause = ` WHERE ${filterClauses.join(' AND ')}`;
      query += clause;
      countQuery += clause;
    }

    query += ' ORDER BY Articles.published_at DESC, CASE WHEN Articles.sort_order = 0 THEN 1 ELSE 0 END ASC, Articles.sort_order ASC, Articles.created_at DESC';

    return paginateQuery(db, query, countQuery, params, paginationOptions);
  },



  /**
   * Retrieve a single article's full data by its ID, securely parsing its JSON fields.
   * 
   * @param db - The D1 Database instance.
   */
  getById: async (db: D1Database, id: string, currentUser?: any) => {
    const isAdmin = currentUser?.role === 'Admin';
    const auditFields = isAdmin
      ? ', Articles.created_at, u_creator.full_name as created_by_name, Articles.updated_at, u_updater.full_name as updated_by_name'
      : '';
    const joinClause = isAdmin
      ? ' LEFT JOIN Users u_creator ON Articles.created_by = u_creator.id LEFT JOIN Users u_updater ON Articles.updated_by = u_updater.id'
      : '';
    const article = await db.prepare(
      `SELECT Articles.id, Articles.category_id, Articles.title, Articles.slug, Articles.excerpt, Articles.preview_image_url, Articles.reading_time_minutes, Articles.author_id, Articles.published_at, Articles.meta_data, Articles.seo_data, Articles.sort_order, Articles.is_active${auditFields} FROM Articles${joinClause} WHERE Articles.id = ?`
    ).bind(id).first() as any;

    if (!article) return null;

    // Wrap JSON parsing in try/catch to ensure the server does not crash if corrupted JSON data exists in the database.
    if (article.meta_data) {
      try { article.meta_data = JSON.parse(article.meta_data as string); } catch { article.meta_data = {}; }
    }
    if (article.seo_data) {
      try { article.seo_data = JSON.parse(article.seo_data as string); } catch { article.seo_data = {}; }
    }

    return article;
  },

  /**
   * Insert a new article into the database, handling relations and default fallbacks.
   * 
   * @param db - The D1 Database instance.
   */
  create: async (
    db: D1Database, 
    body: { category_id?: string; title: string; slug: string; excerpt?: string; preview_image_url?: string; reading_time_minutes?: number; author_id?: string; published_at?: string; meta_data?: any; seo_data?: any; sort_order?: number; is_active?: boolean }, 
    userId: string
  ) => {
    const existingArticle = await db.prepare('SELECT id FROM Articles WHERE slug = ?').bind(body.slug).first();
    if (existingArticle) {
      throw new Error('ARTICLE_EXISTS');
    }

    if (body.category_id) {
      const category = await db.prepare('SELECT id FROM Article_Categories WHERE id = ?').bind(body.category_id).first();
      if (!category) {
        throw new Error('CATEGORY_NOT_FOUND');
      }
    }

    let nextSortOrder = body.sort_order;
    const catId = body.category_id || null;
    if (nextSortOrder === undefined || nextSortOrder === null || nextSortOrder === 0) {
      let maxResult;
      if (catId) {
        maxResult = await db.prepare('SELECT MAX(sort_order) as max_val FROM Articles WHERE category_id = ?').bind(catId).first<{ max_val: number | null }>();
      } else {
        maxResult = await db.prepare('SELECT MAX(sort_order) as max_val FROM Articles WHERE category_id IS NULL').first<{ max_val: number | null }>();
      }
      nextSortOrder = (maxResult?.max_val ?? 0) + 1;
    } else {
      let existing;
      if (catId) {
        existing = await db.prepare('SELECT id FROM Articles WHERE sort_order = ? AND category_id = ?').bind(nextSortOrder, catId).first();
      } else {
        existing = await db.prepare('SELECT id FROM Articles WHERE sort_order = ? AND category_id IS NULL').bind(nextSortOrder).first();
      }
      if (existing) {
        throw new Error('SORT_ORDER_EXISTS');
      }
    }

    const id = crypto.randomUUID();
    const metaDataJson = body.meta_data ? JSON.stringify(body.meta_data) : '{}';
    const seoDataJson = body.seo_data ? JSON.stringify(body.seo_data) : '{}';

    await db.prepare(`
      INSERT INTO Articles (id, category_id, title, slug, excerpt, preview_image_url, reading_time_minutes, author_id, published_at, meta_data, seo_data, sort_order, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id, 
      catId, 
      body.title, 
      body.slug, 
      body.excerpt || null, 
      body.preview_image_url || null, 
      body.reading_time_minutes || null, 
      body.author_id || userId, 
      // Generates the current timestamp if not provided, avoiding 'null' overwrites of SQLite's DEFAULT CURRENT_TIMESTAMP.
      body.published_at || new Date().toISOString(), 
      metaDataJson, 
      seoDataJson, 
      nextSortOrder, 
      body.is_active ? 1 : 0,
      userId
    )
    .run();

    return id;
  },

  /**
   * Update an existing article by dynamically constructing the SET clause based on provided fields.
   * 
   * @param db - The D1 Database instance.
   */
  update: async (
    db: D1Database, 
    id: string, 
    body: { category_id?: string; title?: string; slug?: string; excerpt?: string; preview_image_url?: string; reading_time_minutes?: number; author_id?: string; published_at?: string; meta_data?: any; seo_data?: any; sort_order?: number; is_active?: boolean }, 
    userId: string
  ) => {
    const targetArticle = await db.prepare('SELECT id, category_id, sort_order FROM Articles WHERE id = ?').bind(id).first<{ category_id: string | null; sort_order: number }>();
    if (!targetArticle) {
      return false;
    }

    if (body.slug) {
      const collision = await db.prepare('SELECT id FROM Articles WHERE slug = ? AND id != ?')
        .bind(body.slug, id).first();
      if (collision) {
        throw new Error('ARTICLE_EXISTS');
      }
    }

    const finalCategoryId = body.category_id !== undefined ? (body.category_id || null) : targetArticle.category_id;

    if (body.sort_order !== undefined && body.sort_order !== null && body.sort_order !== 0 && body.sort_order !== targetArticle.sort_order) {
      let collision;
      if (finalCategoryId) {
        collision = await db.prepare('SELECT id FROM Articles WHERE sort_order = ? AND category_id = ? AND id != ?')
          .bind(body.sort_order, finalCategoryId, id).first();
      } else {
        collision = await db.prepare('SELECT id FROM Articles WHERE sort_order = ? AND category_id IS NULL AND id != ?')
          .bind(body.sort_order, id).first();
      }
      if (collision) {
        throw new Error('SORT_ORDER_EXISTS');
      }
    }

    if (body.category_id) {
      const category = await db.prepare('SELECT id FROM Article_Categories WHERE id = ?').bind(body.category_id).first();
      if (!category) {
        throw new Error('CATEGORY_NOT_FOUND');
      }
    }

    let updateQuery = 'UPDATE Articles SET updated_at = CURRENT_TIMESTAMP, updated_by = ?';
    const params: any[] = [userId];

    if (body.category_id !== undefined) { updateQuery += ', category_id = ?'; params.push(body.category_id || null); }
    if (body.title !== undefined) { updateQuery += ', title = ?'; params.push(body.title); }
    if (body.slug !== undefined) { updateQuery += ', slug = ?'; params.push(body.slug); }
    if (body.excerpt !== undefined) { updateQuery += ', excerpt = ?'; params.push(body.excerpt || null); }
    if (body.preview_image_url !== undefined) { updateQuery += ', preview_image_url = ?'; params.push(body.preview_image_url || null); }
    if (body.reading_time_minutes !== undefined) { updateQuery += ', reading_time_minutes = ?'; params.push(body.reading_time_minutes || null); }
    if (body.author_id !== undefined) { updateQuery += ', author_id = ?'; params.push(body.author_id || null); }
    if (body.published_at !== undefined) { updateQuery += ', published_at = ?'; params.push(body.published_at || null); }
    if (body.sort_order !== undefined) { updateQuery += ', sort_order = ?'; params.push(body.sort_order); }
    if (body.is_active !== undefined) { updateQuery += ', is_active = ?'; params.push(body.is_active ? 1 : 0); }
    
    if (body.meta_data !== undefined) { 
      updateQuery += ', meta_data = ?'; 
      params.push(body.meta_data ? JSON.stringify(body.meta_data) : '{}'); 
    }
    if (body.seo_data !== undefined) { 
      updateQuery += ', seo_data = ?'; 
      params.push(body.seo_data ? JSON.stringify(body.seo_data) : '{}'); 
    }

    updateQuery += ' WHERE id = ?';
    params.push(id);

    await db.prepare(updateQuery).bind(...params).run();
    return true;
  },

  /**
   * Delete an article by its ID.
   * 
   * @param db - The D1 Database instance.
   */
  delete: async (db: D1Database, id: string) => {
    const result = await db.prepare('DELETE FROM Articles WHERE id = ?').bind(id).run();
    return result.meta.changes > 0;
  },

  /**
   * Fetch allowed users (Admins or users with 'cms.articles' permission) to serve as publishers/authors.
   * 
   * @param db - The D1 Database instance.
   */
  getPublishers: async (db: D1Database) => {
    const users = await db.prepare('SELECT id, full_name, photo_url, role, permissions FROM Users WHERE is_banned = 0').all();
    return users.results.map((user: any) => {
      let perms = {};
      if (user.permissions) {
        try { perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions; } catch { perms = {}; }
      }
      return { ...user, permissions: perms };
    }).filter((user: any) => {
      if (user.role === 'Admin') return true;
      return user.permissions?.cms?.articles === true;
    }).map((user: any) => ({
      id: user.id,
      full_name: user.full_name,
      photo_url: user.photo_url
    }));
  }
};
