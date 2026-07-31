import { z } from 'zod';

const metaDataItemSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }),
    label: z.string().max(255, { message: 'too_long' }).optional(),
    type: z.literal('text-info'),
    data: z.object({ text: z.string().min(1, { message: 'required' }).max(2000, { message: 'too_long' }) })
  }),
  z.object({
    id: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }),
    label: z.string().max(255, { message: 'too_long' }).optional(),
    type: z.literal('text-description'),
    data: z.object({ text: z.string().min(1, { message: 'required' }).max(5000, { message: 'too_long' }) })
  }),
  z.object({
    id: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }),
    label: z.string().max(255, { message: 'too_long' }).optional(),
    type: z.literal('icon'),
    data: z.object({ name: z.string().min(1, { message: 'required' }).max(100, { message: 'too_long' }) })
  }),
  z.object({
    id: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }),
    label: z.string().max(255, { message: 'too_long' }).optional(),
    type: z.literal('photo'),
    data: z.object({ 
      url: z.string().min(1, { message: 'required' }).url({ message: 'invalid_url' }).regex(/^https?:\/\//i, { message: 'must_be_http_https' }).max(1000, { message: 'too_long' }),
      alt: z.string().max(255, { message: 'too_long' }).optional()
    })
  }),
  z.object({
    id: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }),
    label: z.string().max(255, { message: 'too_long' }).optional(),
    type: z.literal('video'),
    data: z.object({ 
      url: z.string().min(1, { message: 'required' }).url({ message: 'invalid_url' }).regex(/^https?:\/\//i, { message: 'must_be_http_https' }).max(1000, { message: 'too_long' }) 
    })
  }),
  z.object({
    id: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }),
    label: z.string().max(255, { message: 'too_long' }).optional(),
    type: z.literal('video-youtube'),
    data: z.object({ 
      url: z.string().min(1, { message: 'required' }).url({ message: 'invalid_url' }).regex(/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i, { message: 'must_be_youtube_url' }).max(1000, { message: 'too_long' }) 
    })
  }),
  z.object({
    id: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }),
    label: z.string().max(255, { message: 'too_long' }).optional(),
    type: z.literal('date_time'),
    data: z.object({ value: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }) })
  }),
  z.object({
    id: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }),
    label: z.string().max(255, { message: 'too_long' }).optional(),
    type: z.literal('link'),
    data: z.object({ 
      url: z.string().min(1, { message: 'required' }).url({ message: 'invalid_url' }).regex(/^https?:\/\//i, { message: 'must_be_http_https' }).max(1000, { message: 'too_long' }),
      label: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' })
    })
  }),
  z.object({
    id: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }),
    label: z.string().max(255, { message: 'too_long' }).optional(),
    type: z.literal('list'),
    data: z.object({ 
      items: z.array(z.string().min(1, { message: 'required' }).max(500, { message: 'too_long' })).min(1, { message: 'required' }) 
    })
  }),
]);

export const seoDataSchema = z.object({
  meta_title: z.string().max(255, { message: 'too_long' }).optional(),
  meta_description: z.string().max(1000, { message: 'too_long' }).optional(),
  og_image: z.string().max(1000, { message: 'too_long' }).optional(),
  canonical_url: z.string().url({ message: 'invalid_url' }).max(1000, { message: 'too_long' }).optional(),
  is_indexable: z.boolean().optional()
}).optional();

export const metaDataSchema = z.array(metaDataItemSchema)
  .superRefine((items, ctx) => {
    if (!items) return;
    const labels = new Set<string>();
    items.forEach((item, index) => {
      const trimmedLabel = (item.label || "").trim();
      if (!trimmedLabel) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "custom_field_label_required",
          path: [index, "label"],
        });
      } else {
        const lowerLabel = trimmedLabel.toLowerCase();
        if (labels.has(lowerLabel)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "custom_field_label_duplicate",
            path: [index, "label"],
          });
        } else {
          labels.add(lowerLabel);
        }
      }
    });
  })
  .optional();
