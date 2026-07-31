import { z } from "zod";

export const createPublicCommentSchema = z.object({
  article_id: z.string().min(1, { message: 'article_id_required' }),
  user_name: z.string()
    .min(1, { message: 'name_required' })
    .max(100, { message: 'name_too_long' }),
  user_email: z.string()
    .max(255, { message: 'email_too_long' })
    .optional()
    .nullable()
    .refine(val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), { message: 'invalid_email' }),
  parent_id: z.string().optional().nullable(),
  content: z.string()
    .min(1, { message: 'content_required' })
    .max(3000, { message: 'content_too_long' }),
});

export const replyCommentSchema = z.object({
  content: z.string()
    .min(1, { message: 'content_required' })
    .max(3000, { message: 'content_too_long' }),
});
