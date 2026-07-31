/**
 * ==========================================
 *        AuraDash Workspace Services
 * ==========================================
 * 
 * Business logic layer for managing Workspace operations.
 */

import { logger } from '../utils/logger';
// ==========================================
// AuraDash Workspace Services
// ==========================================
// Contains the core business logic and database operations for managing
// workspace and business settings (e.g., updating site identity, logos, contacts).
import { D1Database } from '@cloudflare/workers-types';
import { removeMediaByUrl } from '../utils/media-upload';

export const WorkspaceService = {
  /**
   * Retrieves the singleton Business_Settings row.
   * @param db D1Database instance
   * @returns Parsed JSON configuration object or null if it doesn't exist
   * 
   * @param db - The D1 Database instance.
   */
  getSettings: async (db: D1Database) => {
    const settings = await db.prepare('SELECT * FROM Business_Settings LIMIT 1').first();
    if (!settings) return null;

    return {
      id: settings.id,
      siteName: settings.business_name || '',
      logoUrl: settings.logo_url || null,
      contactInfo: settings.contact_info ? JSON.parse(settings.contact_info as string) : {},
      socialMedia: settings.social_links ? JSON.parse(settings.social_links as string) : {},
      locations: settings.locations ? JSON.parse(settings.locations as string) : [],
      workingHours: settings.working_hours ? JSON.parse(settings.working_hours as string) : {},
    };
  },

  /**
   * Updates the core identity (Business Name and Logo).
   * CRITICAL: Triggers deletion of the old logo from the R2 bucket to save storage space.
   * 
   * @param db - The D1 Database instance.
   */
  updateIdentity: async (db: D1Database, bucket: any, r2PublicUrl: string, body: { siteName: string; logoUrl?: string | null }) => {
    const existingSettings = await db.prepare('SELECT id, logo_url FROM Business_Settings LIMIT 1').first() as any;
    let oldLogoToDelete: string | null = null;

    if (existingSettings) {
      if (body.logoUrl !== undefined && body.logoUrl !== existingSettings.logo_url && existingSettings.logo_url) {
        oldLogoToDelete = existingSettings.logo_url;
      }

      await db.prepare(`
        UPDATE Business_Settings 
        SET business_name = ?, logo_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(body.siteName, body.logoUrl ?? null, existingSettings.id).run();
    } else {
      const newId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO Business_Settings (id, business_name, logo_url)
        VALUES (?, ?, ?)
      `).bind(newId, body.siteName, body.logoUrl ?? null).run();
    }

    if (oldLogoToDelete) {
      try {
        await removeMediaByUrl(oldLogoToDelete, db, bucket, r2PublicUrl);
      } catch (err) {
        logger.error('system', '[Workspace identity] Failed to delete old logo:', err);
      }
    }

    return true;
  },

  /**
   * Updates the contact information block (stored as JSON).
   * 
   * @param db - The D1 Database instance.
   */
  updateContact: async (db: D1Database, body: { contactInfo: any }) => {
    const existingSettings = await db.prepare('SELECT id FROM Business_Settings LIMIT 1').first() as any;
    const contactInfoJson = JSON.stringify(body.contactInfo);

    if (existingSettings) {
      await db.prepare(`
        UPDATE Business_Settings 
        SET contact_info = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(contactInfoJson, existingSettings.id).run();
    } else {
      const newId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO Business_Settings (id, business_name, contact_info)
        VALUES (?, '', ?)
      `).bind(newId, contactInfoJson).run();
    }

    return true;
  },

  /**
   * Updates the social media URL links (stored as JSON).
   * 
   * @param db - The D1 Database instance.
   */
  updateSocial: async (db: D1Database, body: { socialMedia: any }) => {
    const existingSettings = await db.prepare('SELECT id FROM Business_Settings LIMIT 1').first() as any;
    const socialLinksJson = JSON.stringify(body.socialMedia);

    if (existingSettings) {
      await db.prepare(`
        UPDATE Business_Settings 
        SET social_links = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(socialLinksJson, existingSettings.id).run();
    } else {
      const newId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO Business_Settings (id, business_name, social_links)
        VALUES (?, '', ?)
      `).bind(newId, socialLinksJson).run();
    }

    return true;
  },

  /**
   * Updates the physical branch locations (stored as JSON).
   * 
   * @param db - The D1 Database instance.
   */
  updateLocations: async (db: D1Database, body: { locations: any[] }) => {
    const existingSettings = await db.prepare('SELECT id FROM Business_Settings LIMIT 1').first() as any;
    const locationsJson = JSON.stringify(body.locations);

    if (existingSettings) {
      await db.prepare(`
        UPDATE Business_Settings 
        SET locations = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(locationsJson, existingSettings.id).run();
    } else {
      const newId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO Business_Settings (id, business_name, locations)
        VALUES (?, '', ?)
      `).bind(newId, locationsJson).run();
    }

    return true;
  },

  /**
   * Updates the weekly operating hours (stored as JSON).
   * 
   * @param db - The D1 Database instance.
   */
  updateWorkingHours: async (db: D1Database, body: { workingHours: any }) => {
    const existingSettings = await db.prepare('SELECT id FROM Business_Settings LIMIT 1').first() as any;
    const workingHoursJson = JSON.stringify(body.workingHours);

    if (existingSettings) {
      await db.prepare(`
        UPDATE Business_Settings 
        SET working_hours = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(workingHoursJson, existingSettings.id).run();
    } else {
      const newId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO Business_Settings (id, business_name, working_hours)
        VALUES (?, '', ?)
      `).bind(newId, workingHoursJson).run();
    }

    return true;
  }
};
