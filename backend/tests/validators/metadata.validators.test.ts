import { describe, it, expect } from 'vitest';
import { metaDataSchema, seoDataSchema } from '../../src/validators/metadata.validators';

describe('Metadata & SEO Validators', () => {
  describe('metaDataSchema', () => {
    it('should validate valid dynamic metadata items', () => {
      const validMetaData = [
        {
          id: 'field_1',
          label: 'Contact Info',
          type: 'text-info',
          data: { text: 'Call us at +123' }
        },
        {
          id: 'field_2',
          label: 'Website Link',
          type: 'link',
          data: { url: 'https://example.com', label: 'Visit website' }
        },
        {
          id: 'field_3',
          label: 'YouTube Embed',
          type: 'video-youtube',
          data: { url: 'https://www.youtube.com/watch?v=123' }
        }
      ];

      const result = metaDataSchema.safeParse(validMetaData);
      expect(result.success).toBe(true);
    });

    it('should fail if a youtube URL is not from youtube', () => {
      const invalidMetaData = [
        {
          id: 'field_1',
          label: 'Malicious Link',
          type: 'video-youtube',
          data: { url: 'https://malicious.com/video' }
        }
      ];

      const result = metaDataSchema.safeParse(invalidMetaData);
      expect(result.success).toBe(false);
    });

    it('should fail if label is duplicate', () => {
      const duplicateData = [
        {
          id: 'field_1',
          label: 'Common Label',
          type: 'text-info',
          data: { text: 'Info 1' }
        },
        {
          id: 'field_2',
          label: 'common label', // Same label, different casing
          type: 'text-info',
          data: { text: 'Info 2' }
        }
      ];

      const result = metaDataSchema.safeParse(duplicateData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('custom_field_label_duplicate');
      }
    });

    it('should fail if label is empty', () => {
      const emptyLabelData = [
        {
          id: 'field_1',
          label: '   ',
          type: 'text-info',
          data: { text: 'Info 1' }
        }
      ];

      const result = metaDataSchema.safeParse(emptyLabelData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('custom_field_label_required');
      }
    });
  });

  describe('seoDataSchema', () => {
    it('should validate valid SEO data', () => {
      const validSEO = {
        meta_title: 'SEO Title',
        meta_description: 'SEO Description',
        og_image: 'https://example.com/image.jpg',
        canonical_url: 'https://example.com/canonical',
        is_indexable: true
      };

      const result = seoDataSchema.safeParse(validSEO);
      expect(result.success).toBe(true);
    });

    it('should fail if canonical_url has javascript protocol (XSS defense)', () => {
      const invalidSEO = {
        canonical_url: 'javascript:alert("XSS")'
      };

      const result = seoDataSchema.safeParse(invalidSEO);
      expect(result.success).toBe(false);
    });
  });
});
