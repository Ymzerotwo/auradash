/**
 * ==========================================
 *        AuraDash Service Category Services
 * ==========================================
 * 
 * Business logic layer for managing Service Category operations.
 */

import { D1Database } from '@cloudflare/workers-types';
import { getPaginationOptions, paginateQuery } from '../utils/pagination';
import { escapeLikePattern } from '../utils/sanitize';

// ==========================================
// AuraDash Category Service
// ==========================================
// The Data Access Layer containing core business logic.
// Ensures isolation between database bindings and HTTP handlers.
export const ServiceCategoryService = {
  /**
   * Builds and executes an optimized paginated list query.
   * @CRITICAL Employs ESCAPE syntax for LIKE clauses to neutralize Wildcard Injection attacks.
   * 
   * @param db - The D1 Database instance.
   */
  getAll: async (db: D1Database, search: string, page: any, limit: any, currentUser?: any, status?: string) => {
    const paginationOptions = getPaginationOptions(page, limit, 20);
    const isAdmin = currentUser?.role === 'Admin';

    let query = '';
    if (isAdmin) {
      query = `
        SELECT 
          service_category.id, service_category.name, service_category.slug, service_category.meta_data, service_category.seo_data, service_category.sort_order, service_category.is_active,
          service_category.created_at, service_category.updated_at,
          UC.full_name as created_by_name,
          UU.full_name as updated_by_name
        FROM service_category
        LEFT JOIN Users UC ON service_category.created_by = UC.id
        LEFT JOIN Users UU ON service_category.updated_by = UU.id
      `;
    } else {
      query = 'SELECT id, name, slug, meta_data, seo_data, sort_order, is_active FROM service_category';
    }

    let countQuery = 'SELECT COUNT(*) as total FROM service_category';
    const params: any[] = [];
    const filterClauses: string[] = [];

    if (search) {
      if (isAdmin) {
        filterClauses.push(`(service_category.name LIKE ? ESCAPE '\\' OR service_category.slug LIKE ? ESCAPE '\\')`);
      } else {
        filterClauses.push(`(name LIKE ? ESCAPE '\\' OR slug LIKE ? ESCAPE '\\')`);
      }
      const searchPattern = `%${escapeLikePattern(search)}%`;
      params.push(searchPattern, searchPattern);
    }

    if (status === 'active') {
      if (isAdmin) {
        filterClauses.push('service_category.is_active = 1');
      } else {
        filterClauses.push('is_active = 1');
      }
    } else if (status === 'inactive') {
      if (isAdmin) {
        filterClauses.push('service_category.is_active = 0');
      } else {
        filterClauses.push('is_active = 0');
      }
    }

    if (filterClauses.length > 0) {
      const clause = ` WHERE ${filterClauses.join(' AND ')}`;
      query += clause;
      countQuery += clause;
    }

    if (isAdmin) {
      query += ' ORDER BY CASE WHEN service_category.sort_order = 0 THEN 1 ELSE 0 END ASC, service_category.sort_order ASC, service_category.created_at DESC';
    } else {
      query += ' ORDER BY CASE WHEN sort_order = 0 THEN 1 ELSE 0 END ASC, sort_order ASC, created_at DESC';
    }

    return paginateQuery(db, query, countQuery, params, paginationOptions);
  },

  /**
   * Verifies the uniqueness of a slug securely.
   * 
   * @param db - The D1 Database instance.
   */
  checkSlug: async (db: D1Database, slug: string, excludeId?: string) => {
    let existing;
    if (excludeId) {
      existing = await db.prepare(`SELECT id FROM service_category WHERE slug = ? AND id != ?`).bind(slug, excludeId).first();
    } else {
      existing = await db.prepare(`SELECT id FROM service_category WHERE slug = ?`).bind(slug).first();
    }
    return !existing;
  },

  /**
   * Retrieves a category. Parses its JSON structural metadata safely to avoid application crashes.
   * 
   * @param db - The D1 Database instance.
   */
  getById: async (db: D1Database, id: string, currentUser?: any) => {
    const isAdmin = currentUser?.role === 'Admin';
    let category;

    if (isAdmin) {
      category = await db.prepare(`
        SELECT 
          service_category.id, service_category.name, service_category.slug, service_category.meta_data, service_category.seo_data, service_category.sort_order, service_category.is_active,
          service_category.created_at, service_category.updated_at,
          UC.full_name as created_by_name,
          UU.full_name as updated_by_name
        FROM service_category
        LEFT JOIN Users UC ON service_category.created_by = UC.id
        LEFT JOIN Users UU ON service_category.updated_by = UU.id
        WHERE service_category.id = ?
      `).bind(id).first() as any;
    } else {
      category = await db.prepare(
        `SELECT id, name, slug, meta_data, seo_data, sort_order, is_active FROM service_category WHERE id = ?`
      ).bind(id).first() as any;
    }

    if (!category) return null;

    // Parse JSON fields
    if (category.meta_data) {
      try { category.meta_data = JSON.parse(category.meta_data as string); } catch { category.meta_data = []; }
    }
    if (category.seo_data) {
      try { category.seo_data = JSON.parse(category.seo_data as string); } catch { category.seo_data = {}; }
    }

    return category;
  },

  /**
   * Inserts a new category into D1 Database.
   * @CRITICAL Manages explicit collision states (slug, sort_order) algorithmically to prevent duplicate constraint errors at the driver level.
   * 
   * @param db - The D1 Database instance.
   */
  create: async (db: D1Database, body: { name: string; slug: string; meta_data?: any; seo_data?: any; sort_order?: number; is_active?: boolean }, userId: string) => {
    const existingCategory = await db.prepare('SELECT id FROM service_category WHERE slug = ?').bind(body.slug).first();
    if (existingCategory) {
      throw new Error('CATEGORY_EXISTS');
    }

    let nextSortOrder = body.sort_order;
    if (nextSortOrder === undefined || nextSortOrder === null || nextSortOrder === 0) {
      const maxResult = await db.prepare('SELECT MAX(sort_order) as max_val FROM service_category').first<{ max_val: number | null }>();
      nextSortOrder = (maxResult?.max_val ?? 0) + 1;
    } else {
      const existingSortOrder = await db.prepare('SELECT id FROM service_category WHERE sort_order = ?').bind(nextSortOrder).first();
      if (existingSortOrder) {
        throw new Error('SORT_ORDER_EXISTS');
      }
    }

    const id = crypto.randomUUID();
    const metaDataJson = body.meta_data ? JSON.stringify(body.meta_data) : '[]';
    const seoDataJson = body.seo_data ? JSON.stringify(body.seo_data) : '{}';

    await db.prepare(`
      INSERT INTO service_category (id, name, slug, meta_data, seo_data, sort_order, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id, 
      body.name, 
      body.slug, 
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
   * Dynamically patches a category using immutable bindings to secure the DB from SQL injection.
   * 
   * @param db - The D1 Database instance.
   */
  update: async (db: D1Database, id: string, body: { name?: string; slug?: string; meta_data?: any; seo_data?: any; sort_order?: number; is_active?: boolean }, userId: string) => {
    const targetCategory = await db.prepare('SELECT id FROM service_category WHERE id = ?').bind(id).first();
    if (!targetCategory) {
      return false;
    }

    if (body.slug) {
      const collision = await db.prepare('SELECT id FROM service_category WHERE slug = ? AND id != ?')
        .bind(body.slug, id).first();
      if (collision) {
        throw new Error('CATEGORY_EXISTS');
      }
    }

    if (body.sort_order !== undefined && body.sort_order !== null && body.sort_order !== 0) {
      const collision = await db.prepare('SELECT id FROM service_category WHERE sort_order = ? AND id != ?')
        .bind(body.sort_order, id).first();
      if (collision) {
        throw new Error('SORT_ORDER_EXISTS');
      }
    }

    let updateQuery = 'UPDATE service_category SET updated_at = CURRENT_TIMESTAMP, updated_by = ?';
    const params: any[] = [userId];

    if (body.name !== undefined) { updateQuery += ', name = ?'; params.push(body.name); }
    if (body.slug !== undefined) { updateQuery += ', slug = ?'; params.push(body.slug); }
    if (body.sort_order !== undefined) { updateQuery += ', sort_order = ?'; params.push(body.sort_order); }
    if (body.is_active !== undefined) { updateQuery += ', is_active = ?'; params.push(body.is_active ? 1 : 0); }
    if (body.meta_data !== undefined) { 
      updateQuery += ', meta_data = ?'; 
      params.push(body.meta_data ? JSON.stringify(body.meta_data) : '[]'); 
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
   * Hard deletes the category.
   * Note: Child relations (like Services) will cascade delete due to DB constraints.
   * 
   * @param db - The D1 Database instance.
   */
  delete: async (db: D1Database, id: string) => {
    const result = await db.prepare('DELETE FROM service_category WHERE id = ?').bind(id).run();
    return result.meta.changes > 0;
  }
};
