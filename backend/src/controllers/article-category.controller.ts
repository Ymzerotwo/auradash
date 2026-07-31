/**
 * ==========================================
 *        AuraDash Article Category Controller
 * ==========================================
 * 
 * Handles HTTP requests for Article Category operations.
 */

import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { ArticleCategoryService } from '../services/article-category.services';
import { purgeEntityCache } from '../utils/cache.utils';

// Controller handling CMS operations for Article Categories.
// Restricted to Admins and users with 'cms.articles' permissions.
export const ArticleCategoryController = {
  
  /**
   * Fetch a paginated list of all article categories.
   * 
   * @param c - The Hono HTTP context.
   */
  getAll: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const search = c.req.query('search') || '';
    const status = c.req.query('status');
    const page = c.req.query('page');
    const limit = c.req.query('limit');
    const user = c.get('user');

    try {
      const paginatedData = await ArticleCategoryService.getAll(db, search, status, page, limit, user);
      return sendResponse(c, 200, 'CATEGORIES_FETCHED', 'Article categories retrieved successfully', {
        categories: paginatedData.data,
        pagination: paginatedData.pagination
      });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve article categories', null, error.message);
    }
  },



  /**
   * Retrieve detailed metadata for a single category using its unique ID.
   * 
   * @param c - The Hono HTTP context.
   */
  getById: async (c: Context<AppContext>) => {
    const id = c.req.param('id') as string;
    const db = c.env.DB;
    const user = c.get('user');

    try {
      const category = await ArticleCategoryService.getById(db, id, user);
      if (!category) {
        return sendResponse(c, 404, 'CATEGORY_NOT_FOUND', 'Article category not found');
      }
      return sendResponse(c, 200, 'CATEGORY_FETCHED', 'Article category retrieved successfully', { category });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve article category', null, error.message);
    }
  },

  /**
   * Create a new article category and trigger Edge Cache purges.
   * 
   * @param c - The Hono HTTP context.
   */
  create: async (c: Context<AppContext>) => {
    const body = c.req.valid('json' as never) as any;
    const db = c.env.DB;
    const user = c.get('user')!;

    // SEO Fallbacks
    body.seo_data = body.seo_data || {};
    body.seo_data.meta_title = body.seo_data.meta_title || body.title;
    body.seo_data.meta_description = body.seo_data.meta_description || (body.excerpt ? body.excerpt.substring(0, 155) : undefined);

    try {
      const id = await ArticleCategoryService.create(db, body, user.id);
      
      purgeEntityCache(c, 'article-categories');
      purgeEntityCache(c, 'articles');

      return sendResponse(c, 201, 'CATEGORY_CREATED', 'Article category created successfully', { id });
    } catch (error: any) {
      if (error.message === 'CATEGORY_EXISTS') {
        return sendResponse(c, 400, 'CATEGORY_EXISTS', 'An article category with this slug already exists');
      }
      if (error.message === 'SORT_ORDER_EXISTS') {
        return sendResponse(c, 400, 'SORT_ORDER_EXISTS', 'This sort order is already taken by another article category');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to create article category', null, error.message);
    }
  },

  /**
   * Update an article category and clear relevant public cache lists.
   * 
   * @param c - The Hono HTTP context.
   */
  update: async (c: Context<AppContext>) => {
    const id = c.req.param('id') as string;
    const body = c.req.valid('json' as never) as any;
    const db = c.env.DB;
    const user = c.get('user')!;

    // SEO Fallbacks
    if (body.seo_data !== undefined || body.title !== undefined || body.excerpt !== undefined) {
      body.seo_data = body.seo_data || {};
      body.seo_data.meta_title = body.seo_data.meta_title || body.title;
      body.seo_data.meta_description = body.seo_data.meta_description || (body.excerpt ? body.excerpt.substring(0, 155) : undefined);
    }

    try {
      const existing = await ArticleCategoryService.getById(db, id);
      if (!existing) {
        return sendResponse(c, 404, 'CATEGORY_NOT_FOUND', 'Article category not found');
      }

      const updated = await ArticleCategoryService.update(db, id, body, user.id);
      if (!updated) {
        return sendResponse(c, 404, 'CATEGORY_NOT_FOUND', 'Article category not found');
      }

      purgeEntityCache(c, 'article-categories');
      purgeEntityCache(c, 'articles');
      if (body.slug && body.slug !== existing.slug) {
        purgeEntityCache(c, 'article-categories');
        purgeEntityCache(c, 'articles');
      }

      return sendResponse(c, 200, 'CATEGORY_UPDATED', 'Article category updated successfully');
    } catch (error: any) {
      if (error.message === 'CATEGORY_EXISTS') {
        return sendResponse(c, 400, 'CATEGORY_EXISTS', 'Slug is already taken by another article category');
      }
      if (error.message === 'SORT_ORDER_EXISTS') {
        return sendResponse(c, 400, 'SORT_ORDER_EXISTS', 'This sort order is already taken by another article category');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to update article category', null, error.message);
    }
  },

  /**
   * Delete a category and trigger deep cache purging.
   * 
   * @param c - The Hono HTTP context.
   */
  delete: async (c: Context<AppContext>) => {
    const id = c.req.param('id') as string;
    const db = c.env.DB;

    try {
      const existing = await ArticleCategoryService.getById(db, id);
      if (!existing) {
        return sendResponse(c, 404, 'CATEGORY_NOT_FOUND', 'Article category not found');
      }

      const deleted = await ArticleCategoryService.delete(db, id);
      if (!deleted) {
        return sendResponse(c, 404, 'CATEGORY_NOT_FOUND', 'Article category not found');
      }

      purgeEntityCache(c, 'article-categories');
      purgeEntityCache(c, 'articles');

      return sendResponse(c, 200, 'CATEGORY_DELETED', 'Article category deleted successfully');
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to delete article category', null, error.message);
    }
  }
};
