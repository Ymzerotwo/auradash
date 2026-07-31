/**
 * ==========================================
 *        AuraDash Customer Controller
 * ==========================================
 * 
 * Handles HTTP requests for Customer operations.
 */

import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { CustomerService } from '../services/customer.services';
import { CreateCustomerSchema, UpdateCustomerSchema, SpamCustomerSchema } from '../validators/customer.validators';

export const CustomerController = {
  /**
   * Handles the Get Customers operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getCustomers: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const user = c.get('user')!;
    const page = Number(c.req.query('page')) || 1;
    const limit = Number(c.req.query('limit')) || 10;
    const search = c.req.query('search') || undefined;
    const isSpam = c.req.query('status') === 'spam'; // true if status=spam, else false

    try {
      const result = await CustomerService.getCustomers(db, user.role, page, limit, search, isSpam);
      return sendResponse(c, 200, 'CUSTOMERS_FETCHED', 'Customers retrieved successfully', result);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve customers', null, error.message);
    }
  },

  /**
   * Handles the Get Stats operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getStats: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    try {
      const stats = await CustomerService.getCustomerStats(db);
      return sendResponse(c, 200, 'STATS_FETCHED', 'Stats retrieved successfully', stats);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch customer stats', null, error.message);
    }
  },

  /**
   * Handles the Get Customer By Id operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getCustomerById: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const id = c.req.param('id') as string;
    const user = c.get('user')!;
    
    try {
      const customer = await CustomerService.getCustomerById(db, id, user.role);
      return sendResponse(c, 200, 'CUSTOMER_FETCHED', 'Customer retrieved successfully', customer);
    } catch (error: any) {
      if (error.message === 'CUSTOMER_NOT_FOUND') {
        return sendResponse(c, 404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve customer', null, error.message);
    }
  },

  /**
   * Handles the Create Customer operation.
   * 
   * @param c - The Hono HTTP context.
   */
  createCustomer: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const user = c.get('user');
    try {
      const body = await c.req.json();
      const validation = CreateCustomerSchema.safeParse(body);
      
      if (!validation.success) {
        return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid data provided', validation.error.format());
      }

      const result = await CustomerService.createCustomer(db, validation.data, user?.id);
      return sendResponse(c, 201, 'CUSTOMER_CREATED', 'Customer created successfully', result);
    } catch (error: any) {
      if (error.message === 'PHONE_ALREADY_EXISTS') {
        return sendResponse(c, 409, 'PHONE_ALREADY_EXISTS', 'Phone number is already registered to another customer');
      }
      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        return sendResponse(c, 409, 'EMAIL_ALREADY_EXISTS', 'Email address is already registered to another customer');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to create customer', null, error.message);
    }
  },

  /**
   * Handles the Update Customer operation.
   * 
   * @param c - The Hono HTTP context.
   */
  updateCustomer: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const id = c.req.param('id') as string;
    const user = c.get('user');
    
    try {
      const body = await c.req.json();
      const validation = UpdateCustomerSchema.safeParse(body);
      
      if (!validation.success) {
        return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid data provided', validation.error.format());
      }

      await CustomerService.updateCustomer(db, id, validation.data, user?.id);
      return sendResponse(c, 200, 'CUSTOMER_UPDATED', 'Customer updated successfully');
    } catch (error: any) {
      if (error.message === 'CUSTOMER_NOT_FOUND') {
        return sendResponse(c, 404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      }
      if (error.message === 'PHONE_ALREADY_EXISTS') {
        return sendResponse(c, 409, 'PHONE_ALREADY_EXISTS', 'Phone number is already registered to another customer');
      }
      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        return sendResponse(c, 409, 'EMAIL_ALREADY_EXISTS', 'Email address is already registered to another customer');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to update customer', null, error.message);
    }
  },

  /**
   * Handles the Delete Customer operation.
   * 
   * @param c - The Hono HTTP context.
   */
  deleteCustomer: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const id = c.req.param('id') as string;
    const user = c.get('user')!;

    if (user.role !== 'Admin') {
      return sendResponse(c, 403, 'FORBIDDEN', 'Only administrators can delete customers');
    }
    
    try {
      await CustomerService.deleteCustomer(db, id);
      return sendResponse(c, 200, 'CUSTOMER_DELETED', 'Customer deleted successfully');
    } catch (error: any) {
      if (error.message === 'CUSTOMER_NOT_FOUND') {
        return sendResponse(c, 404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to delete customer', null, error.message);
    }
  },

  /**
   * Handles the Mark As Spam operation.
   * 
   * @param c - The Hono HTTP context.
   */
  markAsSpam: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const k1 = c.env.K1 || (c.env as any).auradash_kv || null;
    const id = c.req.param('id') as string;
    const user = c.get('user')!;

    try {
      const body = await c.req.json();
      const validation = SpamCustomerSchema.safeParse(body);
      
      if (!validation.success) {
        return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid data provided', validation.error.format());
      }

      await CustomerService.markAsSpam(db, k1, id, user.id, validation.data.reason);
      return sendResponse(c, 200, 'CUSTOMER_SPAMMED', 'Customer marked as spam successfully');
    } catch (error: any) {
      if (error.message === 'CUSTOMER_NOT_FOUND') {
        return sendResponse(c, 404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to mark customer as spam', null, error.message);
    }
  },

  /**
   * Handles the Remove From Spam operation.
   * 
   * @param c - The Hono HTTP context.
   */
  removeFromSpam: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const k1 = c.env.K1 || (c.env as any).auradash_kv || null;
    const id = c.req.param('id') as string;
    const user = c.get('user')!;

    if (user.role !== 'Admin') {
      return sendResponse(c, 403, 'FORBIDDEN', 'Only administrators can remove a customer from spam');
    }
    
    try {
      await CustomerService.removeFromSpam(db, k1, id);
      return sendResponse(c, 200, 'CUSTOMER_UNSPAMMED', 'Customer removed from spam successfully');
    } catch (error: any) {
      if (error.message === 'CUSTOMER_NOT_FOUND') {
        return sendResponse(c, 404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to remove customer from spam', null, error.message);
    }
  }
};
