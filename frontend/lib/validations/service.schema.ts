import { z } from 'zod';
import { metaDataSchema, seoDataSchema } from './metadata.schema';

export const createServiceSchema = z.object({
  category_id: z.string().max(255, { message: 'too_long' }).optional().nullable(),
  name: z.string().min(1, { message: 'name_required' }).max(255, { message: 'too_long' }),
  slug: z.string().min(1, { message: 'slug_required' }).max(255, { message: 'too_long' }).regex(/^[a-z0-9\u0621-\u064A-]+$/, { message: 'invalid_slug_format' }),
  meta_data: metaDataSchema,
  seo_data: seoDataSchema,
  sort_order: z.number().int({ message: 'invalid_sort_order' }).optional().default(0),
  is_active: z.boolean().optional().default(true)
});

export const updateServiceSchema = createServiceSchema.partial().extend({
  sort_order: z.number().int({ message: 'invalid_sort_order' }).optional(),
  is_active: z.boolean().optional(),
});
