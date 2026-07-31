/**
 * ==========================================
 *        AuraDash Public Articles Controller
 * ==========================================
 * 
 * Handles HTTP requests for Public Articles operations.
 */

import { logger } from '../utils/logger';
import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { getPaginationOptions } from '../utils/pagination';
import { PublicArticlesService } from '../services/public-articles.services';

export const PublicArticlesController = {
  /**
   * Handles the Get Articles operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getArticles: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const page = c.req.query('page');
    const limit = c.req.query('limit');
    const categoryId = c.req.query('article_category_id');

    const { page: pageNum, limit: limitNum } = getPaginationOptions(page, limit, 12);
    const offset = (pageNum - 1) * limitNum;

    try {
      const { articles, total } = await PublicArticlesService.getArticles(db, categoryId || null, limitNum, offset);
      return sendResponse(c, 200, 'ARTICLES_FETCHED', 'Articles retrieved successfully', {
        articles,
        pagination: {
          total,
          page: Number(page || 1),
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error fetching public articles:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve articles');
    }
  },

  /**
   * Handles the Get All Articles Including Linked operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getAllArticlesIncludingLinked: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const page = c.req.query('page');
    const limit = c.req.query('limit');

    const { page: pageNum, limit: limitNum } = getPaginationOptions(page, limit, 12);
    const offset = (pageNum - 1) * limitNum;

    try {
      const { articles, total } = await PublicArticlesService.getAllArticlesIncludingLinked(db, limitNum, offset);
      return sendResponse(c, 200, 'ALL_ARTICLES_FETCHED', 'All articles retrieved successfully', {
        articles,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      logger.error(c.get('requestId') || 'unknown', 'Error fetching all articles:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve all articles');
    }
  },

  /**
   * Handles the Get Article By Slug operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getArticleBySlug: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const slug = c.req.param('slug') as string;

    try {
      const article = await PublicArticlesService.getArticleBySlug(db, slug);
      if (!article) return sendResponse(c, 404, 'ARTICLE_NOT_FOUND', 'Article not found or not published');
      return sendResponse(c, 200, 'ARTICLE_FETCHED', 'Article retrieved successfully', { article });
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error fetching article:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve article');
    }
  },

  /**
   * Handles the Get Article Comments operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getArticleComments: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const slug = c.req.param('slug') as string;
    const page = c.req.query('page');
    const limit = c.req.query('limit');

    const { page: pageNum, limit: limitNum } = getPaginationOptions(page, limit, 20);
    const offset = (pageNum - 1) * limitNum;

    try {
      const article = await PublicArticlesService.getArticleIdBySlug(db, slug);
      if (!article) return sendResponse(c, 404, 'ARTICLE_NOT_FOUND', 'Article not found or inactive');

      const { comments, total } = await PublicArticlesService.getArticleComments(db, article.id, limitNum, offset);

      return sendResponse(c, 200, 'ARTICLE_COMMENTS_FETCHED', 'Comments retrieved successfully', {
        comments,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error fetching comments:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve comments');
    }
  },

  /**
   * Handles the Get Article Categories operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getArticleCategories: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const page = c.req.query('page');
    const limit = c.req.query('limit');

    const { page: pageNum, limit: limitNum } = getPaginationOptions(page, limit, 20);
    const offset = (pageNum - 1) * limitNum;

    try {
      const { categories, total } = await PublicArticlesService.getArticleCategories(db, limitNum, offset);
      return sendResponse(c, 200, 'ARTICLE_CATEGORIES_FETCHED', 'Article categories retrieved successfully', {
        categories,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error fetching article categories:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve article categories');
    }
  },

  /**
   * Handles the Get Articles Count operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getArticlesCount: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    try {
      const count = await PublicArticlesService.getArticlesCount(db);
      return sendResponse(c, 200, 'ARTICLES_COUNT', 'Articles count retrieved', { count });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve articles count');
    }
  },

  /**
   * Handles the Get All Articles Count operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getAllArticlesCount: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    try {
      const count = await PublicArticlesService.getAllArticlesCount(db);
      return sendResponse(c, 200, 'ALL_ARTICLES_COUNT', 'All articles count retrieved', { count });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve all articles count');
    }
  },

  /**
   * Handles the Get Article Categories Count operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getArticleCategoriesCount: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    try {
      const count = await PublicArticlesService.getArticleCategoriesCount(db);
      return sendResponse(c, 200, 'ARTICLE_CATEGORIES_COUNT', 'Article categories count retrieved', { count });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve article categories count');
    }
  },

  /**
   * Handles the Get Category Articles Count operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getCategoryArticlesCount: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const slug = c.req.param('slug') as string;
    try {
      const data = await PublicArticlesService.getCategoryArticlesCount(db, slug);
      if (!data) return sendResponse(c, 404, 'CATEGORY_NOT_FOUND', 'Category not found or inactive');
      return sendResponse(c, 200, 'CATEGORY_ARTICLES_COUNT', 'Articles count for category retrieved', data);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve category articles count');
    }
  },

  /**
   * Handles the Get Article Category By Slug operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getArticleCategoryBySlug: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const slug = c.req.param('slug') as string;
    try {
      const category = await PublicArticlesService.getArticleCategoryBySlug(db, slug);
      if (!category) return sendResponse(c, 404, 'CATEGORY_NOT_FOUND', 'Category not found or inactive');
      return sendResponse(c, 200, 'CATEGORY_FETCHED', 'Category details retrieved', category);
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error fetching category:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve category');
    }
  },

  /**
   * Handles the Get Articles By Category operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getArticlesByCategory: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const slug = c.req.param('slug') as string;
    const page = c.req.query('page');
    const limit = c.req.query('limit');

    const { page: pageNum, limit: limitNum } = getPaginationOptions(page, limit, 12);
    const offset = (pageNum - 1) * limitNum;

    try {
      const data = await PublicArticlesService.getArticlesByCategory(db, slug, limitNum, offset);
      if (!data) return sendResponse(c, 404, 'CATEGORY_NOT_FOUND', 'Category not found or inactive');

      return sendResponse(c, 200, 'CATEGORY_ARTICLES_FETCHED', 'Articles retrieved successfully', {
        articles: data.articles,
        category: {
          id: data.category.id,
          title: data.category.title,
          slug: data.category.slug,
          excerpt: data.category.excerpt,
          preview_image_url: data.category.preview_image_url,
          meta_data: data.category.meta_data,
          seo_data: data.category.seo_data
        },
        pagination: {
          total: data.total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(data.total / limitNum)
        }
      });
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error fetching articles by category:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve articles');
    }
  }
};
