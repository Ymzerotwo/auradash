/**
 * ==========================================
 *        AuraDash Service Category Controller
 * ==========================================
 * 
 * Handles HTTP requests for Service Category operations.
 */

import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { ServiceCategoryService } from '../services/service-category.services';
import { purgeEntityCache } from '../utils/cache.utils';

// ==========================================
// AuraDash Category Controller
// ==========================================
// Orchestrates the HTTP request lifecycle for Category management.
// Bridges the gap between secure routing and core business logic, handling cache invalidation and standardizing responses.
export const ServiceCategoryController = {
  /**
   * Retrieves a paginated list of categories.
   * @param c - Hono Context
   * @security Extracts parameters safely from query string. No direct DB injection possible.
   * 
   * @param c - The Hono HTTP context.
   */
  getAll: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const search = c.req.query('search') || '';
    const page = c.req.query('page');
    const limit = c.req.query('limit');
    const status = c.req.query('status') || '';
    const user = c.get('user');

    try {
      const paginatedData = await ServiceCategoryService.getAll(db, search, page, limit, user, status);
      return sendResponse(c, 200, 'CATEGORIES_FETCHED', 'Categories retrieved successfully', {
        categories: paginatedData.data,
        pagination: paginatedData.pagination
      });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve categories', null, error.message);
    }
  },

  /**
   * Checks slug availability to prevent routing conflicts on the frontend.
   * @param c - Hono Context
   * 
   * @param c - The Hono HTTP context.
   */
  checkSlug: async (c: Context<AppContext>) => {
    const slug = c.req.query('slug') || '';
    const excludeId = c.req.query('exclude_id') || '';
    if (!slug) return sendResponse(c, 400, 'SLUG_REQUIRED', 'Slug parameter is required');

    try {
      const available = await ServiceCategoryService.checkSlug(c.env.DB, slug, excludeId);
      return sendResponse(c, 200, 'SLUG_CHECK', 'Slug availability checked', { slug, available });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to check slug', null, error.message);
    }
  },

  /**
   * Fetches a single category by its UUID.
   * @param c - Hono Context
   * 
   * @param c - The Hono HTTP context.
   */
  getById: async (c: Context<AppContext>) => {
    const id = c.req.param('id');
    const db = c.env.DB;
    const user = c.get('user');

    try {
      const category = await ServiceCategoryService.getById(db, id as string, user);
      if (!category) {
        return sendResponse(c, 404, 'CATEGORY_NOT_FOUND', 'Category not found');
      }
      return sendResponse(c, 200, 'CATEGORY_FETCHED', 'Category retrieved successfully', { category });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve category', null, error.message);
    }
  },

  /**
   * Creates a new category.
   * @CRITICAL Executes strict cache invalidation on public endpoints immediately after successful creation to ensure real-time consistency across the system.
   * 
   * @param c - The Hono HTTP context.
   */
  create: async (c: Context<AppContext>) => {
    const body = c.req.valid('json' as never) as any;
    const db = c.env.DB;
    const user = c.get('user')!;

    // SEO Fallbacks
    body.seo_data = body.seo_data || {};
    body.seo_data.meta_title = body.seo_data.meta_title || body.name;
    if (!body.seo_data.meta_description && body.meta_data) {
      const descField = body.meta_data.find((f: any) => f.id === 'description' || f.label?.toLowerCase() === 'description');
      if (descField && descField.data && typeof descField.data.text === 'string') {
        body.seo_data.meta_description = descField.data.text.substring(0, 155);
      }
    }

    try {
      const id = await ServiceCategoryService.create(db, body, user.id);
      
      purgeEntityCache(c, 'service-categories');
      purgeEntityCache(c, 'services');
      purgeEntityCache(c, 'booking');

      return sendResponse(c, 201, 'CATEGORY_CREATED', 'Category created successfully', { id });
    } catch (error: any) {
      if (error.message === 'CATEGORY_EXISTS') {
        return sendResponse(c, 400, 'CATEGORY_EXISTS', 'A category with this slug already exists');
      }
      if (error.message === 'SORT_ORDER_EXISTS') {
        return sendResponse(c, 400, 'SORT_ORDER_EXISTS', 'This sort order is already taken by another category');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to create category', null, error.message);
    }
  },

  /**
   * Updates an existing category.
   * @CRITICAL Purges both the aggregate list cache and the individual entity cache to prevent the serving of stale UI data.
   * 
   * @param c - The Hono HTTP context.
   */
  update: async (c: Context<AppContext>) => {
    const id = c.req.param('id');
    const body = c.req.valid('json' as never) as any;
    const db = c.env.DB;
    const user = c.get('user')!;

    // SEO Fallbacks
    if (body.seo_data !== undefined || body.name !== undefined || body.meta_data !== undefined) {
      body.seo_data = body.seo_data || {};
      body.seo_data.meta_title = body.seo_data.meta_title || body.name;
      if (!body.seo_data.meta_description && body.meta_data) {
        const descField = body.meta_data.find((f: any) => f.id === 'description' || f.label?.toLowerCase() === 'description');
        if (descField && descField.data && typeof descField.data.text === 'string') {
          body.seo_data.meta_description = descField.data.text.substring(0, 155);
        }
      }
    }

    try {
      const existing = await ServiceCategoryService.getById(db, id as string);
      if (!existing) {
        return sendResponse(c, 404, 'CATEGORY_NOT_FOUND', 'Category not found');
      }

      const updated = await ServiceCategoryService.update(db, id as string, body, user.id);
      if (!updated) {
        return sendResponse(c, 404, 'CATEGORY_NOT_FOUND', 'Category not found');
      }
      
      purgeEntityCache(c, 'service-categories');
      purgeEntityCache(c, 'services');
      purgeEntityCache(c, 'booking');
      if (body.slug && body.slug !== existing.slug) {
        purgeEntityCache(c, 'service-categories');
        purgeEntityCache(c, 'services');
        purgeEntityCache(c, 'booking');
      }

      return sendResponse(c, 200, 'CATEGORY_UPDATED', 'Category updated successfully');
    } catch (error: any) {
      if (error.message === 'CATEGORY_EXISTS') {
        return sendResponse(c, 400, 'CATEGORY_EXISTS', 'Slug is already taken by another category');
      }
      if (error.message === 'SORT_ORDER_EXISTS') {
        return sendResponse(c, 400, 'SORT_ORDER_EXISTS', 'This sort order is already taken by another category');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to update category', null, error.message);
    }
  },

  /**
   * Deletes a category by UUID.
   * @CRITICAL Data destruction requires an immediate sweep of public edge caches.
   * 
   * @param c - The Hono HTTP context.
   */
  delete: async (c: Context<AppContext>) => {
    const id = c.req.param('id');
    const db = c.env.DB;

    try {
      const existing = await ServiceCategoryService.getById(db, id as string);
      if (!existing) {
        return sendResponse(c, 404, 'CATEGORY_NOT_FOUND', 'Category not found');
      }

      const deleted = await ServiceCategoryService.delete(db, id as string);
      if (!deleted) {
        return sendResponse(c, 404, 'CATEGORY_NOT_FOUND', 'Category not found');
      }

      purgeEntityCache(c, 'service-categories');
      purgeEntityCache(c, 'services');
      purgeEntityCache(c, 'booking');

      return sendResponse(c, 200, 'CATEGORY_DELETED', 'Category deleted successfully');
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to delete category', null, error.message);
    }
  }
};
