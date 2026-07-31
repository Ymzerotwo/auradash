import { z } from 'zod';
import { sanitizeForDb } from '../utils/sanitize';

// AuraDash: Validators for Comment-related requests ensuring data integrity and security.

// AuraDash: Validates payloads submitted by public users creating a new comment on an article.
// AuraDash (Critical): Uses sanitizeForDb on string fields to neutralize XSS payloads before they reach the database.
export const createPublicCommentSchema = z.object({
  article_id: z.string().min(1, { message: 'Missing article_id' }),
  user_name: z.string()
    .transform(sanitizeForDb)
    .refine(val => val.length > 0, { message: 'Missing user_name' })
    .refine(val => val.length <= 100, { message: 'Name too long (max 100 characters)' }),
  // AuraDash: Email is required and must follow a valid format. XSS sanitized before reaching the database.
  user_email: z.string({ message: 'Email is required' })
    .min(1, { message: 'Email is required' })
    .max(255, { message: 'Email too long' })
    .refine(val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()), { message: 'Invalid email address format' })
    .transform(val => sanitizeForDb(val.trim().toLowerCase())),
  parent_id: z.string().optional().nullable(),
  content: z.string()
    .transform(sanitizeForDb)
    .refine(val => val.length > 0, { message: 'Comment content cannot be empty' })
    .refine(val => val.length <= 3000, { message: 'Comment too long (max 3000 characters)' }),
});

// AuraDash: Validates payloads submitted by Admins when replying to an existing user comment.
// AuraDash (Critical): Admin replies are also subjected to strict XSS sanitization and length limits.
export const replyCommentSchema = z.object({
  content: z.string()
    .transform(sanitizeForDb)
    .refine(val => val.length > 0, { message: 'Reply content cannot be empty' })
    .refine(val => val.length <= 3000, { message: 'Reply content is too long (max 3000 characters)' }),
});
