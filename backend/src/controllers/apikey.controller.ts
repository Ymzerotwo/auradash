/**
 * ==========================================
 *        AuraDash Apikey Controller
 * ==========================================
 * 
 * Handles HTTP requests for Apikey operations.
 */

import { Context } from 'hono';
import { AppContext } from '../types';
import { sendResponse } from '../utils/response';
import { ApiKeyService } from '../services/apikey.services';
import { CreateApiKeyDTO } from '../validators/apikey.validators';

export const ApiKeyController = {
  /**
   * Creates a new API Key (Production or Test).
   * CRITICAL NOTE: The Master Secret is mathematically required to mint the HMAC signature.
   * Ensures the secret exists before proceeding to the service layer.
   * @param c - The Hono request context.
   * 
   * @param c - The Hono HTTP context.
   */
  createApiKey: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const user = c.get('user');
    const secret = c.env.AURADASH_MASTER_SECRET;

    if (!secret) {
      return sendResponse(
        c, 
        500, 
        'MISSING_MASTER_SECRET', 
        'CRITICAL: The AURADASH_MASTER_SECRET is missing from your environment variables (.dev.vars). This secret is mathematically required to generate secure API keys.'
      );
    }

    // The validated data contains optional 'type' and 'expiresInHours' fields
    // which default to 'production' and '24' respectively.
    let data = c.req.valid('json' as never) as CreateApiKeyDTO;

    try {
      const result = await ApiKeyService.createApiKey(db, data, secret, user?.id || null);
      return sendResponse(c, 201, 'API_KEY_CREATED', 'API Key created successfully. Store it securely; you will not see it again.', result);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to generate API Key.');
    }
  },

  /**
   * Retrieves a paginated list of all API Keys.
   * @param c - The Hono request context.
   * 
   * @param c - The Hono HTTP context.
   */
  listApiKeys: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const user = c.get('user');

    try {
      const results = await ApiKeyService.listApiKeys(db, c.req.query('page'), c.req.query('limit'));
      
      if (user?.role?.toLowerCase() !== 'admin' && results.data) {
        results.data = results.data.map((key: any) => {
          const { created_by, created_by_name, created_at, ...rest } = key;
          return rest;
        });
      }

      return sendResponse(c, 200, 'API_KEYS_FETCHED', 'API Keys retrieved successfully.', results);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch API Keys.');
    }
  },

  /**
   * Deletes (revokes) a specific API Key by its ID.
   * @param c - The Hono request context.
   * 
   * @param c - The Hono HTTP context.
   */
  deleteApiKey: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const id = c.req.param('id') as string;

    try {
      await ApiKeyService.deleteApiKey(db, id);
      return sendResponse(c, 200, 'API_KEY_DELETED', 'API Key removed from dashboard.');
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return sendResponse(c, 404, 'NOT_FOUND', 'API Key not found.');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to delete API Key.');
    }
  }
};
