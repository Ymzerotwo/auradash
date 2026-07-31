import { z } from 'zod';
import { metaDataSchema, seoDataSchema } from './metadata.validators';
import { sanitizeForDb } from '../utils/sanitize';

/**
 * ==========================================
 * AuraDash Category Validators
 * ==========================================
 * Enforces rigid schematic rules for category data ingress.
 */

/**
 * @CRITICAL The `slug` field executes a strict regex pattern preventing path traversal.
 * It transforms all incoming text via `sanitizeForDb` as a secondary line of XSS defense.
 */
export const createServiceCategorySchema = z.object({
  name: z.string().min(1, { message: 'name_required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
  slug: z.string().min(1, { message: 'slug_required' }).max(255, { message: 'too_long' }).regex(/^[a-z0-9\u0621-\u064A-]+$/, { message: 'invalid_slug_format' }).transform(sanitizeForDb),
  meta_data: metaDataSchema,
  seo_data: seoDataSchema,
  sort_order: z.number().int({ message: 'invalid_sort_order' }).optional().default(0),
  is_active: z.boolean().optional().default(true)
});

export const updateServiceCategorySchema = createServiceCategorySchema.partial().extend({
  sort_order: z.number().int({ message: 'invalid_sort_order' }).optional(),
  is_active: z.boolean().optional(),
});
