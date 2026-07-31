import { z } from 'zod';
import { sanitizeForDb } from '../utils/sanitize';

/**
 * ==========================================
 *        AuraDash Media Validators
 * ==========================================
 * 
 * Defines Zod schemas for validating incoming media metadata updates.
 * Provides a strong line of defense against malformed or malicious inputs.
 */

/**
 * Validates metadata updates for existing media files.
 * 
 * CRITICAL NOTE: 'folder' strictly rejects path traversals (..) to prevent
 * malicious repositioning of files within the storage bucket.
 * 'sanitizeForDb' ensures XSS tags are escaped before saving to the DB.
 */
export const updateMediaSchema = z.object({
  file_name: z.string().min(1, { message: 'file_name_empty' }).max(255, { message: 'too_long' }).optional().transform(val => val ? sanitizeForDb(val) : val),
  alt_text: z.string().max(1000, { message: 'too_long' }).optional().nullable().transform(val => val ? sanitizeForDb(val) : val),
  folder: z.string()
    .max(255, { message: 'too_long' })
    .refine(val => !val.includes('..'), { message: 'invalid_folder_path' })
    .transform(sanitizeForDb)
    .optional(),
});
