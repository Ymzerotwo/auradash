import { z } from "zod";

export const identitySchema = z.object({
  siteName: z.string().min(1, { message: 'site_name_required' }).max(100, { message: 'too_long' }),
  logoUrl: z.string().max(1000, { message: 'too_long' }).refine(val => !val || !val.startsWith('data:'), { message: 'invalid_logo_format' }).nullable().optional().or(z.literal('')),
});

const phoneValidation = z.string()
  .max(50, { message: 'too_long' })
  .optional()
  .or(z.literal(''))
  .refine(val => {
    if (!val) return true;
    if (!val.startsWith('+')) return false;
    const digits = val.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }, { message: 'invalid_phone_format' });

export const contactSchema = z.object({
  contactInfo: z.object({
    whatsapp: phoneValidation,
    phone: phoneValidation,
    email: z.string().trim().toLowerCase().email({ message: 'invalid_email' }).max(255, { message: 'too_long' }).optional().or(z.literal('')),
  }),
});

export const socialSchema = z.object({
  socialMedia: z.object({
    facebook: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_facebook_url' }).optional().or(z.literal('')),
    instagram: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_instagram_url' }).optional().or(z.literal('')),
    twitter: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_twitter_url' }).optional().or(z.literal('')),
    linkedin: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_linkedin_url' }).optional().or(z.literal('')),
    tiktok: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_tiktok_url' }).optional().or(z.literal('')),
    youtube: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_youtube_url' }).optional().or(z.literal('')),
    snapchat: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_snapchat_url' }).optional().or(z.literal('')),
    telegram: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_telegram_url' }).optional().or(z.literal('')),
    pinterest: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_pinterest_url' }).optional().or(z.literal('')),
    threads: z.string().max(1000, { message: 'too_long' }).url({ message: 'invalid_threads_url' }).optional().or(z.literal('')),
  }),
});

export const locationsSchema = z.object({
  locations: z.array(z.object({
    id: z.string().max(100, { message: 'too_long' }),
    label: z.string().max(100, { message: 'too_long' }).optional().or(z.literal('')),
    address: z.string().max(255, { message: 'too_long' }).optional().or(z.literal('')),
    city: z.string().max(100, { message: 'too_long' }).optional().or(z.literal('')),
    country: z.string().max(100, { message: 'too_long' }).optional().or(z.literal('')),
    mapUrl: z.string().max(2000, { message: 'too_long' }).url({ message: 'invalid_map_url' }).refine(url => url.includes('google.com/maps') || url.includes('maps.google.com') || url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps'), { message: 'must_be_google_maps_url' }).optional().or(z.literal('')),
  })).max(20, { message: 'max_20_locations' }),
});

export const workingHoursSchema = z.object({
  workingHours: z.record(z.enum(['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday']), z.object({
    open: z.string().max(5, { message: 'too_long' }).regex(/^([01]?\d|2[0-3]):([0-5]\d)$/, { message: 'invalid_time_format' }).optional().or(z.literal('')),
    close: z.string().max(5, { message: 'too_long' }).regex(/^([01]?\d|2[0-3]):([0-5]\d)$/, { message: 'invalid_time_format' }).optional().or(z.literal('')),
    closed: z.boolean(),
  })),
});
