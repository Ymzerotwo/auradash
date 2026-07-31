import { z } from 'zod';
import { sanitizeForDb } from '../utils/sanitize';

/**
 * AuraDash Team Validation Schemas
 * Uses Zod to validate and sanitize incoming data for team management endpoints.
 */

/** Schema for creating a new team member */
export const createTeamMemberSchema = z.object({
  full_name: z.string().min(2, { message: 'full_name_too_short' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
  email: z.string().trim().toLowerCase().max(255, { message: 'too_long' }).email({ message: 'invalid_email' }),
  username: z.string().trim().toLowerCase().min(3, { message: 'username_too_short' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
  password: z.string().max(255, { message: 'too_long' }).min(6, { message: 'password_too_short' }),
  role: z.enum(['Admin', 'User']),
  job_title: z.string().max(255, { message: 'too_long' }).optional().nullable().transform(val => val ? sanitizeForDb(val) : val),
  permissions: z.record(z.string(), z.any()).optional().nullable(),
  photo_url: z.string().max(1000, { message: 'too_long' }).url().optional().nullable().transform(val => val ? sanitizeForDb(val) : val),
});

/** Schema for updating an existing team member's profile. Allows optional fields. */
export const updateTeamMemberSchema = z.object({
  full_name: z.string().min(2, { message: 'full_name_too_short' }).max(255, { message: 'too_long' }).optional().transform(val => val ? sanitizeForDb(val) : val),
  email: z.string().trim().toLowerCase().max(255, { message: 'too_long' }).email({ message: 'invalid_email' }).optional(),
  username: z.string().trim().toLowerCase().min(3, { message: 'username_too_short' }).max(255, { message: 'too_long' }).optional().transform(val => val ? sanitizeForDb(val) : val),
  password: z.string().max(255, { message: 'too_long' }).min(6, { message: 'password_too_short' }).optional().or(z.literal('')),
  role: z.enum(['Admin', 'User']).optional(),
  job_title: z.string().max(255, { message: 'too_long' }).optional().nullable().transform(val => val ? sanitizeForDb(val) : val),
  permissions: z.record(z.string(), z.any()).optional().nullable(),
  photo_url: z.string().max(1000, { message: 'too_long' }).url().optional().nullable().transform(val => val ? sanitizeForDb(val) : val),
});

/** Schema for toggling a user's ban/suspension status. */
export const toggleStatusSchema = z.object({
  is_banned: z.boolean().optional(),
});
