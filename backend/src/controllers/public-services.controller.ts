/**
 * ==========================================
 *        AuraDash Public Services Controller
 * ==========================================
 * 
 * Handles HTTP requests for Public Services operations.
 */

import { logger } from '../utils/logger';
import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { PublicServicesService } from '../services/public-services.services';

// Note: Strict pagination validation was removed because the new Atomic Overwrite Meta-Cache architecture allows fully flexible limits and pagination without risk of cache poisoning.
// Public controller handling endpoints for guest users.
// Manages all requests coming from the public interface without requiring authentication.
export const PublicServicesController = {
  
  /**
   * Fetch active booking categories to populate dropdowns in the booking interface.
   * 
   * @param c - The Hono HTTP context.
   */
  getBookingCategories: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    try {
      const data = await PublicServicesService.getBookingCategories(db);
      return sendResponse(c, 200, 'BOOKING_CATEGORIES_FETCHED', 'Booking categories fetched successfully', data);
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error fetching booking categories:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch booking categories');
    }
  },

  /**
   * Fetch all active booking services (both standalone and linked to categories) for the interface.
   * 
   * @param c - The Hono HTTP context.
   */
  getBookingServices: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    try {
      const data = await PublicServicesService.getBookingServices(db);
      return sendResponse(c, 200, 'BOOKING_SERVICES_FETCHED', 'Booking services fetched successfully', data);
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error fetching booking services:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch booking services');
    }
  },

  /**
   * Fetch services belonging to a specific category based on its slug (optimized for the booking system).
   * 
   * @param c - The Hono HTTP context.
   */
  getBookingCategoryServices: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    try {
      const data = await PublicServicesService.getBookingCategoryServices(db, c.req.param('slug')!);
      return sendResponse(c, 200, 'BOOKING_CATEGORY_SERVICES_FETCHED', 'Booking category services fetched successfully', data);
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error fetching booking category services:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch booking category services');
    }
  },

  /**
   * Fetch a paginated list of all active categories.
   * 
   * @param c - The Hono HTTP context.
   */
  getCategories: async (c: Context<AppContext>) => {
    try {

      const db = c.env.DB;
      const data = await PublicServicesService.getCategories(db, c.req.query('page'), c.req.query('limit'));
      return sendResponse(c, 200, 'CATEGORIES_FETCHED', 'Categories retrieved successfully', data);
    } catch (error: any) {
      if (error.status === 400) return sendResponse(c, error.status, error.code, error.message);
      logger.error(c.get('requestId') || 'unknown', 'Error fetching categories:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve categories');
    }
  },

  /**
   * Fetch details of a single active category using its slug.
   * 
   * @param c - The Hono HTTP context.
   */
  getCategoryBySlug: async (c: Context<AppContext>) => {
    const slug = c.req.param('slug');
    const db = c.env.DB;
    try {
      const category = await PublicServicesService.getCategoryBySlug(db, slug as string);
      if (!category) return sendResponse(c, 404, 'CATEGORY_NOT_FOUND', 'Category not found or inactive');
      return sendResponse(c, 200, 'CATEGORY_FETCHED', 'Category retrieved successfully', { category });
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error fetching category:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve category');
    }
  },

  /**
   * Fetch a paginated list of services linked to a specific active category using its slug.
   * 
   * @param c - The Hono HTTP context.
   */
  getServicesByCategorySlug: async (c: Context<AppContext>) => {
    const slug = c.req.param('slug');
    try {

      const db = c.env.DB;
      const data = await PublicServicesService.getServicesByCategorySlug(db, slug as string, c.req.query('page'), c.req.query('limit'));
      if (!data) return sendResponse(c, 404, 'CATEGORY_NOT_FOUND', 'Category not found or inactive');
      return sendResponse(c, 200, 'CATEGORY_SERVICES_FETCHED', 'Services for category retrieved successfully', data);
    } catch (error: any) {
      if (error.status === 400) return sendResponse(c, error.status, error.code, error.message);
      logger.error(c.get('requestId') || 'unknown', 'Error fetching services by category:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve services');
    }
  },

  /**
   * Fetch a paginated list of all active services in the system. Ensures parent categories (if any) are also active.
   * 
   * @param c - The Hono HTTP context.
   */
  getAllServices: async (c: Context<AppContext>) => {
    try {

      const db = c.env.DB;
      const data = await PublicServicesService.getAllServices(db, c.req.query('page'), c.req.query('limit'));
      return sendResponse(c, 200, 'ALL_SERVICES_FETCHED', 'All services retrieved successfully', data);
    } catch (error: any) {
      if (error.status === 400) return sendResponse(c, error.status, error.code, error.message);
      logger.error(c.get('requestId') || 'unknown', 'Error fetching all services:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve all services');
    }
  },



  /**
   * Fetch ALL services globally (both linked and unlinked).
   * 
   * @param c - The Hono HTTP context.
   */
  getAllServicesIncludingLinked: async (c: Context<AppContext>) => {
    try {

      const db = c.env.DB;
      const data = await PublicServicesService.getAllServicesIncludingLinked(db, c.req.query('page'), c.req.query('limit'));
      return sendResponse(c, 200, 'ALL_SERVICES_FETCHED', 'All services retrieved successfully', data);
    } catch (error: any) {
      if (error.status === 400) return sendResponse(c, error.status, error.code, error.message);
      logger.error(c.get('requestId') || 'unknown', 'Error fetching all services including linked:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve all services');
    }
  },

  /**
   * Fetch a single active service by its slug. (Hidden if its parent category is deactivated).
   * 
   * @param c - The Hono HTTP context.
   */
  getServiceBySlug: async (c: Context<AppContext>) => {
    const slug = c.req.param('slug');
    const db = c.env.DB;
    try {
      const service = await PublicServicesService.getServiceBySlug(db, slug as string);
      if (!service) return sendResponse(c, 404, 'SERVICE_NOT_FOUND', 'Service not found or inactive');
      return sendResponse(c, 200, 'SERVICE_FETCHED', 'Service retrieved successfully', { service });
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error fetching service:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve service');
    }
  },



  /**
   * Count the total number of active categories (typically used for frontend statistics).
   * 
   * @param c - The Hono HTTP context.
   */
  getCategoriesCount: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    try {
      const count = await PublicServicesService.getCategoriesCount(db);
      return sendResponse(c, 200, 'CATEGORIES_COUNT', 'Categories count retrieved', { count });
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error fetching categories count:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve categories count');
    }
  },

  /**
   * Count the total number of unlinked active services. If a category slug is provided, counts only services in that category.
   * 
   * @param c - The Hono HTTP context.
   */
  getServicesCount: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    try {
      const data = await PublicServicesService.getServicesCount(db, c.req.query('category'));
      if (!data) return sendResponse(c, 404, 'CATEGORY_NOT_FOUND', 'Category not found or inactive');
      return sendResponse(c, 200, 'SERVICES_COUNT', 'Services count retrieved', data);
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error fetching services count:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve services count');
    }
  },

  /**
   * Count ALL active services globally (linked and unlinked).
   * 
   * @param c - The Hono HTTP context.
   */
  getAllServicesCount: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    try {
      const data = await PublicServicesService.getAllServicesCount(db);
      return sendResponse(c, 200, 'ALL_SERVICES_COUNT', 'All services count retrieved', data);
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error fetching all services count:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve all services count');
    }
  },

  /**
   * Helper to count active services for a specific category based on the slug parameter in the request path.
   * 
   * @param c - The Hono HTTP context.
   */
  getCategoryServicesCount: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const slug = c.req.param('slug');
    try {
      const data = await PublicServicesService.getCategoryServicesCount(db, slug as string);
      if (!data) return sendResponse(c, 404, 'CATEGORY_NOT_FOUND', 'Category not found or inactive');
      return sendResponse(c, 200, 'CATEGORY_SERVICES_COUNT', 'Services count for category retrieved', data);
    } catch (error: any) {
      logger.error(c.get('requestId') || 'unknown', 'Error fetching category services count:', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve category services count');
    }
  }
};
