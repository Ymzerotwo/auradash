/**
 * ==========================================
 * AuraDash Workspace Validators
 * ==========================================
 * Defines Zod schemas to securely validate incoming payload data for
 * workspace settings, preventing injection attacks and malformed data.
 */
import { z } from 'zod';
import { sanitizeForDb } from '../utils/sanitize';

export const updateIdentitySchema = z.object({
  siteName: z.string().min(1, { message: 'site_name_required' }).max(255, { message: 'too_long' }).transform(sanitizeForDb),
  logoUrl: z.string().max(1000, { message: 'too_long' }).refine(val => !val || !val.startsWith('data:'), { message: 'invalid_logo_format' }).nullable().optional().or(z.literal('')).transform(val => val ? sanitizeForDb(val) : val),
});

const phoneValidation = z.string()
  .max(255, { message: 'too_long' })
  .optional()
  .or(z.literal(''))
  .refine(val => {
    if (!val) return true;
    if (!val.startsWith('+')) return false;
    const digits = val.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }, { message: 'invalid_phone_format' })
  .transform(val => val ? sanitizeForDb(val) : val);

export const updateContactSchema = z.object({
  contactInfo: z.object({
    whatsapp: phoneValidation,
    phone: phoneValidation,
    email: z.string().trim().toLowerCase().max(255, { message: 'too_long' }).email({ message: 'invalid_email' }).optional().or(z.literal('')),
  }),
});

export const updateSocialSchema = z.object({
  socialMedia: z.object({
    facebook: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_facebook_url' }).optional().or(z.literal('')).transform(val => val ? sanitizeForDb(val) : val),
    instagram: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_instagram_url' }).optional().or(z.literal('')).transform(val => val ? sanitizeForDb(val) : val),
    twitter: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_twitter_url' }).optional().or(z.literal('')).transform(val => val ? sanitizeForDb(val) : val),
    linkedin: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_linkedin_url' }).optional().or(z.literal('')).transform(val => val ? sanitizeForDb(val) : val),
    tiktok: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_tiktok_url' }).optional().or(z.literal('')).transform(val => val ? sanitizeForDb(val) : val),
    youtube: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_youtube_url' }).optional().or(z.literal('')).transform(val => val ? sanitizeForDb(val) : val),
    snapchat: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_snapchat_url' }).optional().or(z.literal('')).transform(val => val ? sanitizeForDb(val) : val),
    telegram: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_telegram_url' }).optional().or(z.literal('')).transform(val => val ? sanitizeForDb(val) : val),
    pinterest: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_pinterest_url' }).optional().or(z.literal('')).transform(val => val ? sanitizeForDb(val) : val),
    threads: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_threads_url' }).optional().or(z.literal('')).transform(val => val ? sanitizeForDb(val) : val),
  }),
});

export const updateLocationsSchema = z.object({
  locations: z.array(z.object({
    id: z.string().max(255, { message: 'too_long' }).transform(sanitizeForDb),
    label: z.string().max(255, { message: 'too_long' }).optional().or(z.literal('')).transform(val => val ? sanitizeForDb(val) : val),
    address: z.string().max(1000, { message: 'too_long' }).optional().or(z.literal('')).transform(val => val ? sanitizeForDb(val) : val),
    city: z.string().max(255, { message: 'too_long' }).optional().or(z.literal('')).transform(val => val ? sanitizeForDb(val) : val),
    country: z.string().max(255, { message: 'too_long' }).optional().or(z.literal('')).transform(val => val ? sanitizeForDb(val) : val),
    mapUrl: z.string().max(2000, { message: 'too_long' }).url({ message: 'invalid_map_url' }).refine(url => url.includes('google.com/maps') || url.includes('maps.google.com') || url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps'), { message: 'must_be_google_maps_url' }).optional().or(z.literal('')).transform(val => val ? sanitizeForDb(val) : val),
  })).max(20, { message: 'max_20_locations' }),
});

export const updateWorkingHoursSchema = z.object({
  workingHours: z.record(z.enum(['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday']), z.object({
    open: z.string().max(255, { message: 'too_long' }).regex(/^([01]?\d|2[0-3]):([0-5]\d)$/, { message: 'invalid_time_format' }).optional().or(z.literal('')).transform(val => val ? sanitizeForDb(val) : val),
    close: z.string().max(255, { message: 'too_long' }).regex(/^([01]?\d|2[0-3]):([0-5]\d)$/, { message: 'invalid_time_format' }).optional().or(z.literal('')).transform(val => val ? sanitizeForDb(val) : val),
    closed: z.boolean(),
  })),
});
