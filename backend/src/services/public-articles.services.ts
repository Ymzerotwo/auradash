/**
 * ==========================================
 *        AuraDash Public Articles Services
 * ==========================================
 * 
 * Business logic layer for managing Public Articles operations.
 */

import { D1Database } from '@cloudflare/workers-types';

const formatArticle = (row: any) => {
  let seo_data = {};
  let meta_data: any = [];

  if (row.seo_data) {
    try { seo_data = typeof row.seo_data === 'string' ? JSON.parse(row.seo_data) : row.seo_data; } catch(e){}
  }
  if (row.meta_data) {
    try { meta_data = typeof row.meta_data === 'string' ? JSON.parse(row.meta_data) : row.meta_data; } catch(e){}
  }

  // Create a new object with explicitly ordered keys to match the desired format
  const formatted: any = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    author_name: row.author_name || null,
    excerpt: row.excerpt,
    preview_image_url: row.preview_image_url,
    reading_time_minutes: row.reading_time_minutes,
    published_at: row.published_at,
    seo_data: seo_data,
    meta_data: meta_data
  };

  // Conditionally append category info if present (from linked queries)
  if (row.category_name !== undefined && row.category_name !== null) formatted.category_name = row.category_name;
  if (row.category_slug !== undefined && row.category_slug !== null) formatted.category_slug = row.category_slug;

  return formatted;
};

export const PublicArticlesService = {
  /**
   * Performs the Get Articles operation.
   * 
   * @param db - The D1 Database instance.
   */
  getArticles: async (db: D1Database, categoryId: string | null, limit: number, offset: number) => {
    const nowStr = new Date().toISOString();
    let query = `
      SELECT 
        a.id, a.title, a.slug, a.excerpt, a.preview_image_url, 
        a.reading_time_minutes, a.published_at, a.seo_data, a.meta_data,
        u.full_name as author_name
      FROM Articles a
      LEFT JOIN Users u ON a.author_id = u.id
      WHERE a.is_active = 1 
        AND a.published_at IS NOT NULL 
        AND a.published_at <= ?
    `;

    let countQuery = `
      SELECT COUNT(*) as total 
      FROM Articles a
      WHERE a.is_active = 1 
        AND a.published_at IS NOT NULL 
        AND a.published_at <= ?
    `;

    const params: any[] = [nowStr];

    if (categoryId) {
      if (categoryId === 'null') {
        query += ' AND a.category_id IS NULL';
        countQuery += ' AND a.category_id IS NULL';
      } else {
        query += ' AND a.category_id = ?';
        countQuery += ' AND a.category_id = ?';
        params.push(categoryId);
      }
    } else {
      query += ' AND a.category_id IS NULL';
      countQuery += ' AND a.category_id IS NULL';
    }

    query += ' ORDER BY a.published_at DESC LIMIT ? OFFSET ?';
    
    const [countResult, articles] = await Promise.all([
      db.prepare(countQuery).bind(...params).first<{ total: number }>(),
      db.prepare(query).bind(...params, limit, offset).all()
    ]);
    const total = countResult?.total || 0;
    const parsedArticles = articles.results.map(formatArticle);

    return { articles: parsedArticles, total };
  },

  /**
   * Performs the Get All Articles Including Linked operation.
   * 
   * @param db - The D1 Database instance.
   */
  getAllArticlesIncludingLinked: async (db: D1Database, limit: number, offset: number) => {
    const nowStr = new Date().toISOString();
    let query = `
      SELECT 
        a.id, a.title, a.slug, a.excerpt, a.preview_image_url, 
        a.reading_time_minutes, a.published_at, a.seo_data, a.meta_data,
        c.title as category_name, c.slug as category_slug,
        u.full_name as author_name
      FROM Articles a
      LEFT JOIN Article_Categories c ON a.category_id = c.id
      LEFT JOIN Users u ON a.author_id = u.id
      WHERE a.is_active = 1 
        AND a.published_at IS NOT NULL 
        AND a.published_at <= ?
    `;

    let countQuery = `
      SELECT COUNT(*) as total 
      FROM Articles a
      WHERE a.is_active = 1 
        AND a.published_at IS NOT NULL 
        AND a.published_at <= ?
    `;

    query += ' ORDER BY a.published_at DESC LIMIT ? OFFSET ?';
    
    const [countResult, result] = await Promise.all([
      db.prepare(countQuery).bind(nowStr).first<{ total: number }>(),
      db.prepare(query).bind(nowStr, limit, offset).all()
    ]);
    const total = countResult?.total || 0;
    const mappedArticles = result.results.map(formatArticle);

    return { articles: mappedArticles, total };
  },

  /**
   * Performs the Get Article By Slug operation.
   * 
   * @param db - The D1 Database instance.
   */
  getArticleBySlug: async (db: D1Database, slug: string) => {
    const nowStr = new Date().toISOString();
    const article = await db.prepare(`
      SELECT 
        a.id, a.title, a.slug, a.excerpt, a.preview_image_url, 
        a.reading_time_minutes, a.published_at, a.meta_data, a.seo_data,
        c.title as category_name, c.slug as category_slug,
        u.full_name as author_name
      FROM Articles a
      LEFT JOIN Article_Categories c ON a.category_id = c.id
      LEFT JOIN Users u ON a.author_id = u.id
      WHERE a.slug = ? 
        AND a.is_active = 1 
        AND a.published_at IS NOT NULL 
        AND a.published_at <= ?
    `).bind(slug, nowStr).first<any>();

    if (!article) return null;
    return formatArticle(article);
  },

  /**
   * Performs the Get Article Id By Slug operation.
   * 
   * @param db - The D1 Database instance.
   */
  getArticleIdBySlug: async (db: D1Database, slug: string) => {
    return await db.prepare(`
      SELECT id FROM Articles WHERE slug = ? AND is_active = 1
    `).bind(slug).first<{ id: string }>();
  },

  /**
   * Performs the Get Article Comments operation.
   * 
   * @param db - The D1 Database instance.
   */
  getArticleComments: async (db: D1Database, articleId: string, limit: number, offset: number) => {
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM Article_Comments 
      WHERE article_id = ? AND status = 'approved'
    `;

    const query = `
      SELECT id, user_name, content, created_at, parent_id
      FROM Article_Comments
      WHERE article_id = ? AND status = 'approved'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [countResult, result] = await Promise.all([
      db.prepare(countQuery).bind(articleId).first<{ total: number }>(),
      db.prepare(query).bind(articleId, limit, offset).all()
    ]);

    const total = countResult?.total || 0;
    return { comments: result.results, total };
  },

  /**
   * Performs the Get Article Categories operation.
   * 
   * @param db - The D1 Database instance.
   */
  getArticleCategories: async (db: D1Database, limit: number, offset: number) => {
    const query = `
      SELECT id, title, slug, excerpt 
      FROM Article_Categories 
      WHERE is_active = 1 
      ORDER BY CASE WHEN sort_order = 0 THEN 1 ELSE 0 END ASC, sort_order ASC, created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [countResult, categories] = await Promise.all([
      db.prepare('SELECT COUNT(*) as total FROM Article_Categories WHERE is_active = 1').first<{total: number}>(),
      db.prepare(query).bind(limit, offset).all()
    ]);

    const total = countResult?.total || 0;
    return { categories: categories.results, total };
  },

  /**
   * Performs the Get Articles Count operation.
   * 
   * @param db - The D1 Database instance.
   */
  getArticlesCount: async (db: D1Database) => {
    const nowStr = new Date().toISOString();
    const result = await db.prepare('SELECT COUNT(*) as total FROM Articles WHERE is_active = 1 AND published_at IS NOT NULL AND published_at <= ? AND category_id IS NULL').bind(nowStr).first<{total: number}>();
    return result?.total || 0;
  },

  /**
   * Performs the Get All Articles Count operation.
   * 
   * @param db - The D1 Database instance.
   */
  getAllArticlesCount: async (db: D1Database) => {
    const nowStr = new Date().toISOString();
    const result = await db.prepare('SELECT COUNT(*) as total FROM Articles WHERE is_active = 1 AND published_at IS NOT NULL AND published_at <= ?').bind(nowStr).first<{total: number}>();
    return result?.total || 0;
  },

  /**
   * Performs the Get Article Categories Count operation.
   * 
   * @param db - The D1 Database instance.
   */
  getArticleCategoriesCount: async (db: D1Database) => {
    const result = await db.prepare('SELECT COUNT(*) as total FROM Article_Categories WHERE is_active = 1').first<{total: number}>();
    return result?.total || 0;
  },

  /**
   * Performs the Get Category Articles Count operation.
   * 
   * @param db - The D1 Database instance.
   */
  getCategoryArticlesCount: async (db: D1Database, slug: string) => {
    const nowStr = new Date().toISOString();
    const category = await db.prepare('SELECT id FROM Article_Categories WHERE slug = ? AND is_active = 1').bind(slug).first<{id: string}>();
    if (!category) return null;
    
    const result = await db.prepare('SELECT COUNT(*) as total FROM Articles WHERE category_id = ? AND is_active = 1 AND published_at IS NOT NULL AND published_at <= ?').bind(category.id, nowStr).first<{total: number}>();
    return { count: result?.total || 0, category: slug };
  },

  /**
   * Performs the Get Article Category By Slug operation.
   * 
   * @param db - The D1 Database instance.
   */
  getArticleCategoryBySlug: async (db: D1Database, slug: string) => {
    const category = await db.prepare('SELECT id, title, slug, excerpt, preview_image_url, meta_data, seo_data FROM Article_Categories WHERE slug = ? AND is_active = 1').bind(slug).first<any>();
    if (!category) return null;
    try { if (typeof category.meta_data === 'string') category.meta_data = JSON.parse(category.meta_data); } catch(e){}
    try { if (typeof category.seo_data === 'string') category.seo_data = JSON.parse(category.seo_data); } catch(e){}
    if (!category.meta_data) category.meta_data = {};
    return category;
  },

  /**
   * Performs the Get Articles By Category operation.
   * 
   * @param db - The D1 Database instance.
   */
  getArticlesByCategory: async (db: D1Database, slug: string, limit: number, offset: number) => {
    const nowStr = new Date().toISOString();
    const category = await db.prepare('SELECT id, title, slug, excerpt, preview_image_url, meta_data, seo_data FROM Article_Categories WHERE slug = ? AND is_active = 1').bind(slug).first<{id: string, [key:string]: any}>();
    if (!category) return null;

    let query = `
      SELECT 
        a.id, a.title, a.slug, a.excerpt, a.preview_image_url, 
        a.reading_time_minutes, a.published_at, a.seo_data, a.meta_data,
        u.full_name as author_name
      FROM Articles a
      LEFT JOIN Users u ON a.author_id = u.id
      WHERE a.category_id = ? 
        AND a.is_active = 1 
        AND a.published_at IS NOT NULL 
        AND a.published_at <= ?
      ORDER BY a.published_at DESC
      LIMIT ? OFFSET ?
    `;
    const [result, countResult] = await Promise.all([
      db.prepare(query).bind(category.id, nowStr, limit, offset).all(),
      db.prepare('SELECT COUNT(*) as total FROM Articles WHERE category_id = ? AND is_active = 1 AND published_at IS NOT NULL AND published_at <= ?').bind(category.id, nowStr).first<{total: number}>()
    ]);

    const mappedArticles = result.results.map(formatArticle);

    return { articles: mappedArticles, total: countResult?.total || 0, category };
  }
};
