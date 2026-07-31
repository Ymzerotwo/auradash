import { z } from 'zod';
import { sanitizeForDb } from '../utils/sanitize';

/**
 * ==========================================
 * AuraDash Dynamic Metadata & SEO Validators
 * ==========================================
 * Defines the strict structural rules for polymorphic metadata and SEO fields.
 * This file is critical for defending the CMS from schema-poisoning and XSS attacks.
 */

/**
 * @CRITICAL Discriminated Union enforces strict pairing of 'type' with its expected 'data' payload.
 * It ensures malicious actors cannot inject arbitrary or mixed properties into the JSON payload.
 */
const metaDataItemSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
    label: z.string().max(255, { message: 'too_long' }).optional().transform(val => val ? sanitizeForDb(val) : val),
    type: z.literal('text-info'),
    data: z.object({ text: z.string().min(1, { message: 'required' }).max(2000, { message: 'too_long' }).transform(sanitizeForDb) })
  }),
  z.object({
    id: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
    label: z.string().max(255, { message: 'too_long' }).optional().transform(val => val ? sanitizeForDb(val) : val),
    type: z.literal('text-description'),
    data: z.object({ text: z.string().min(1, { message: 'required' }).max(5000, { message: 'too_long' }).transform(sanitizeForDb) })
  }),
  z.object({
    id: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
    label: z.string().max(255, { message: 'too_long' }).optional().transform(val => val ? sanitizeForDb(val) : val),
    type: z.literal('icon'),
    data: z.object({ name: z.string().min(1, { message: 'required' }).max(100, { message: 'too_long' }).transform(sanitizeForDb) })
  }),
  z.object({
    id: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
    label: z.string().max(255, { message: 'too_long' }).optional().transform(val => val ? sanitizeForDb(val) : val),
    type: z.literal('photo'),
    data: z.object({ 
      // CRITICAL: Strictly require http/https protocols to prevent javascript: XSS
      url: z.string().min(1, { message: 'required' }).url({ message: 'invalid_url' }).regex(/^https?:\/\//i, { message: 'must_be_http_https' }).max(1000, { message: 'too_long' }),
      alt: z.string().max(255, { message: 'too_long' }).optional().transform(val => val ? sanitizeForDb(val) : val)
    })
  }),
  z.object({
    id: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
    label: z.string().max(255, { message: 'too_long' }).optional().transform(val => val ? sanitizeForDb(val) : val),
    type: z.literal('video'),
    data: z.object({ 
      url: z.string().min(1, { message: 'required' }).url({ message: 'invalid_url' }).regex(/^https?:\/\//i, { message: 'must_be_http_https' }).max(1000, { message: 'too_long' }) 
    })
  }),
  z.object({
    id: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
    label: z.string().max(255, { message: 'too_long' }).optional().transform(val => val ? sanitizeForDb(val) : val),
    type: z.literal('video-youtube'),
    data: z.object({ 
      // CRITICAL: Restrict domain exclusively to YouTube formats to prevent embedding arbitrary external scripts
      url: z.string().min(1, { message: 'required' }).url({ message: 'invalid_url' }).regex(/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i, { message: 'must_be_youtube_url' }).max(1000, { message: 'too_long' }) 
    })
  }),
  z.object({
    id: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
    label: z.string().max(255, { message: 'too_long' }).optional().transform(val => val ? sanitizeForDb(val) : val),
    type: z.literal('date_time'),
    data: z.object({ value: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb) })
  }),
  z.object({
    id: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
    label: z.string().max(255, { message: 'too_long' }).optional().transform(val => val ? sanitizeForDb(val) : val),
    type: z.literal('link'),
    data: z.object({ 
      url: z.string().min(1, { message: 'required' }).url({ message: 'invalid_url' }).regex(/^https?:\/\//i, { message: 'must_be_http_https' }).max(1000, { message: 'too_long' }),
      label: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb)
    })
  }),
  z.object({
    id: z.string().min(1, { message: 'required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
    label: z.string().max(255, { message: 'too_long' }).optional().transform(val => val ? sanitizeForDb(val) : val),
    type: z.literal('list'),
    data: z.object({ 
      items: z.array(z.string().min(1, { message: 'required' }).max(500, { message: 'too_long' }).transform(sanitizeForDb)).min(1, { message: 'required' }) 
    })
  }),
]);

/**
 * @CRITICAL SEO data validation.
 * All SEO text is strictly sanitized, and images/canonical links are bound to safe HTTP/HTTPS protocols 
 * to prevent XSS via javascript: URIs in meta tags.
 */
export const seoDataSchema = z.object({
  meta_title: z.string().max(255, { message: 'too_long' }).optional().transform(val => val ? sanitizeForDb(val) : val),
  meta_description: z.string().max(1000, { message: 'too_long' }).optional().transform(val => val ? sanitizeForDb(val) : val),
  og_image: z.string().url({ message: 'invalid_url' }).regex(/^https?:\/\//i, { message: 'must_be_http_https' }).max(1000, { message: 'too_long' }).optional(),
  canonical_url: z.string().url({ message: 'invalid_url' }).regex(/^https?:\/\//i, { message: 'must_be_http_https' }).max(1000, { message: 'too_long' }).optional(),
  is_indexable: z.boolean().optional()
}).optional();

/**
 * @CRITICAL Aggregates the polymorphic items and enforces application-level constraints (superRefine).
 * Uniqueness of labels is verified here to prevent UI rendering conflicts or duplicate data overwrites.
 */
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
