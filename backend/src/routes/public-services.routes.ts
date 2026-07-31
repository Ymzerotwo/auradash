/**
 * ==========================================
 *        AuraDash Public Services Routes
 * ==========================================
 * 
 * Defines public routing endpoints for Services operations.
 */

import { Hono } from 'hono';
import { PublicServicesController } from '../controllers/public-services.controller';
import { AppContext } from '../types';

const publicServicesRoutes = new Hono<AppContext>();

/**
 * GET /api/public/booking/service-categories
 * Lists service categories formatted for booking dropdowns.
 */
publicServicesRoutes.get('/booking/service-categories', PublicServicesController.getBookingCategories);

/**
 * GET /api/public/booking/services
 * Lists all services formatted for booking selection.
 */
publicServicesRoutes.get('/booking/services', PublicServicesController.getBookingServices);

/**
 * GET /api/public/booking/service-categories/:slug/services
 * Retrieves booking-optimized services under a specific category.
 */
publicServicesRoutes.get('/booking/service-categories/:slug/services', PublicServicesController.getBookingCategoryServices);

/**
 * GET /api/public/service-categories
 * Lists all public service categories.
 */
publicServicesRoutes.get('/service-categories', PublicServicesController.getCategories);

/**
 * GET /api/public/service-categories/count
 * Retrieves the total count of active service categories.
 */
publicServicesRoutes.get('/service-categories/count', PublicServicesController.getCategoriesCount);

/**
 * GET /api/public/service-categories/:slug
 * Retrieves details of a service category by its slug.
 */
publicServicesRoutes.get('/service-categories/:slug', PublicServicesController.getCategoryBySlug);

/**
 * GET /api/public/service-categories/:slug/services/count
 * Retrieves count of services in a category.
 */
publicServicesRoutes.get('/service-categories/:slug/services/count', PublicServicesController.getCategoryServicesCount);

/**
 * GET /api/public/service-categories/:slug/services
 * Lists public services belonging to a specific category.
 */
publicServicesRoutes.get('/service-categories/:slug/services', PublicServicesController.getServicesByCategorySlug);

/**
 * GET /api/public/services/all
 * Retrieves all services (including category-linked ones).
 */
publicServicesRoutes.get('/services/all', PublicServicesController.getAllServicesIncludingLinked);

/**
 * GET /api/public/services
 * Lists all active public services.
 */
publicServicesRoutes.get('/services', PublicServicesController.getAllServices);

/**
 * GET /api/public/services/count
 * Retrieves the total count of active public services.
 */
publicServicesRoutes.get('/services/count', PublicServicesController.getServicesCount);

/**
 * GET /api/public/services/count/all
 * Retrieves the count of all services.
 */
publicServicesRoutes.get('/services/count/all', PublicServicesController.getAllServicesCount);

/**
 * GET /api/public/services/:slug
 * Retrieves details of a specific service by slug.
 */
publicServicesRoutes.get('/services/:slug', PublicServicesController.getServiceBySlug);

export default publicServicesRoutes;
