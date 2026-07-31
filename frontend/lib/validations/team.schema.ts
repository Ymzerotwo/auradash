import { z } from 'zod';

export const createTeamMemberSchema = z.object({
  full_name: z.string().min(2, { message: 'full_name_too_short' }).max(100, { message: 'too_long' }),
  email: z.string().trim().toLowerCase().email({ message: 'invalid_email' }).max(255, { message: 'too_long' }),
  username: z.string().trim().toLowerCase().min(3, { message: 'username_too_short' }).max(50, { message: 'too_long' }),
  password: z.string().min(6, { message: 'password_too_short' }).max(255, { message: 'too_long' }),
  role: z.enum(['Admin', 'User']),
  job_title: z.string().max(100, { message: 'too_long' }).optional().nullable(),
  permissions: z.record(z.string(), z.any()).optional().nullable(),
  photo_url: z.string().url().max(1000, { message: 'too_long' }).optional().nullable(),
});

export const updateTeamMemberSchema = z.object({
  full_name: z.string().min(2, { message: 'full_name_too_short' }).max(100, { message: 'too_long' }).optional(),
  email: z.string().trim().toLowerCase().email({ message: 'invalid_email' }).max(255, { message: 'too_long' }).optional(),
  username: z.string().trim().toLowerCase().min(3, { message: 'username_too_short' }).max(50, { message: 'too_long' }).optional(),
  password: z.string().min(6, { message: 'password_too_short' }).max(255, { message: 'too_long' }).optional().or(z.literal('')),
  role: z.enum(['Admin', 'User']).optional(),
  job_title: z.string().max(100, { message: 'too_long' }).optional().nullable(),
  permissions: z.record(z.string(), z.any()).optional().nullable(),
  photo_url: z.string().url().max(1000, { message: 'too_long' }).optional().nullable(),
});

export const toggleStatusSchema = z.object({
  is_banned: z.boolean().optional(),
});

export const updateProfileSchema = z.object({
  full_name: z.string().min(2, { message: 'full_name_too_short' }).max(100, { message: 'too_long' }).optional(),
  username: z.string().trim().toLowerCase().min(3, { message: 'username_too_short' }).max(50, { message: 'too_long' })
    .regex(/^[a-zA-Z0-9_.-]+$/, { message: 'invalid_username_format' })
    .optional(),
  email: z.string().trim().toLowerCase().email({ message: 'invalid_email' }).max(255, { message: 'too_long' }).optional(),
  photo_url: z.string().max(1000, { message: 'too_long' }).optional().nullable(),
  job_title: z.string().max(100, { message: 'too_long' }).optional().nullable(),
  oldPassword: z.string().min(1, { message: 'current_password_required' }).max(255, { message: 'too_long' }).optional(),
  newPassword: z.string().min(8, { message: 'new_password_too_short' }).max(255, { message: 'too_long' }).optional(),
}).refine(
  (data) => {
    // If newPassword is provided, oldPassword must also be provided
    if (data.newPassword && !data.oldPassword) return false;
    return true;
  },
  { message: 'current_password_required_for_new', path: ['oldPassword'] }
);

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
export type ToggleStatusInput = z.infer<typeof toggleStatusSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
