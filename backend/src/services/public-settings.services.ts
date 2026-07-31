/**
 * ==========================================
 *        AuraDash Public Settings Services
 * ==========================================
 * 
 * Business logic layer for managing Public Settings operations.
 */

import { D1Database } from '@cloudflare/workers-types';

const parseJsonColumn = <T>(raw: unknown, fallback: T): T => {
  if (!raw) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try { return JSON.parse(raw); } catch { return fallback; }
};

export const PublicSettingsService = {
  /**
   * Performs the Get Global Settings operation.
   * 
   * @param db - The D1 Database instance.
   */
  getGlobalSettings: async (db: D1Database) => {
    const settings = await db.prepare('SELECT * FROM Business_Settings LIMIT 1').first();
    if (!settings) {
      return { siteName: '', logoUrl: null, contactInfo: {}, socialMedia: {}, locations: [], workingHours: {}, currency: 'USD', timezone: 'UTC' };
    }
    return {
      siteName: settings.business_name,
      logoUrl: settings.logo_url,
      contactInfo: parseJsonColumn(settings.contact_info, {}),
      socialMedia: parseJsonColumn(settings.social_links, {}),
      locations: parseJsonColumn(settings.locations, []),
      workingHours: parseJsonColumn(settings.working_hours, {}),
      currency: settings.currency || 'USD',
      timezone: settings.timezone || 'UTC',
    };
  }
};
