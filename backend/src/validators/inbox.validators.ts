import { z } from 'zod';
import { sanitizeForDb } from '../utils/sanitize';

// AuraDash: Validation schema for public inquiry/contact form submissions.
export const InboxSchema = z.object({
  full_name: z.string().min(2, { message: 'name_required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
  phone: z.string().min(8, { message: 'phone_required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
  email: z.string().email({ message: 'invalid_email' }).max(255, { message: 'too_long' }).trim().toLowerCase(),
  inquiry_type: z.enum(['general', 'service', 'offer']),
  message: z.string().min(3, { message: 'message_too_short' }).max(10000, { message: 'too_long' }).transform(sanitizeForDb),
  service_id: z.string().max(255, { message: 'too_long' }).transform(sanitizeForDb).transform(v => v === '' ? undefined : v).optional(),
  service: z.string().max(255, { message: 'too_long' }).transform(sanitizeForDb).transform(v => v === '' ? undefined : v).optional()
}).transform(data => {
  if (!data.service_id && data.service) {
    data.service_id = data.service;
  }
  if (data.service_id && data.inquiry_type === 'general') {
    data.inquiry_type = 'service';
  }
  return data;
}).refine(data => {
  if (data.inquiry_type === 'service') {
    return data.service_id !== undefined && data.service_id !== null && data.service_id !== '';
  }
  return true;
}, {
  message: 'service_id_required',
  path: ['service_id']
});

// AuraDash: Validation schema for admin updates to message statuses (read, unread, spam, etc.).
export const UpdateInboxStatusSchema = z.object({
  status: z.enum(['unread', 'read', 'converted', 'spam', 'profile_created']),
  // AuraDash (Critical): Ignores empty strings by transforming them to undefined, ensuring NULL is saved in the database if no spam reason is provided.
  spam_reason: z.string().max(1000, { message: 'too_long' }).transform(sanitizeForDb).transform(v => v === '' ? undefined : v).optional()
});
