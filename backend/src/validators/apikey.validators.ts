/**
 * ==========================================
 *        AuraDash API Key Validators
 * ==========================================
 * 
 * Zod schemas for validating incoming request payloads during API Key creation.
 * Provides strong typing and prevents malformed data from reaching the controllers.
 */

import { z } from 'zod';
import { sanitizeForDb } from '../utils/sanitize';

/**
 * Schema for creating a new API Key.
 * 
 * CRITICAL NOTE: 'domain' is required only for 'production' keys.
 * 'expiresInHours' is limited to a maximum of 24 hours for security purposes.
 */
export const createApiKeySchema = z.object({
  type: z.enum(['production', 'test']).optional().default('production'),
  name: z.string().min(2, { message: 'name_too_short' }).max(50, { message: 'name_too_long' }).transform(sanitizeForDb),
  // Validates standard domain formats including localhost
  domain: z.string().max(255, { message: 'too_long' }).transform(sanitizeForDb).optional().refine(val => !val || /^(https?:\/\/)?(localhost|([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(:\d+)?(\/.*)?$/.test(val), { message: 'invalid_domain' }),
  expiresInHours: z.number().int().min(1, { message: 'expires_too_short' }).max(24, { message: 'expires_too_long' }).optional().default(24)
}).refine(data => {
  // Domain is strictly required if the key type is production
  if (data.type === 'production' && !data.domain) {
    return false;
  }
  return true;
}, {
  message: 'domain_required',
  path: ['domain']
});

export type CreateApiKeyDTO = z.infer<typeof createApiKeySchema>;
