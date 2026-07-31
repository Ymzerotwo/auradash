import { z } from 'zod';

export const InboxSchema = z.object({
  full_name: z.string().min(2, { message: 'name_required' }).max(255, { message: 'too_long' }),
  phone: z.string().min(8, { message: 'phone_required' }).max(255, { message: 'too_long' }),
  email: z.string().trim().toLowerCase().email({ message: 'invalid_email' }).max(255, { message: 'too_long' }),
  inquiry_type: z.enum(['general', 'service', 'offer']),
  message: z.string().min(3, { message: 'message_too_short' }).max(10000, { message: 'too_long' }),
  service_id: z.string().max(255, { message: 'too_long' }).optional()
}).refine(data => {
  if (data.inquiry_type === 'service') {
    return data.service_id !== undefined && data.service_id !== null && data.service_id !== '';
  }
  return true;
}, {
  message: 'service_id_required',
  path: ['service_id']
});

export const UpdateInboxStatusSchema = z.object({
  status: z.enum(['unread', 'read', 'converted', 'spam', 'profile_created']),
  spam_reason: z.string().max(10000, { message: 'too_long' }).optional()
});
