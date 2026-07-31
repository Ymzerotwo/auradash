import { z } from 'zod';
import { metaDataSchema, seoDataSchema } from './metadata.schema';

// Accept boolean OR number (0/1) for is_active — frontend sends integer
const isActiveSchema = z.union([
  z.boolean(),
  z.number().int().min(0).max(1).transform(v => v === 1),
]).optional().default(true);

export const createArticleSchema = z.object({
  category_id: z.string().max(255, { message: 'too_long' }).optional().nullable(),
  title: z.string().min(1, { message: 'title_required' }).max(255, { message: 'too_long' }),
  slug: z.string().min(1, { message: 'slug_required' }).max(255, { message: 'too_long' }).regex(/^[a-z0-9\u0621-\u064A-]+$/, { message: 'invalid_slug_format' }),
  excerpt: z.string().max(1000, { message: 'too_long' }).optional().nullable(),
  preview_image_url: z.string().url().max(1000, { message: 'too_long' }).optional().nullable(),
  reading_time_minutes: z.number().int().min(1).optional().nullable(),
  author_id: z.string().max(255, { message: 'too_long' }).optional().nullable(),
  published_at: z.string().max(255, { message: 'too_long' }).optional().nullable(),
  meta_data: metaDataSchema,
  seo_data: seoDataSchema,
  sort_order: z.number().int({ message: 'invalid_sort_order' }).optional().default(0),
  is_active: isActiveSchema,
});

export const updateArticleSchema = createArticleSchema.partial().extend({
  sort_order: z.number().int({ message: 'invalid_sort_order' }).optional(),
  is_active: z.union([
    z.boolean(),
    z.number().int().min(0).max(1).transform(v => v === 1),
  ]).optional(),
});

