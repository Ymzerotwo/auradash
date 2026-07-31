/**
 * ==========================================
 *        AuraDash Apikey Services
 * ==========================================
 * 
 * Business logic layer for managing Apikey operations.
 */

import { D1Database } from '@cloudflare/workers-types';
import { generateApiKey, generateTestApiKey, normalizeDomain } from '../utils/crypto';
import { CreateApiKeyDTO } from '../validators/apikey.validators';
import { getPaginationOptions, paginateQuery } from '../utils/pagination';

export const ApiKeyService = {
  /**
   * Mints a new API Key and stores its metadata in the database.
   * CRITICAL NOTE: The full key is NEVER stored in the database. Only the short_key
   * (the payload portion) is stored for management and revocation purposes.
   * @param db - The D1 Database instance.
   * @param data - The validated DTO containing key details.
   * @param secret - The Master Secret used for HMAC signing.
   * @param userId - The ID of the user creating the key.
   * @returns The generated key object containing the full key string.
   * 
   * @param db - The D1 Database instance.
   */
  createApiKey: async (db: D1Database, data: CreateApiKeyDTO, secret: string, userId: string | null) => {
    let result;
    let domainValue: string;

    // Route logic based on key type (test vs production)
    if (data.type === 'test') {
      const expiresInHours = data.expiresInHours ?? 24;
      result = await generateTestApiKey(expiresInHours, secret);
      domainValue = 'test';
    } else {
      const domain = data.domain || '';
      result = await generateApiKey(domain, secret);
      domainValue = normalizeDomain(domain);
    }

    const id = crypto.randomUUID();

    // Store only the short_key for management purposes
    await db.prepare(`
      INSERT INTO ApiKeys (id, name, domain, short_key, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      id,
      data.name,
      domainValue,
      result.shortKey,
      userId
    ).run();

    const response: any = {
      id,
      name: data.name,
      domain: domainValue,
      apiKey: result.fullKey, // Full key returned ONLY once
      created_at: new Date().toISOString(),
      type: data.type || 'production'
    };

    // Dynamically calculate expiration time for the response if it's a test key
    if (data.type === 'test') {
      const payload = JSON.parse(result.payloadStr);
      response.expires_at = new Date(payload.exp * 1000).toISOString();
    }

    return response;
  },

  /**
   * Retrieves a paginated list of API Keys.
   * For test keys, it dynamically decodes the payload to calculate the expiration status.
   * @param db - The D1 Database instance.
   * @param page - Current page number.
   * @param limit - Number of items per page.
   * @returns A paginated response object.
   * 
   * @param db - The D1 Database instance.
   */
  listApiKeys: async (db: D1Database, page?: string | null, limit?: string | null) => {
    const paginationOptions = getPaginationOptions(page, limit, 20);
    const baseQuery = `
      SELECT 
        ApiKeys.id, ApiKeys.name, ApiKeys.domain, ApiKeys.short_key, 
        Users.full_name as created_by_name, ApiKeys.created_at 
      FROM ApiKeys 
      LEFT JOIN Users ON ApiKeys.created_by = Users.id 
      ORDER BY ApiKeys.created_at DESC
    `;
    const countQuery = `SELECT COUNT(*) as total FROM ApiKeys`;

    const paginatedResult = await paginateQuery(db, baseQuery, countQuery, [], paginationOptions);

    if (paginatedResult.data) {
      paginatedResult.data = paginatedResult.data.map((key: any) => {
        // CRITICAL NOTE: Decoding the short_key to determine expiration status on the fly.
        // This avoids needing background cron jobs to clean up expired keys.
        if (key.short_key.startsWith('auradash_ts.')) {
          try {
            const parts = key.short_key.split('.');
            const payloadBase64 = parts[1];
            let base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
            
            // Restore Base64 padding
            while (base64.length % 4 !== 0) {
              base64 += '=';
            }
            const binary = atob(base64);
            const payload = JSON.parse(binary);
            const is_expired = Date.now() > payload.exp * 1000;

            const prefix = parts[0];
            const displayShortKey = `${prefix}.${payloadBase64.substring(0, 10)}`;

            return {
              ...key,
              short_key: displayShortKey,
              type: 'test',
              expires_at: new Date(payload.exp * 1000).toISOString(),
              is_expired
            };
          } catch {
            const prefix = key.short_key.split('.')[0] || 'auradash_ts';
            const payloadBase64 = key.short_key.split('.')[1] || '';
            // Fallback if parsing fails for any reason
            return {
              ...key,
              short_key: `${prefix}.${payloadBase64.substring(0, 10)}`,
              type: 'test',
              is_expired: true
            };
          }
        }
        
        const prefix = key.short_key.split('.')[0] || 'auradash_pk';
        const payloadBase64 = key.short_key.split('.')[1] || '';
        return {
          ...key,
          short_key: `${prefix}.${payloadBase64.substring(0, 10)}`,
          type: 'production'
        };
      });
    }

    return paginatedResult;
  },

  /**
   * Deletes an API Key from the database, effectively revoking it.
   * @param db - The D1 Database instance.
   * @param id - The ID of the key to delete.
   * 
   * @param db - The D1 Database instance.
   */
  deleteApiKey: async (db: D1Database, id: string) => {
    const result = await db.prepare('DELETE FROM ApiKeys WHERE id = ?').bind(id).run();
    if (result.meta.changes === 0) {
      throw new Error('NOT_FOUND');
    }
  }
};
