import { z } from 'zod';
import { sanitizeForDb } from '../utils/sanitize';

/**
 * ==========================================
 * AuraDash Check Slug Validators
 * ==========================================
 * Defines the strict Zod validation schema for slug checking requests.
 */
export const checkSlugSchema = z.object({
  // CRITICAL: The slug is sanitized to strip malicious characters before database processing.
  slug: z.string().min(1, { message: 'slug_required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
  
  // CRITICAL: The table name is strictly limited via an Enum. This is the primary defense against SQL Injection when building dynamic queries.
  table: z.enum(['service-categories', 'services', 'articles', 'article_categories']),
  
  exclude_id: z.string().max(255, { message: 'too_long' }).optional().nullable().transform(val => val ? sanitizeForDb(val) : val)
});
