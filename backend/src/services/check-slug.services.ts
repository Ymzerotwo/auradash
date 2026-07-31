/**
 * ==========================================
 *        AuraDash Check Slug Services
 * ==========================================
 * 
 * Business logic layer for managing Check Slug operations.
 */

import { D1Database } from '@cloudflare/workers-types';

// ==========================================
// AuraDash Check Slug Service
// ==========================================
// Contains the core business logic and database interactions for verifying slug uniqueness.
export const CheckSlugService = {
  /**
   * Queries the database to check if a specific slug is already in use.
   * @param db - Cloudflare D1 Database binding.
   * @param table - The specific table to check against (strictly typed to prevent SQL injection).
   * @param slug - The slug string to verify.
   * @param excludeId - Optional. An ID to exclude from the check (used during update operations).
   * @returns A boolean indicating if the slug is available (true) or taken (false).
   * @security We dynamically construct the query but strictly enforce the `table` value via TypeScript types and Zod enums at the controller level. This guarantees that no malicious table names can be injected.
   * 
   * @param db - The D1 Database instance.
   */
  checkSlug: async (
    db: D1Database,
    table: 'service-categories' | 'services' | 'articles' | 'article_categories',
    slug: string,
    excludeId?: string | null
  ): Promise<boolean> => {
    let query = '';
    const params: any[] = [slug];

    if (table === 'service-categories') {
      query = 'SELECT id FROM service_category WHERE slug = ?';
    } else if (table === 'services') {
      query = 'SELECT id FROM Services WHERE slug = ?';
    } else if (table === 'articles') {
      query = 'SELECT id FROM Articles WHERE slug = ?';
    } else if (table === 'article_categories') {
      query = 'SELECT id FROM Article_Categories WHERE slug = ?';
    }

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const existing = await db.prepare(query).bind(...params).first();
    return !existing;
  }
};
