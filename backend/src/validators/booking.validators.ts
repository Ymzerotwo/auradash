import { z } from 'zod';

import { sanitizeForDb } from '../utils/sanitize';

export const ServiceItemSchema = z.object({
  service_id: z.string().max(255).transform(sanitizeForDb).optional(),
  name: z.string().min(1, { message: 'name_required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb).optional(),
  price: z.number().min(0, { message: 'invalid_price' }).optional(),
  discount: z.number().min(0).optional().default(0)
}).refine(data => data.service_id || (data.name && data.price !== undefined), {
  message: 'Either service_id or (name, price) must be provided',
  path: ['service_id']
});

export const CreateBookingSchema = z.object({
  customer_id: z.string().max(255, { message: 'too_long' }).transform(sanitizeForDb),
  services_data: z.array(ServiceItemSchema).min(1, { message: 'service_required' }),
  scheduled_from: z.string().datetime({ message: 'invalid_datetime' }),
  scheduled_to: z.string().datetime({ message: 'invalid_datetime' }),
  notes: z.string().max(1000, { message: 'too_long' }).transform(sanitizeForDb).optional()
}).refine(data => new Date(data.scheduled_from) < new Date(data.scheduled_to), {
  message: 'scheduled_to_must_be_after_scheduled_from',
  path: ['scheduled_to']
});

export const UpdateBookingSchema = z.object({
  services_data: z.array(ServiceItemSchema).min(1, { message: 'service_required' }).optional(),
  scheduled_from: z.string().datetime({ message: 'invalid_datetime' }).optional(),
  scheduled_to: z.string().datetime({ message: 'invalid_datetime' }).optional(),
  paid_status: z.enum(['unpaid', 'partial', 'paid', 'refunded']).optional(),
  paid_amount: z.number().min(0).optional(),
  notes: z.string().max(1000, { message: 'too_long' }).transform(sanitizeForDb).optional()
}).refine(data => {
  if (data.scheduled_from && data.scheduled_to) {
    return new Date(data.scheduled_from) < new Date(data.scheduled_to);
  }
  return true;
}, {
  message: 'scheduled_to_must_be_after_scheduled_from',
  path: ['scheduled_to']
});

export const ChangeBookingStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  cancellation_reason: z.string().max(1000, { message: 'too_long' }).transform(sanitizeForDb).optional()
}).refine(data => {
  if (data.status === 'cancelled' && (!data.cancellation_reason || data.cancellation_reason.trim().length === 0)) {
    return false;
  }
  return true;
}, {
  message: 'cancellation_reason_required',
  path: ['cancellation_reason']
});

export const RecordPaymentSchema = z.object({
  amount: z.number().positive({ message: 'invalid_amount' }),
  notes: z.string().max(500, { message: 'too_long' }).transform(sanitizeForDb).optional().default('')
});

export type ServiceItemDTO = z.infer<typeof ServiceItemSchema>;
export type CreateBookingDTO = z.infer<typeof CreateBookingSchema>;
export type UpdateBookingDTO = z.infer<typeof UpdateBookingSchema>;
export type ChangeBookingStatusDTO = z.infer<typeof ChangeBookingStatusSchema>;
export type RecordPaymentDTO = z.infer<typeof RecordPaymentSchema>;
