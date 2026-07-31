import { z } from 'zod';

export const createMediaSchema = z.object({
  file_name: z.string().min(1, { message: 'file_name_required' }).max(255, { message: 'too_long' }),
  file_url: z.string().url({ message: 'invalid_url' }).max(1000, { message: 'too_long' }),
  mime_type: z.string().min(1, { message: 'mime_type_required' }).max(255, { message: 'too_long' }),
  size_bytes: z.number().int().positive({ message: 'invalid_size' }),
  alt_text: z.string().max(1000, { message: 'too_long' }).optional().nullable(),
  folder: z.string()
    .max(255, { message: 'too_long' })
    .refine((val) => !val.includes('..'), { message: 'invalid_folder_path' })
    .default('/'),
});

export const updateMediaSchema = z.object({
  file_name: z.string().min(1, { message: 'file_name_empty' }).max(255, { message: 'too_long' }).optional(),
  alt_text: z.string().max(1000, { message: 'too_long' }).optional().nullable(),
  folder: z.string()
    .max(255, { message: 'too_long' })
    .refine((val) => !val.includes('..'), { message: 'invalid_folder_path' })
    .optional(),
});
