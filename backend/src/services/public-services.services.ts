/**
 * ==========================================
 *        AuraDash Public Services Services
 * ==========================================
 * 
 * Business logic layer for managing Public Services operations.
 */

import { D1Database } from '@cloudflare/workers-types';
import { getPaginationOptions, paginateQuery } from '../utils/pagination';

// Helper function to safely parse JSON columns from the database, providing a fallback value on failure.
const parseJsonColumn = <T>(raw: unknown, fallback: T): T => {
  if (!raw) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try { return JSON.parse(raw); } catch { return fallback; }
};

// Helper function to map and format Category database records for public display.
// (Critical Note: Verifies if meta_data is an array to prevent server crashes during .map execution)
const mapCategoryForPublic = (row: Record<string, unknown>) => {
  const metaDataParsed = parseJsonColumn<unknown[]>(row.meta_data, []);
  const metaDataArray = Array.isArray(metaDataParsed) ? metaDataParsed : [];
  
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    seo_data: parseJsonColumn(row.seo_data, {}),
    meta_data: metaDataArray.map((field: any) => ({
      id: field.id,
      label: field.label ?? null,
      type: field.type,
      data: field.data ?? null,
    })),
  };
};

// Helper function to map and format Service database records for public display.
// (Critical Note: Verifies if meta_data is an array to prevent server crashes)
const mapServiceForPublic = (row: Record<string, unknown>) => {
  const metaDataParsed = parseJsonColumn<unknown[]>(row.meta_data, []);
  const metaDataArray = Array.isArray(metaDataParsed) ? metaDataParsed : [];

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    seo_data: parseJsonColumn(row.seo_data, {}),
    meta_data: metaDataArray.map((field: any) => ({
      id: field.id,
      label: field.label ?? null,
      type: field.type,
      data: field.data ?? null,
    })),
  };
};

// Services layer responsible for handling database (D1) interactions and providing public data
export const PublicServicesService = {
  
  /**
   * Query fetching all active categories, ordered by their designated sort order.
   * 
   * @param db - The D1 Database instance.
   */
  getBookingCategories: async (db: D1Database) => {
    const query = 'SELECT id, name, slug FROM service_category WHERE is_active = 1 ORDER BY CASE WHEN sort_order = 0 THEN 1 ELSE 0 END ASC, sort_order ASC, created_at DESC';
    const { results } = await db.prepare(query).all();
    return results;
  },

  /**
   * Query fetching all active services, safeguarded to prevent returning services from deactivated categories.
   * 
   * @param db - The D1 Database instance.
   */
  getBookingServices: async (db: D1Database) => {
    // LEFT JOIN check ensures services belonging to inactive categories do not leak to the frontend.
    const query = `
      SELECT s.id, s.name, s.slug, s.service_category_id as parent_id 
      FROM Services s 
      LEFT JOIN service_category c ON s.service_category_id = c.id 
      WHERE s.is_active = 1 AND (s.service_category_id IS NULL OR c.is_active = 1) 
      ORDER BY CASE WHEN s.sort_order = 0 THEN 1 ELSE 0 END ASC, s.sort_order ASC, s.created_at DESC
    `;
    const { results } = await db.prepare(query).all();
    return results;
  },

  /**
   * Query fetching only active services belonging to a specific active category.
   * 
   * @param db - The D1 Database instance.
   */
  getBookingCategoryServices: async (db: D1Database, serviceCategorySlug: string) => {
    // The c.is_active = 1 check prevents leaking data from disabled categories.
    const query = `
      SELECT s.id, s.name, s.slug, s.service_category_id as parent_id 
      FROM Services s 
      JOIN service_category c ON s.service_category_id = c.id 
      WHERE s.is_active = 1 AND c.is_active = 1 AND c.slug = ? 
      ORDER BY CASE WHEN s.sort_order = 0 THEN 1 ELSE 0 END ASC, s.sort_order ASC, s.created_at DESC
    `;
    const { results } = await db.prepare(query).bind(serviceCategorySlug).all();
    return results;
  },

  /**
   * Query fetching a paginated list of all active categories.
   * 
   * @param db - The D1 Database instance.
   */
  getCategories: async (db: D1Database, page: any, limit: any) => {
    const paginationOptions = getPaginationOptions(page, limit, 20);
    const query = 'SELECT id, name, slug, meta_data, seo_data FROM service_category WHERE is_active = 1 ORDER BY CASE WHEN sort_order = 0 THEN 1 ELSE 0 END ASC, sort_order ASC, created_at DESC';
    const countQuery = 'SELECT COUNT(*) as total FROM service_category WHERE is_active = 1';
    const paginatedData = await paginateQuery(db, query, countQuery, [], paginationOptions);
    return {
      categories: (paginatedData.data as Record<string, unknown>[]).map(mapCategoryForPublic),
      pagination: paginatedData.pagination,
    };
  },

  /**
   * Query fetching a single active category by its URL slug.
   * 
   * @param db - The D1 Database instance.
   */
  getCategoryBySlug: async (db: D1Database, slug: string) => {
    const category = await db.prepare('SELECT id, name, slug, meta_data, seo_data FROM service_category WHERE slug = ? AND is_active = 1').bind(slug).first();
    if (!category) return null;
    return mapCategoryForPublic(category as Record<string, unknown>);
  },

  /**
   * Query fetching a paginated list of active services belonging to a specific category slug.
   * 
   * @param db - The D1 Database instance.
   */
  getServicesByCategorySlug: async (db: D1Database, slug: string, page: any, limit: any) => {
    const paginationOptions = getPaginationOptions(page, limit, 20);
    const category = await db.prepare('SELECT id, name, slug FROM service_category WHERE slug = ? AND is_active = 1').bind(slug).first();
    if (!category) return null;

    const categoryId = category.id as string;
    const query = 'SELECT id, name, slug, meta_data, seo_data FROM Services WHERE service_category_id = ? AND is_active = 1 ORDER BY CASE WHEN sort_order = 0 THEN 1 ELSE 0 END ASC, sort_order ASC, created_at DESC';
    const countQuery = 'SELECT COUNT(*) as total FROM Services WHERE service_category_id = ? AND is_active = 1';
    const paginatedData = await paginateQuery(db, query, countQuery, [categoryId], paginationOptions);

    return {
      category: { id: category.id, name: category.name, slug: category.slug },
      services: (paginatedData.data as Record<string, unknown>[]).map(mapServiceForPublic),
      pagination: paginatedData.pagination,
    };
  },

  /**
   * Query fetching all active services system-wide that are not linked to any category.
   * 
   * @param db - The D1 Database instance.
   */
  getAllServices: async (db: D1Database, page: any, limit: any) => {
    const paginationOptions = getPaginationOptions(page, limit, 20);
    const query = `
      SELECT id, name, slug, meta_data, seo_data 
      FROM Services 
      WHERE is_active = 1 AND service_category_id IS NULL 
      ORDER BY CASE WHEN sort_order = 0 THEN 1 ELSE 0 END ASC, sort_order ASC, created_at DESC
    `;
    const countQuery = 'SELECT COUNT(*) as total FROM Services WHERE is_active = 1 AND service_category_id IS NULL';
    const paginatedData = await paginateQuery(db, query, countQuery, [], paginationOptions);

    return {
      services: (paginatedData.data as Record<string, unknown>[]).map(mapServiceForPublic),
      pagination: paginatedData.pagination,
    };
  },



  /**
   * Query fetching a single active service by its URL slug. Requires the parent category (if any) to be active.
   * 
   * @param db - The D1 Database instance.
   */
  getServiceBySlug: async (db: D1Database, slug: string) => {
    const service = await db.prepare(`
      SELECT s.id, s.service_category_id, s.name, s.slug, s.meta_data, s.seo_data 
      FROM Services s 
      LEFT JOIN service_category c ON s.service_category_id = c.id 
      WHERE s.slug = ? AND s.is_active = 1 AND (s.service_category_id IS NULL OR c.is_active = 1)
    `).bind(slug).first();

    return service ? { ...mapServiceForPublic(service as Record<string, unknown>), service_category_id: (service as any).service_category_id ?? null } : null;
  },

  /**
   * Query fetching ALL active services (both linked and unlinked).
   * 
   * @param db - The D1 Database instance.
   */
  getAllServicesIncludingLinked: async (db: D1Database, page: any, limit: any) => {
    const paginationOptions = getPaginationOptions(page, limit, 20);
    const query = `
      SELECT id, name, slug, meta_data, seo_data, sort_order, created_at
      FROM Services 
      WHERE is_active = 1 
      ORDER BY CASE WHEN sort_order = 0 THEN 1 ELSE 0 END ASC, sort_order ASC, created_at DESC
    `;
    const countQuery = 'SELECT COUNT(*) as total FROM Services WHERE is_active = 1';
    const paginatedData = await paginateQuery(db, query, countQuery, [], paginationOptions);
    
    return {
      services: (paginatedData.data as Record<string, unknown>[]).map(mapServiceForPublic),
      pagination: paginatedData.pagination
    };
  },



  /**
   * Query counting the total number of active categories.
   * 
   * @param db - The D1 Database instance.
   */
  getCategoriesCount: async (db: D1Database) => {
    const result = await db.prepare('SELECT COUNT(*) as total FROM service_category WHERE is_active = 1').first();
    return (result?.total as number) || 0;
  },

  /**
   * Query counting the total number of unlinked active services, optionally filtered by a specific category slug.
   * 
   * @param db - The D1 Database instance.
   */
  getServicesCount: async (db: D1Database, serviceCategorySlug?: string) => {
    if (serviceCategorySlug) {
      const category = await db.prepare('SELECT id FROM service_category WHERE slug = ? AND is_active = 1').bind(serviceCategorySlug).first();
      if (!category) return null;
      const result = await db.prepare('SELECT COUNT(*) as total FROM Services WHERE service_category_id = ? AND is_active = 1').bind(category.id).first();
      return { count: (result?.total as number) || 0, category: serviceCategorySlug };
    }
    const result = await db.prepare('SELECT COUNT(*) as total FROM Services WHERE is_active = 1 AND service_category_id IS NULL').first();
    return { count: (result?.total as number) || 0 };
  },

  /**
   * Query counting the total number of ALL active services (both linked and unlinked).
   * 
   * @param db - The D1 Database instance.
   */
  getAllServicesCount: async (db: D1Database) => {
    const result = await db.prepare('SELECT COUNT(*) as total FROM Services WHERE is_active = 1').first();
    return { count: (result?.total as number) || 0 };
  },

  /**
   * Query counting the number of active services for a specific category using its slug and name.
   * 
   * @param db - The D1 Database instance.
   */
  getCategoryServicesCount: async (db: D1Database, slug: string) => {
    const category = await db.prepare('SELECT id, name FROM service_category WHERE slug = ? AND is_active = 1').bind(slug).first();
    if (!category) return null;
    const result = await db.prepare('SELECT COUNT(*) as total FROM Services WHERE service_category_id = ? AND is_active = 1').bind(category.id).first();
    return {
      category: { slug, name: category.name },
      count: (result?.total as number) || 0,
    };
  }
};
