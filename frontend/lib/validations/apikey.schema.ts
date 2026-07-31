

import * as z from "zod";

/**
 * Zod validation schema for creating a new API Key.
 * 
 * CRITICAL NOTE: Enforces that domain is required when type is 'production'.
 * Test keys bypass domain requirements but are limited to a max duration.
 */
export const createApiKeySchema = z.object({
  type: z.enum(['production', 'test']).default('production'),
  name: z.string().min(2, { message: 'name_too_short' }).max(50, { message: 'name_too_long' }),
  domain: z.string()
    .max(255, { message: 'too_long' })
    .optional()
    .or(z.literal(''))
    .refine(val => !val || /^(https?:\/\/)?(localhost|([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(:\d+)?(\/.*)?$/.test(val), { message: 'invalid_domain' }),
  expiresInHours: z.number().int().min(1, { message: 'expires_too_short' }).max(24, { message: 'expires_too_long' }).default(24)
}).refine(data => {
  // Domain is required for production keys only
  if (data.type === 'production' && !data.domain) {
    return false;
  }
  return true;
}, {
  message: 'domain_required',
  path: ['domain']
});

export type CreateApiKeyDTO = z.infer<typeof createApiKeySchema>;

// For backward compatibility
export const getApiKeySchema = () => createApiKeySchema;
export type ApiKeyFormData = CreateApiKeyDTO;
