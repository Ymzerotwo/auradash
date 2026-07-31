/**
 * ==========================================
 *        AuraDash Customer Routes
 * ==========================================
 * 
 * Defines the routing endpoints for Customer operations.
 */

import { Hono } from 'hono';
import { AppContext } from '../types';
import { CustomerController } from '../controllers/customer.controller';
import { requirePermission } from '../middleware/permission';

const customerRoutes = new Hono<AppContext>();

// Require 'customers' permission for all routes within this file
customerRoutes.use('*', requirePermission(['customers']));

/**
 * GET /api/customers
 * Lists all customers.
 */
customerRoutes.get('/', CustomerController.getCustomers);

/**
 * GET /api/customers/stats
 * Retrieves customer statistics.
 */
customerRoutes.get('/stats', CustomerController.getStats);

/**
 * GET /api/customers/:id
 * Retrieves details of a specific customer.
 */
customerRoutes.get('/:id', CustomerController.getCustomerById);

/**
 * POST /api/customers
 * Creates a new customer.
 */
customerRoutes.post('/', CustomerController.createCustomer);

/**
 * PUT /api/customers/:id
 * Updates an existing customer.
 */
customerRoutes.put('/:id', CustomerController.updateCustomer);

/**
 * DELETE /api/customers/:id
 * Deletes a specific customer.
 */
customerRoutes.delete('/:id', CustomerController.deleteCustomer);

/**
 * PUT /api/customers/:id/spam
 * Marks a customer as spam.
 */
customerRoutes.put('/:id/spam', CustomerController.markAsSpam);

/**
 * PUT /api/customers/:id/unspam
 * Removes a customer from the spam list.
 */
customerRoutes.put('/:id/unspam', CustomerController.removeFromSpam);

export default customerRoutes;
