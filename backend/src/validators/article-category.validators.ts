import { z } from 'zod';
import { metaDataSchema, seoDataSchema } from './metadata.validators';
import { sanitizeForDb } from '../utils/sanitize';

// AuraDash: Validation schema defining boolean logic for the 'is_active' flag, parsing frontend integer submissions.
const isActiveSchema = z.union([
  z.boolean(),
  z.number().int().min(0).max(1).transform(v => v === 1),
]).optional().default(true);

// AuraDash: Validation schema for creating a new article category.
export const createArticleCategorySchema = z.object({
  title: z.string().min(1, { message: 'title_required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
  // AuraDash (Critical): Slug regex secures routing paths from special characters injections and ensures SEO standards.
  slug: z.string().min(1, { message: 'slug_required' }).max(255, { message: 'too_long' }).regex(/^[a-z0-9\u0621-\u064A-]+$/, { message: 'invalid_slug_format' }).transform(sanitizeForDb),
  excerpt: z.string().max(1000, { message: 'too_long' }).transform(sanitizeForDb).optional().nullable(),
  preview_image_url: z.string().url().max(1000, { message: 'too_long' }).transform(sanitizeForDb).optional().nullable(),
  meta_data: metaDataSchema,
  seo_data: seoDataSchema,
  sort_order: z.number().int({ message: 'invalid_sort_order' }).optional().default(0),
  is_active: isActiveSchema,
});

// AuraDash: Validation schema for updating an article category.
// AuraDash (Critical): Excludes the Zod default fallback for 'is_active' and 'sort_order' to prevent accidental resets during partial updates.
export const updateArticleCategorySchema = createArticleCategorySchema.partial().extend({
  sort_order: z.number().int({ message: 'invalid_sort_order' }).optional(),
  is_active: z.union([
    z.boolean(),
    z.number().int().min(0).max(1).transform(v => v === 1),
  ]).optional(),
});
