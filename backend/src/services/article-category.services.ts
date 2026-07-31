/**
 * ==========================================
 *        AuraDash Article Category Services
 * ==========================================
 * 
 * Business logic layer for managing Article Category operations.
 */

import { D1Database } from '@cloudflare/workers-types';
import { getPaginationOptions, paginateQuery } from '../utils/pagination';
import { escapeLikePattern } from '../utils/sanitize';

// Service layer handling Database (D1) interactions for Article Categories.
export const ArticleCategoryService = {
  
  /**
   * Retrieve a paginated list of categories. Injects audit details if requested by an Admin.
   * 
   * @param db - The D1 Database instance.
   */
  getAll: async (db: D1Database, search: string, status: string | undefined, page: any, limit: any, currentUser?: any) => {
    const paginationOptions = getPaginationOptions(page, limit, 20);
    const isAdmin = currentUser?.role === 'Admin';
    const auditFields = isAdmin
      ? ', Article_Categories.created_at, u_creator.full_name as created_by_name, Article_Categories.updated_at, u_updater.full_name as updated_by_name'
      : '';
    const joinClause = isAdmin
      ? ' LEFT JOIN Users u_creator ON Article_Categories.created_by = u_creator.id LEFT JOIN Users u_updater ON Article_Categories.updated_by = u_updater.id'
      : '';

    let query = `SELECT Article_Categories.id, Article_Categories.title, Article_Categories.slug, Article_Categories.excerpt, Article_Categories.preview_image_url, Article_Categories.meta_data, Article_Categories.seo_data, Article_Categories.sort_order, Article_Categories.is_active${auditFields} FROM Article_Categories${joinClause}`;
    let countQuery = 'SELECT COUNT(*) as total FROM Article_Categories';
    const params: any[] = [];
    const filterClauses: string[] = [];

    // Uses escapeLikePattern to mitigate LIKE-based SQL injection techniques in search queries.
    if (search) {
      filterClauses.push(`(Article_Categories.slug LIKE ? ESCAPE '\\' OR Article_Categories.title LIKE ? ESCAPE '\\')`);
      const searchPattern = `%${escapeLikePattern(search)}%`;
      params.push(searchPattern, searchPattern);
    }

    if (status === 'active') {
      filterClauses.push('Article_Categories.is_active = 1');
    } else if (status === 'inactive') {
      filterClauses.push('Article_Categories.is_active = 0');
    }

    if (filterClauses.length > 0) {
      const clause = ` WHERE ${filterClauses.join(' AND ')}`;
      query += clause;
      countQuery += clause;
    }

    query += ' ORDER BY CASE WHEN Article_Categories.sort_order = 0 THEN 1 ELSE 0 END ASC, Article_Categories.sort_order ASC, Article_Categories.created_at DESC';

    return paginateQuery(db, query, countQuery, params, paginationOptions);
  },



  /**
   * Fetch a single article category's data by its ID, securely deserializing JSON structures.
   * 
   * @param db - The D1 Database instance.
   */
  getById: async (db: D1Database, id: string, currentUser?: any) => {
    const isAdmin = currentUser?.role === 'Admin';
    const auditFields = isAdmin
      ? ', Article_Categories.created_at, u_creator.full_name as created_by_name, Article_Categories.updated_at, u_updater.full_name as updated_by_name'
      : '';
    const joinClause = isAdmin
      ? ' LEFT JOIN Users u_creator ON Article_Categories.created_by = u_creator.id LEFT JOIN Users u_updater ON Article_Categories.updated_by = u_updater.id'
      : '';
    const category = await db.prepare(
      `SELECT Article_Categories.id, Article_Categories.title, Article_Categories.slug, Article_Categories.excerpt, Article_Categories.preview_image_url, Article_Categories.meta_data, Article_Categories.seo_data, Article_Categories.sort_order, Article_Categories.is_active${auditFields} FROM Article_Categories${joinClause} WHERE Article_Categories.id = ?`
    ).bind(id).first() as any;

    if (!category) return null;

    // Encapsulates parsing logic in try/catch to maintain system stability despite anomalous database JSON content.
    if (category.meta_data) {
      try { category.meta_data = JSON.parse(category.meta_data as string); } catch { category.meta_data = {}; }
    }
    if (category.seo_data) {
      try { category.seo_data = JSON.parse(category.seo_data as string); } catch { category.seo_data = {}; }
    }

    return category;
  },

  /**
   * Insert a new article category entry into the database.
   * 
   * @param db - The D1 Database instance.
   */
  create: async (
    db: D1Database, 
    body: { title: string; slug: string; excerpt?: string; preview_image_url?: string; meta_data?: any; seo_data?: any; sort_order?: number; is_active?: boolean }, 
    userId: string
  ) => {
    const existingCategory = await db.prepare('SELECT id FROM Article_Categories WHERE slug = ?').bind(body.slug).first();
    if (existingCategory) {
      throw new Error('CATEGORY_EXISTS');
    }

    let nextSortOrder = body.sort_order;
    if (nextSortOrder === undefined || nextSortOrder === null || nextSortOrder === 0) {
      const maxResult = await db.prepare('SELECT MAX(sort_order) as max_val FROM Article_Categories').first<{ max_val: number | null }>();
      nextSortOrder = (maxResult?.max_val ?? 0) + 1;
    } else {
      const existing = await db.prepare('SELECT id FROM Article_Categories WHERE sort_order = ?').bind(nextSortOrder).first();
      if (existing) {
        throw new Error('SORT_ORDER_EXISTS');
      }
    }

    const id = crypto.randomUUID();
    const metaDataJson = body.meta_data ? JSON.stringify(body.meta_data) : '{}';
    const seoDataJson = body.seo_data ? JSON.stringify(body.seo_data) : '{}';

    await db.prepare(`
      INSERT INTO Article_Categories (id, title, slug, excerpt, preview_image_url, meta_data, seo_data, sort_order, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id, 
      body.title, 
      body.slug, 
      body.excerpt || null, 
      body.preview_image_url || null, 
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
   * Dynamically construct an UPDATE query for partial modifications to an article category.
   * 
   * @param db - The D1 Database instance.
   */
  update: async (
    db: D1Database, 
    id: string, 
    body: { title?: string; slug?: string; excerpt?: string; preview_image_url?: string; meta_data?: any; seo_data?: any; sort_order?: number; is_active?: boolean }, 
    userId: string
  ) => {
    const targetCategory = await db.prepare('SELECT id, sort_order FROM Article_Categories WHERE id = ?').bind(id).first<{ sort_order: number }>();
    if (!targetCategory) {
      return false;
    }

    if (body.slug) {
      const collision = await db.prepare('SELECT id FROM Article_Categories WHERE slug = ? AND id != ?')
        .bind(body.slug, id).first();
      if (collision) {
        throw new Error('CATEGORY_EXISTS');
      }
    }

    if (body.sort_order !== undefined && body.sort_order !== null && body.sort_order !== 0 && body.sort_order !== targetCategory.sort_order) {
      const collision = await db.prepare('SELECT id FROM Article_Categories WHERE sort_order = ? AND id != ?')
        .bind(body.sort_order, id).first();
      if (collision) {
        throw new Error('SORT_ORDER_EXISTS');
      }
    }

    let updateQuery = 'UPDATE Article_Categories SET updated_at = CURRENT_TIMESTAMP, updated_by = ?';
    const params: any[] = [userId];

    if (body.title !== undefined) { updateQuery += ', title = ?'; params.push(body.title); }
    if (body.slug !== undefined) { updateQuery += ', slug = ?'; params.push(body.slug); }
    if (body.excerpt !== undefined) { updateQuery += ', excerpt = ?'; params.push(body.excerpt || null); }
    if (body.preview_image_url !== undefined) { updateQuery += ', preview_image_url = ?'; params.push(body.preview_image_url || null); }
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
   * Delete an article category by its ID.
   * 
   * @param db - The D1 Database instance.
   */
  delete: async (db: D1Database, id: string) => {
    const result = await db.prepare('DELETE FROM Article_Categories WHERE id = ?').bind(id).run();
    return result.meta.changes > 0;
  }
};
