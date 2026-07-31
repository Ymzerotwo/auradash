import { z } from 'zod';
import { metaDataSchema, seoDataSchema } from './metadata.validators';
import { sanitizeForDb } from '../utils/sanitize';

// AuraDash: Validation schema defining boolean logic for the 'is_active' flag, accepting integers sent by form data.
const isActiveSchema = z.union([
  z.boolean(),
  z.number().int().min(0).max(1).transform(v => v === 1),
]).optional().default(true);

// AuraDash: Validation schema for creating a new article, strictly defining data types and enforcing string sanitization.
export const createArticleSchema = z.object({
  category_id: z.string().max(255, { message: 'too_long' }).transform(sanitizeForDb).optional().nullable(),
  title: z.string().min(1, { message: 'title_required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
  // AuraDash (Critical): Enforces alphanumeric and arabic characters with hyphens to ensure SEO-friendly slugs and prevent routing injection.
  slug: z.string().min(1, { message: 'slug_required' }).max(255, { message: 'too_long' }).regex(/^[a-z0-9\u0621-\u064A-]+$/, { message: 'invalid_slug_format' }).transform(sanitizeForDb),
  excerpt: z.string().max(1000, { message: 'too_long' }).transform(sanitizeForDb).optional().nullable(),
  preview_image_url: z.string().url().max(1000, { message: 'too_long' }).transform(sanitizeForDb).optional().nullable(),
  reading_time_minutes: z.number().int().min(1).optional().nullable(),
  author_id: z.string().max(255, { message: 'too_long' }).transform(sanitizeForDb).optional().nullable(),
  published_at: z.string().max(255, { message: 'too_long' }).transform(sanitizeForDb).optional().nullable(),
  meta_data: metaDataSchema,
  seo_data: seoDataSchema,
  sort_order: z.number().int({ message: 'invalid_sort_order' }).optional().default(0),
  is_active: isActiveSchema,
});

// AuraDash: Validation schema for updating an article.
// AuraDash (Critical): Re-defines fields with defaults (sort_order, is_active) to bypass Zod's '.default()' behavior, avoiding unintentional data loss on partial PATCH requests.
export const updateArticleSchema = createArticleSchema.partial().extend({
  sort_order: z.number().int({ message: 'invalid_sort_order' }).optional(),
  is_active: z.union([
    z.boolean(),
    z.number().int().min(0).max(1).transform(v => v === 1),
  ]).optional(),
});
