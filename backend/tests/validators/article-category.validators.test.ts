import { describe, it, expect } from 'vitest';
import { createArticleCategorySchema, updateArticleCategorySchema } from '../../src/validators/article-category.validators';

describe('Article Category Validators', () => {
  describe('createArticleCategorySchema', () => {
    it('should validate valid article category data', () => {
      const validData = {
        title: 'Technology & Gaming',
        slug: 'tech-gaming',
        excerpt: 'Articles about tech.',
        preview_image_url: 'https://example.com/image.png',
        meta_data: [
          { id: '1', label: 'Field 1', type: 'text-info', data: { text: 'Some info' } }
        ],
        seo_data: {
          meta_title: 'SEO Title',
          meta_description: 'SEO Desc'
        },
        sort_order: 5,
        is_active: true
      };

      const result = createArticleCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Technology &amp; Gaming');
        expect(result.data.is_active).toBe(true);
      }
    });

    it('should fail if title is missing or empty', () => {
      const invalidData = {
        title: '',
        slug: 'tech-gaming'
      };

      const result = createArticleCategorySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('title_required');
      }
    });

    it('should fail if slug format is invalid', () => {
      const invalidData = {
        title: 'Tech',
        slug: 'tech_gaming!'
      };

      const result = createArticleCategorySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('invalid_slug_format');
      }
    });

    it('should transform is_active from 1/0 to boolean', () => {
      const validData = {
        title: 'Tech',
        slug: 'tech',
        is_active: 1
      };

      const result = createArticleCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_active).toBe(true);
      }
    });
  });

  describe('updateArticleCategorySchema', () => {
    it('should validate empty update data (partial)', () => {
      const result = updateArticleCategorySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should fail if slug is too long', () => {
      const invalidData = {
        slug: 'a'.repeat(256)
      };

      const result = updateArticleCategorySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('too_long');
      }
    });
  });
});
