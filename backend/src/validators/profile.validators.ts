import { z } from 'zod';
import { sanitizeForDb } from '../utils/sanitize';

export const updateProfileSchema = z.object({
  full_name: z.string().min(2, { message: 'full_name_too_short' }).max(255, { message: 'too_long' }).optional().transform(val => val ? sanitizeForDb(val) : val),
  username: z.string().trim().toLowerCase().min(3, { message: 'username_too_short' }).max(255, { message: 'too_long' })
    .regex(/^[a-zA-Z0-9_.-]+$/, { message: 'invalid_username_format' })
    .optional()
    .transform(val => val ? sanitizeForDb(val) : val),
  email: z.string().trim().toLowerCase().max(255, { message: 'too_long' }).email({ message: 'invalid_email' }).optional(),
  photo_url: z.string().max(1000, { message: 'too_long' }).optional().nullable().transform(val => val ? sanitizeForDb(val) : val),
  job_title: z.string().max(255, { message: 'too_long' }).optional().nullable().transform(val => val ? sanitizeForDb(val) : val),
  oldPassword: z.string().max(255, { message: 'too_long' }).min(1, { message: 'current_password_required' }).optional(),
  newPassword: z.string().max(255, { message: 'too_long' }).min(8, { message: 'new_password_too_short' }).optional(),
}).refine(
  (data) => {
    // If newPassword is provided, oldPassword must also be provided
    if (data.newPassword && !data.oldPassword) return false;
    return true;
  },
  { message: 'current_password_required_for_new', path: ['oldPassword'] }
);

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
