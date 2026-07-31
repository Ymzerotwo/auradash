/**
 * ==========================================
 *        AuraDash Article Controller
 * ==========================================
 * 
 * Handles HTTP requests for Article operations.
 */

import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { ArticleService } from '../services/article.services';
import { purgeEntityCache } from '../utils/cache.utils';

// Controller handling CMS operations for Articles.
// Restricted to Admins and users with 'cms.articles' permissions.
export const ArticleController = {
  
  /**
   * Fetch a paginated list of all articles, optionally filtered by search query or category ID.
   * 
   * @param c - The Hono HTTP context.
   */
  getAll: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const search = c.req.query('search') || '';
    const categoryId = c.req.query('category_id');
    const status = c.req.query('status');
    const page = c.req.query('page');
    const limit = c.req.query('limit');
    const user = c.get('user');

    try {
      const paginatedData = await ArticleService.getAll(db, search, categoryId, status, page, limit, user);
      return sendResponse(c, 200, 'ARTICLES_FETCHED', 'Articles retrieved successfully', {
        articles: paginatedData.data,
        pagination: paginatedData.pagination
      });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve articles', null, error.message);
    }
  },



  /**
   * Fetch detailed information for a single article by its ID.
   * 
   * @param c - The Hono HTTP context.
   */
  getById: async (c: Context<AppContext>) => {
    const id = c.req.param('id') as string;
    const db = c.env.DB;
    const user = c.get('user');

    try {
      const article = await ArticleService.getById(db, id, user);
      if (!article) {
        return sendResponse(c, 404, 'ARTICLE_NOT_FOUND', 'Article not found');
      }
      return sendResponse(c, 200, 'ARTICLE_FETCHED', 'Article retrieved successfully', { article });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve article', null, error.message);
    }
  },

  /**
   * Create a new article. Clears the public articles cache upon success.
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
      const id = await ArticleService.create(db, body, user.id);

      // Purge the general articles list cache so the new article is immediately visible to public users.
      purgeEntityCache(c, 'articles');
      purgeEntityCache(c, 'article-categories');

      return sendResponse(c, 201, 'ARTICLE_CREATED', 'Article created successfully', { id });
    } catch (error: any) {
      if (error.message === 'ARTICLE_EXISTS') {
        return sendResponse(c, 400, 'ARTICLE_EXISTS', 'An article with this slug already exists');
      }
      if (error.message === 'CATEGORY_NOT_FOUND') {
        return sendResponse(c, 400, 'CATEGORY_NOT_FOUND', 'The specified category_id does not exist');
      }
      if (error.message === 'SORT_ORDER_EXISTS') {
        return sendResponse(c, 400, 'SORT_ORDER_EXISTS', 'This sort order is already taken by another article');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to create article', null, error.message);
    }
  },

  /**
   * Update an existing article. Identifies slug changes and purges cache appropriately.
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
      // Fetch the old slug before updating to ensure the cache for the specific old URL is purged correctly.
      const existing = await ArticleService.getById(db, id);
      if (!existing) {
        return sendResponse(c, 404, 'ARTICLE_NOT_FOUND', 'Article not found');
      }

      await ArticleService.update(db, id, body, user.id);

      // Purge the cache for the old slug. If the slug was changed during this update, purge the new slug's cache as well.
      purgeEntityCache(c, 'articles');
      purgeEntityCache(c, 'article-categories');
      if (body.slug && body.slug !== existing.slug) {
        purgeEntityCache(c, 'articles');
        purgeEntityCache(c, 'article-categories');
      }

      return sendResponse(c, 200, 'ARTICLE_UPDATED', 'Article updated successfully');
    } catch (error: any) {
      if (error.message === 'ARTICLE_EXISTS') {
        return sendResponse(c, 400, 'ARTICLE_EXISTS', 'Slug is already taken by another article');
      }
      if (error.message === 'CATEGORY_NOT_FOUND') {
        return sendResponse(c, 400, 'CATEGORY_NOT_FOUND', 'The specified category_id does not exist');
      }
      if (error.message === 'SORT_ORDER_EXISTS') {
        return sendResponse(c, 400, 'SORT_ORDER_EXISTS', 'This sort order is already taken by another article');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to update article', null, error.message);
    }
  },

  /**
   * Delete an article. Fetches the slug first to clear the individual page cache.
   * 
   * @param c - The Hono HTTP context.
   */
  delete: async (c: Context<AppContext>) => {
    const id = c.req.param('id') as string;
    const db = c.env.DB;

    try {
      // Retrieve the slug before deletion to effectively purge the cached edge page for this article.
      const existing = await ArticleService.getById(db, id);
      if (!existing) {
        return sendResponse(c, 404, 'ARTICLE_NOT_FOUND', 'Article not found');
      }

      await ArticleService.delete(db, id);

      purgeEntityCache(c, 'articles');
      purgeEntityCache(c, 'article-categories');

      return sendResponse(c, 200, 'ARTICLE_DELETED', 'Article deleted successfully');
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to delete article', null, error.message);
    }
  },

  /**
   * Fetch a list of active users eligible to be selected as the 'Author/Publisher' of an article.
   * 
   * @param c - The Hono HTTP context.
   */
  getPublishers: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    try {
      const publishers = await ArticleService.getPublishers(db);
      return sendResponse(c, 200, 'PUBLISHERS_FETCHED', 'Publishers retrieved successfully', { publishers });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve publishers', null, error.message);
    }
  }
};
