import { describe, it, expect } from 'vitest';
import { createServiceCategorySchema, updateServiceCategorySchema } from '../../src/validators/service-category.validators';

describe('Validators: Category - createServiceCategorySchema', () => {
  const validPayload = {
    name: 'Standard Category Name',
    slug: 'standard-category-slug-123',
    meta_data: [],
    seo_data: {},
    sort_order: 1,
    is_active: true
  };

  it('should accept valid category payload', () => {
    const result = createServiceCategorySchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Standard Category Name');
      expect(result.data.slug).toBe('standard-category-slug-123');
    }
  });

  it('should trim and sanitize category name', () => {
    const payload = {
      ...validPayload,
      name: '  Health & <b>Beauty</b>  '
    };
    const result = createServiceCategorySchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Health &amp; &lt;b&gt;Beauty&lt;/b&gt;');
    }
  });

  it('should reject empty category name', () => {
    const payload = {
      ...validPayload,
      name: ''
    };
    const result = createServiceCategorySchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues;
      expect(issues[0].message).toBe('name_required');
    }
  });

  it('should reject missing category name', () => {
    const { name, ...payload } = validPayload;
    const result = createServiceCategorySchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('should reject extremely long names (exceeding 255 characters)', () => {
    const payload = {
      ...validPayload,
      name: 'A'.repeat(256)
    };
    const result = createServiceCategorySchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues;
      expect(issues[0].message).toBe('too_long');
    }
  });

  it('should reject missing slug', () => {
    const { slug, ...payload } = validPayload;
    const result = createServiceCategorySchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues;
      expect(issues[0].code).toBe('invalid_type');
    }
  });

  it('should reject invalid slug formats containing spaces, uppercase, or special characters', () => {
    const invalidSlugs = [
      'Invalid-Slug',
      'invalid slug',
      'invalid_slug',
      'slug!',
      'slug/path'
    ];

    for (const slug of invalidSlugs) {
      const payload = {
        ...validPayload,
        slug
      };
      const result = createServiceCategorySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues;
        expect(issues[0].message).toBe('invalid_slug_format');
      }
    }
  });

  it('should accept valid Arabic slugs', () => {
    const payload = {
      ...validPayload,
      slug: 'العناية-بالشعر-123'
    };
    const result = createServiceCategorySchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('should reject Arabic slugs with invalid special characters', () => {
    const payload = {
      ...validPayload,
      slug: 'العناية-بالشعر؟'
    };
    const result = createServiceCategorySchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('should reject duplicate metadata block labels', () => {
    const payload = {
      ...validPayload,
      meta_data: [
        { id: 'b1', type: 'text-info', label: 'Priority', data: { text: 'high' } },
        { id: 'b2', type: 'text-description', label: 'priority', data: { text: 'low' } }
      ]
    };
    const result = createServiceCategorySchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('custom_field_label_duplicate');
    }
  });

  it('should apply defaults for sort_order and is_active', () => {
    const { sort_order, is_active, ...payload } = validPayload;
    const result = createServiceCategorySchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort_order).toBe(0);
      expect(result.data.is_active).toBe(true);
    }
  });

  it('should reject non-integer sort_order', () => {
    const payload = {
      ...validPayload,
      sort_order: 2.3
    };
    const result = createServiceCategorySchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('invalid_sort_order');
    }
  });
});

describe('Validators: Category - updateServiceCategorySchema', () => {
  it('should accept partial payloads for updates', () => {
    const result = updateServiceCategorySchema.safeParse({
      name: 'New Name Only'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('New Name Only');
      expect(result.data.slug).toBeUndefined();
    }
  });

  it('should not apply default values for sort_order or is_active during partial updates', () => {
    const result = updateServiceCategorySchema.safeParse({
      name: 'New Name Only'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort_order).toBeUndefined();
      expect(result.data.is_active).toBeUndefined();
    }
  });

  it('should validate partial slug format if slug is provided', () => {
    const result = updateServiceCategorySchema.safeParse({
      slug: 'invalid_slug_for_update'
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues;
      expect(issues[0].message).toBe('invalid_slug_format');
    }
  });
});
