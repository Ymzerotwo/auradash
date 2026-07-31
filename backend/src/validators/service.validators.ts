import { z } from 'zod';
import { metaDataSchema, seoDataSchema } from './metadata.validators';
import { sanitizeForDb } from '../utils/sanitize';

/**
 * ==========================================
 * AuraDash Service Validators
 * ==========================================
 * Enforces strict validation and sanitization policies for service records.
 * Serves as the primary defensive barrier on routes creating or updating services.
 */

/**
 * @CRITICAL Schema for creating a new Service.
 * - `service_category_id`: Validates and sanitizes optional category association to prevent cross-site scripting (XSS) or database parameter injection.
 * - `name`: Rejects empty strings, limits length to 255 chars, and escapes HTML characters.
 * - `slug`: Enforces lowercase alphanumeric strings, hyphens, and Arabic alphabet ranges to safeguard slug routing integrity.
 * - `meta_data`: References the polymorphic discriminated union metadata validator.
 * - `seo_data`: Validates SEO structure and safety bounds.
 */
export const createServiceSchema = z.object({
  category_id: z.string().max(255, { message: 'too_long' }).optional().nullable().transform(val => val ? sanitizeForDb(val) : val),
  name: z.string().min(1, { message: 'name_required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
  slug: z.string().min(1, { message: 'slug_required' }).max(255, { message: 'too_long' }).regex(/^[a-z0-9\u0621-\u064A-]+$/, { message: 'invalid_slug_format' }).transform(sanitizeForDb),
  meta_data: metaDataSchema,
  seo_data: seoDataSchema,
  sort_order: z.number().int({ message: 'invalid_sort_order' }).optional().default(0),
  is_active: z.boolean().optional().default(true)
});

/**
 * @CRITICAL Schema for updating an existing Service.
 * Uses `.partial()` and overrides default values to prevent accidental value loss.
 */
export const updateServiceSchema = createServiceSchema.partial().extend({
  sort_order: z.number().int({ message: 'invalid_sort_order' }).optional(),
  is_active: z.boolean().optional(),
});
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
