/**
 * ==========================================
 *        AuraDash Service Services
 * ==========================================
 * 
 * Business logic layer for managing Service operations.
 */

import { D1Database } from '@cloudflare/workers-types';
import { getPaginationOptions, paginateQuery } from '../utils/pagination';
import { escapeLikePattern } from '../utils/sanitize';

export const ServiceService = {
  /**
   * Performs the Get All operation.
   * 
   * @param db - The D1 Database instance.
   */
  getAll: async (db: D1Database, search: string, categoryId: any, page: any, limit: any, currentUser?: any, status?: string) => {
    const paginationOptions = getPaginationOptions(page, limit, 20);
    const isAdmin = currentUser?.role === 'Admin';

    let query = '';
    if (isAdmin) {
      query = `
        SELECT 
          Services.id, Services.service_category_id as category_id, Services.name, Services.slug, Services.meta_data, Services.seo_data, Services.sort_order, Services.is_active,
          Services.created_at, Services.updated_at,
          UC.full_name as created_by_name,
          UU.full_name as updated_by_name
        FROM Services
        LEFT JOIN Users UC ON Services.created_by = UC.id
        LEFT JOIN Users UU ON Services.updated_by = UU.id
      `;
    } else {
      query = 'SELECT id, service_category_id as category_id, name, slug, meta_data, seo_data, sort_order, is_active FROM Services';
    }

    let countQuery = 'SELECT COUNT(*) as total FROM Services';
    const params: any[] = [];
    const filterClauses: string[] = [];

    if (search) {
      if (isAdmin) {
        filterClauses.push(`(Services.name LIKE ? ESCAPE '\\' OR Services.slug LIKE ? ESCAPE '\\')`);
      } else {
        filterClauses.push(`(name LIKE ? ESCAPE '\\' OR slug LIKE ? ESCAPE '\\')`);
      }
      const searchPattern = `%${escapeLikePattern(search)}%`;
      params.push(searchPattern, searchPattern);
    }

    if (status === 'active') {
      if (isAdmin) {
        filterClauses.push('Services.is_active = 1');
      } else {
        filterClauses.push('is_active = 1');
      }
    } else if (status === 'inactive') {
      if (isAdmin) {
        filterClauses.push('Services.is_active = 0');
      } else {
        filterClauses.push('is_active = 0');
      }
    }

    if (categoryId) {
      if (categoryId === 'null') {
        if (isAdmin) {
          filterClauses.push('Services.service_category_id IS NULL');
        } else {
          filterClauses.push('service_category_id IS NULL');
        }
      } else {
        if (isAdmin) {
          filterClauses.push('Services.service_category_id = ?');
        } else {
          filterClauses.push('service_category_id = ?');
        }
        params.push(categoryId);
      }
    }

    if (filterClauses.length > 0) {
      const clause = ` WHERE ${filterClauses.join(' AND ')}`;
      query += clause;
      countQuery += clause;
    }

    if (isAdmin) {
      query += ' ORDER BY CASE WHEN Services.sort_order = 0 THEN 1 ELSE 0 END ASC, Services.sort_order ASC, Services.created_at DESC';
    } else {
      query += ' ORDER BY CASE WHEN sort_order = 0 THEN 1 ELSE 0 END ASC, sort_order ASC, created_at DESC';
    }

    return paginateQuery(db, query, countQuery, params, paginationOptions);
  },

  /**
   * Performs the Check Slug operation.
   * 
   * @param db - The D1 Database instance.
   */
  checkSlug: async (db: D1Database, slug: string, excludeId?: string) => {
    let existing;
    if (excludeId) {
      existing = await db.prepare(`SELECT id FROM Services WHERE slug = ? AND id != ?`).bind(slug, excludeId).first();
    } else {
      existing = await db.prepare(`SELECT id FROM Services WHERE slug = ?`).bind(slug).first();
    }
    return !existing;
  },

  /**
   * Performs the Get By Id operation.
   * 
   * @param db - The D1 Database instance.
   */
  getById: async (db: D1Database, id: string, currentUser?: any) => {
    const isAdmin = currentUser?.role === 'Admin';
    let service;

    if (isAdmin) {
      service = await db.prepare(`
        SELECT 
          Services.id, Services.service_category_id as category_id, Services.name, Services.slug, Services.meta_data, Services.seo_data, Services.sort_order, Services.is_active,
          Services.created_at, Services.updated_at,
          UC.full_name as created_by_name,
          UU.full_name as updated_by_name
        FROM Services
        LEFT JOIN Users UC ON Services.created_by = UC.id
        LEFT JOIN Users UU ON Services.updated_by = UU.id
        WHERE Services.id = ?
      `).bind(id).first() as any;
    } else {
      service = await db.prepare(
        `SELECT id, service_category_id as category_id, name, slug, meta_data, seo_data, sort_order, is_active FROM Services WHERE id = ?`
      ).bind(id).first() as any;
    }

    if (!service) return null;

    if (service.meta_data) {
      try { service.meta_data = JSON.parse(service.meta_data as string); } catch { service.meta_data = []; }
    }
    if (service.seo_data) {
      try { service.seo_data = JSON.parse(service.seo_data as string); } catch { service.seo_data = {}; }
    }

    return service;
  },

  /**
   * Performs the Create operation.
   * 
   * @param db - The D1 Database instance.
   */
  create: async (
    db: D1Database, 
    body: { category_id?: string; name: string; slug: string; meta_data?: any; seo_data?: any; sort_order?: number; is_active?: boolean }, 
    userId: string
  ) => {
    const existingService = await db.prepare('SELECT id FROM Services WHERE slug = ?').bind(body.slug).first();
    if (existingService) {
      throw new Error('SERVICE_EXISTS');
    }

    if (body.category_id) {
      const category = await db.prepare('SELECT id FROM service_category WHERE id = ?').bind(body.category_id).first();
      if (!category) {
        throw new Error('CATEGORY_NOT_FOUND');
      }
    }

    let nextSortOrder = body.sort_order;
    const catId = body.category_id || null;
    if (nextSortOrder === undefined || nextSortOrder === null || nextSortOrder === 0) {
      let maxResult;
      if (catId) {
        maxResult = await db.prepare('SELECT MAX(sort_order) as max_val FROM Services WHERE service_category_id = ?').bind(catId).first<{ max_val: number | null }>();
      } else {
        maxResult = await db.prepare('SELECT MAX(sort_order) as max_val FROM Services WHERE service_category_id IS NULL').first<{ max_val: number | null }>();
      }
      nextSortOrder = (maxResult?.max_val ?? 0) + 1;
    } else {
      let existing;
      if (catId) {
        existing = await db.prepare('SELECT id FROM Services WHERE sort_order = ? AND service_category_id = ?').bind(nextSortOrder, catId).first();
      } else {
        existing = await db.prepare('SELECT id FROM Services WHERE sort_order = ? AND service_category_id IS NULL').bind(nextSortOrder).first();
      }
      if (existing) {
        throw new Error('SORT_ORDER_EXISTS');
      }
    }

    const id = crypto.randomUUID();
    const metaDataJson = body.meta_data ? JSON.stringify(body.meta_data) : '[]';
    const seoDataJson = body.seo_data ? JSON.stringify(body.seo_data) : '{}';

    await db.prepare(`
      INSERT INTO Services (id, service_category_id, name, slug, meta_data, seo_data, sort_order, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id, 
      catId, 
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
   * Performs the Update operation.
   * 
   * @param db - The D1 Database instance.
   */
  update: async (
    db: D1Database, 
    id: string, 
    body: { category_id?: string; name?: string; slug?: string; meta_data?: any; seo_data?: any; sort_order?: number; is_active?: boolean }, 
    userId: string
  ) => {
    const targetService = await db.prepare('SELECT id, service_category_id as category_id FROM Services WHERE id = ?').bind(id).first<{ category_id: string | null }>();
    if (!targetService) {
      return false;
    }

    if (body.slug) {
      const collision = await db.prepare('SELECT id FROM Services WHERE slug = ? AND id != ?')
        .bind(body.slug, id).first();
      if (collision) {
        throw new Error('SERVICE_EXISTS');
      }
    }

    const finalCategoryId = body.category_id !== undefined ? (body.category_id || null) : targetService.category_id;

    if (body.sort_order !== undefined && body.sort_order !== null && body.sort_order !== 0) {
      let collision;
      if (finalCategoryId) {
        collision = await db.prepare('SELECT id FROM Services WHERE sort_order = ? AND service_category_id = ? AND id != ?')
          .bind(body.sort_order, finalCategoryId, id).first();
      } else {
        collision = await db.prepare('SELECT id FROM Services WHERE sort_order = ? AND service_category_id IS NULL AND id != ?')
          .bind(body.sort_order, id).first();
      }
      if (collision) {
        throw new Error('SORT_ORDER_EXISTS');
      }
    }

    if (body.category_id !== undefined) {
      const categoryIdToCheck = body.category_id;
      if (categoryIdToCheck) {
        const category = await db.prepare('SELECT id FROM service_category WHERE id = ?').bind(categoryIdToCheck).first();
        if (!category) {
          throw new Error('CATEGORY_NOT_FOUND');
        }
      }
    }

    let updateQuery = 'UPDATE Services SET updated_at = CURRENT_TIMESTAMP, updated_by = ?';
    const params: any[] = [userId];

    if (body.category_id !== undefined) { updateQuery += ', service_category_id = ?'; params.push(body.category_id); }
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
   * Performs the Delete operation.
   * 
   * @param db - The D1 Database instance.
   */
  delete: async (db: D1Database, id: string) => {
    const result = await db.prepare('DELETE FROM Services WHERE id = ?').bind(id).run();
    return result.meta.changes > 0;
  }
};
