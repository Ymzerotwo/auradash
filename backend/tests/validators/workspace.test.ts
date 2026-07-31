import { describe, it, expect } from 'vitest';
import { 
  updateIdentitySchema,
  updateContactSchema,
  updateSocialSchema,
  updateLocationsSchema,
  updateWorkingHoursSchema
} from '../../src/validators/general-settings.validators';

describe('Validators: Workspace - Modular Schemas', () => {
  describe('updateIdentitySchema', () => {
    it('should accept valid identity payload', () => {
      const payload = {
        siteName: 'AuraDash Site',
        logoUrl: 'https://example.com/logo.png',
      };
      const result = updateIdentitySchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.siteName).toBe('AuraDash Site');
      }
    });

    it('should sanitize HTML inputs', () => {
      const payload = {
        siteName: '<b>AuraDash</b>',
      };
      const result = updateIdentitySchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.siteName).toBe('&lt;b&gt;AuraDash&lt;/b&gt;');
      }
    });

    it('should reject base64 data URIs for logos (Data Injection prevention)', () => {
      const payload = {
        siteName: 'AuraDash',
        logoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA'
      };
      const result = updateIdentitySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('invalid_logo_format');
      }
    });
  });

  describe('updateContactSchema', () => {
    it('should accept valid contact info', () => {
      const payload = {
        contactInfo: {
          whatsapp: '+1234567890',
          phone: '+1234567890',
          email: 'admin@auradash.com'
        }
      };
      const result = updateContactSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('updateSocialSchema', () => {
    it('should accept valid social links', () => {
      const payload = {
        socialMedia: {
          facebook: 'https://facebook.com/auradash',
          instagram: 'https://instagram.com/auradash',
          twitter: 'https://twitter.com/auradash',
          linkedin: 'https://linkedin.com/company/auradash',
          tiktok: 'https://tiktok.com/@auradash',
          youtube: 'https://youtube.com/c/auradash',
          snapchat: 'https://snapchat.com/add/auradash',
          telegram: 'https://t.me/auradash',
          pinterest: 'https://pinterest.com/auradash',
          threads: 'https://threads.net/@auradash'
        }
      };
      const result = updateSocialSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('updateLocationsSchema', () => {
    it('should reject non-Google Maps URLs for location maps', () => {
      const payload = {
        locations: [
          {
            id: 'loc-1',
            label: 'Office',
            address: '123 St',
            city: 'NY',
            country: 'USA',
            mapUrl: 'https://evil-maps.com/xyz'
          }
        ]
      };
      const result = updateLocationsSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('must_be_google_maps_url');
      }
    });
  });

  describe('updateWorkingHoursSchema', () => {
    it('should reject invalid time format for working hours', () => {
      const payload = {
        workingHours: {
          saturday: { open: '', close: '', closed: true },
          sunday: { open: '', close: '', closed: true },
          monday: { open: '09-00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false },
          thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false }
        }
      };
      const result = updateWorkingHoursSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});
