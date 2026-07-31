import { z } from 'zod';

const phoneValidator = z.string().max(255, { message: 'too_long' })
  .transform(val => val.replace(/[\s\-]/g, '')) // Remove spaces and dashes
  .pipe(z.string().max(255, { message: 'too_long' }).regex(/^\+\d+$/, { message: 'invalid_phone_format' }));

export const CreateCustomerSchema = z.object({
  full_name: z.string().min(2, { message: 'name_too_short' }).max(255, { message: 'too_long' }),
  phone: phoneValidator,
  email: z.string().trim().toLowerCase().email({ message: 'invalid_email' }).max(255, { message: 'too_long' }),
  gender: z.enum(['male', 'female']).optional().nullable(),
  date_of_birth: z.string().max(255, { message: 'too_long' }).optional().nullable(),
  city: z.string().max(255, { message: 'too_long' }).optional().nullable(),
  acquisition_source: z.string().max(255, { message: 'too_long' }).optional().nullable(),
  tags: z.array(z.string().max(255, { message: 'too_long' })).optional().nullable(),
  notes: z.string().max(10000, { message: 'too_long' }).optional().nullable()
});

export const UpdateCustomerSchema = z.object({
  full_name: z.string().min(2, { message: 'name_too_short' }).max(255, { message: 'too_long' }).optional(),
  phone: phoneValidator.optional(),
  email: z.string().trim().toLowerCase().email({ message: 'invalid_email' }).max(255, { message: 'too_long' }).optional(),
  gender: z.enum(['male', 'female']).optional().nullable(),
  date_of_birth: z.string().max(255, { message: 'too_long' }).optional().nullable(),
  city: z.string().max(255, { message: 'too_long' }).optional().nullable(),
  acquisition_source: z.string().max(255, { message: 'too_long' }).optional().nullable(),
  tags: z.array(z.string().max(255, { message: 'too_long' })).optional().nullable(),
  notes: z.string().max(10000, { message: 'too_long' }).optional().nullable()
});

export const SpamCustomerSchema = z.object({
  reason: z.string().min(3, { message: 'spam_reason_too_short' }).max(1000, { message: 'too_long' })
});

export type CreateCustomerDTO = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerDTO = z.infer<typeof UpdateCustomerSchema>;
export type SpamCustomerDTO = z.infer<typeof SpamCustomerSchema>;
