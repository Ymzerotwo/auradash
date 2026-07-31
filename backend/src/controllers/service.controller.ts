/**
 * ==========================================
 *        AuraDash Service Controller
 * ==========================================
 * 
 * Handles HTTP requests for Service operations.
 */

import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { ServiceService } from '../services/service.services';
import { purgeEntityCache } from '../utils/cache.utils';

export const ServiceController = {
  /**
   * Handles the Get All operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getAll: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const search = c.req.query('search') || '';
    const categoryId = c.req.query('category_id');
    const page = c.req.query('page');
    const limit = c.req.query('limit');
    const status = c.req.query('status') || '';
    const user = c.get('user');

    try {
      const paginatedData = await ServiceService.getAll(db, search, categoryId, page, limit, user, status);
      return sendResponse(c, 200, 'SERVICES_FETCHED', 'Services retrieved successfully', {
        services: paginatedData.data,
        pagination: paginatedData.pagination
      });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve services', null, error.message);
    }
  },

  /**
   * Handles the Check Slug operation.
   * 
   * @param c - The Hono HTTP context.
   */
  checkSlug: async (c: Context<AppContext>) => {
    const slug = c.req.query('slug') || '';
    const excludeId = c.req.query('exclude_id') || '';
    if (!slug) return sendResponse(c, 400, 'SLUG_REQUIRED', 'Slug parameter is required');

    try {
      const available = await ServiceService.checkSlug(c.env.DB, slug, excludeId);
      return sendResponse(c, 200, 'SLUG_CHECK', 'Slug availability checked', { slug, available });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to check slug', null, error.message);
    }
  },

  /**
   * Handles the Get By Id operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getById: async (c: Context<AppContext>) => {
    const id = c.req.param('id') as string;
    const db = c.env.DB;
    const user = c.get('user');

    try {
      const service = await ServiceService.getById(db, id, user);
      if (!service) {
        return sendResponse(c, 404, 'SERVICE_NOT_FOUND', 'Service not found');
      }
      return sendResponse(c, 200, 'SERVICE_FETCHED', 'Service retrieved successfully', { service });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve service', null, error.message);
    }
  },

  /**
   * Handles the Create operation.
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
      const result = await ServiceService.create(db, body, user.id);
      
      purgeEntityCache(c, 'services');
      purgeEntityCache(c, 'service-categories');
      purgeEntityCache(c, 'booking');

      return sendResponse(c, 201, 'SERVICE_CREATED', 'Service created successfully', { id: result });
    } catch (error: any) {
      if (error.message === 'SERVICE_EXISTS') {
        return sendResponse(c, 400, 'SERVICE_EXISTS', 'A service with this slug already exists');
      }
      if (error.message === 'CATEGORY_NOT_FOUND') {
        return sendResponse(c, 400, 'CATEGORY_NOT_FOUND', 'The specified service_category_id does not exist');
      }
      if (error.message === 'SORT_ORDER_EXISTS') {
        return sendResponse(c, 400, 'SORT_ORDER_EXISTS', 'This sort order is already taken by another service');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to create service', null, error.message);
    }
  },

  /**
   * Handles the Update operation.
   * 
   * @param c - The Hono HTTP context.
   */
  update: async (c: Context<AppContext>) => {
    const id = c.req.param('id') as string;
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
      const existing = await ServiceService.getById(db, id);
      if (!existing) {
        return sendResponse(c, 404, 'SERVICE_NOT_FOUND', 'Service not found');
      }

      const updated = await ServiceService.update(db, id, body, user.id);
      if (!updated) {
        return sendResponse(c, 404, 'SERVICE_NOT_FOUND', 'Service not found');
      }

      purgeEntityCache(c, 'services');
      purgeEntityCache(c, 'service-categories');
      purgeEntityCache(c, 'booking');
      if (body.slug && body.slug !== existing.slug) {
        purgeEntityCache(c, 'services');
        purgeEntityCache(c, 'service-categories');
        purgeEntityCache(c, 'booking');
      }

      return sendResponse(c, 200, 'SERVICE_UPDATED', 'Service updated successfully');
    } catch (error: any) {
      if (error.message === 'SERVICE_EXISTS') {
        return sendResponse(c, 400, 'SERVICE_EXISTS', 'Slug is already taken by another service');
      }
      if (error.message === 'CATEGORY_NOT_FOUND') {
        return sendResponse(c, 400, 'CATEGORY_NOT_FOUND', 'The specified service_category_id does not exist');
      }
      if (error.message === 'SORT_ORDER_EXISTS') {
        return sendResponse(c, 400, 'SORT_ORDER_EXISTS', 'This sort order is already taken by another service');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to update service', null, error.message);
    }
  },

  /**
   * Handles the Delete operation.
   * 
   * @param c - The Hono HTTP context.
   */
  delete: async (c: Context<AppContext>) => {
    const id = c.req.param('id') as string;
    const db = c.env.DB;

    try {
      const existing = await ServiceService.getById(db, id);
      if (!existing) {
        return sendResponse(c, 404, 'SERVICE_NOT_FOUND', 'Service not found');
      }

      const deleted = await ServiceService.delete(db, id);
      if (!deleted) {
        return sendResponse(c, 404, 'SERVICE_NOT_FOUND', 'Service not found');
      }

      purgeEntityCache(c, 'services');
      purgeEntityCache(c, 'service-categories');
      purgeEntityCache(c, 'booking');

      return sendResponse(c, 200, 'SERVICE_DELETED', 'Service deleted successfully');
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to delete service', null, error.message);
    }
  }
};
