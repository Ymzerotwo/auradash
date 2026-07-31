import { describe, it, expect } from 'vitest';
import { createServiceSchema, updateServiceSchema } from '../../src/validators/service.validators';

describe('Validators: Service - createServiceSchema', () => {
  const validPayload = {
    category_id: 'cat-123',
    name: 'Standard Service Name',
    slug: 'standard-service-slug-123',
    meta_data: [],
    seo_data: {},
    sort_order: 1,
    is_active: true
  };

  it('should accept valid service payload', () => {
    const result = createServiceSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Standard Service Name');
      expect(result.data.slug).toBe('standard-service-slug-123');
    }
  });

  it('should trim and sanitize service name and category_id', () => {
    const payload = {
      ...validPayload,
      category_id: '  <script>alert("xss")</script>cat-id  ',
      name: '  Web <b>Development</b>  '
    };
    const result = createServiceSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category_id).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;cat-id');
      expect(result.data.name).toBe('Web &lt;b&gt;Development&lt;/b&gt;');
    }
  });

  it('should reject empty service name', () => {
    const payload = {
      ...validPayload,
      name: ''
    };
    const result = createServiceSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues;
      expect(issues[0].message).toBe('name_required');
    }
  });

  it('should reject missing service name', () => {
    const { name, ...payload } = validPayload;
    const result = createServiceSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('should reject extremely long names (exceeding 255 characters)', () => {
    const payload = {
      ...validPayload,
      name: 'A'.repeat(256)
    };
    const result = createServiceSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues;
      expect(issues[0].message).toBe('too_long');
    }
  });

  it('should reject missing slug', () => {
    const { slug, ...payload } = validPayload;
    const result = createServiceSchema.safeParse(payload);
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
      const result = createServiceSchema.safeParse(payload);
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
      slug: 'تغيير-زيت-المحرك-123'
    };
    const result = createServiceSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('should reject Arabic slugs with invalid special characters', () => {
    const payload = {
      ...validPayload,
      slug: 'تغيير-زيت-المحرك؟'
    };
    const result = createServiceSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('should reject duplicate metadata block labels', () => {
    const payload = {
      ...validPayload,
      meta_data: [
        { id: 'b1', type: 'text-info', label: 'Price', data: { text: '100' } },
        { id: 'b2', type: 'text-description', label: 'price', data: { text: '200' } }
      ]
    };
    const result = createServiceSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('custom_field_label_duplicate');
    }
  });

  it('should reject empty metadata block labels', () => {
    const payload = {
      ...validPayload,
      meta_data: [
        { id: 'b1', type: 'text-info', label: '  ', data: { text: '100' } }
      ]
    };
    const result = createServiceSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('custom_field_label_required');
    }
  });

  it('should apply defaults for sort_order and is_active', () => {
    const { sort_order, is_active, ...payload } = validPayload;
    const result = createServiceSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort_order).toBe(0);
      expect(result.data.is_active).toBe(true);
    }
  });

  it('should reject non-integer sort_order', () => {
    const payload = {
      ...validPayload,
      sort_order: 1.5
    };
    const result = createServiceSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('invalid_sort_order');
    }
  });

  it('should reject string sort_order', () => {
    const payload = {
      ...validPayload,
      sort_order: '1'
    };
    const result = createServiceSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

describe('Validators: Service - updateServiceSchema', () => {
  it('should accept partial payloads for updates', () => {
    const result = updateServiceSchema.safeParse({
      name: 'Updated Name Only'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Updated Name Only');
      expect(result.data.slug).toBeUndefined();
    }
  });

  it('should not apply default values for sort_order or is_active during partial updates', () => {
    const result = updateServiceSchema.safeParse({
      name: 'Updated Name Only'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort_order).toBeUndefined();
      expect(result.data.is_active).toBeUndefined();
    }
  });

  it('should validate partial slug format if slug is provided', () => {
    const result = updateServiceSchema.safeParse({
      slug: 'invalid_slug_for_update'
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues;
      expect(issues[0].message).toBe('invalid_slug_format');
    }
  });
});

describe('Validators: Service - meta_data & seo_data validation', () => {
  const basePayload = {
    name: 'Test Service',
    slug: 'test-service'
  };

  describe('meta_data item type constraints', () => {
    it('should accept valid text-info and text-description metadata', () => {
      const result = createServiceSchema.safeParse({
        ...basePayload,
        meta_data: [
          { id: '1', type: 'text-info', label: 'Info', data: { text: 'Info text' } },
          { id: '2', type: 'text-description', label: 'Desc', data: { text: 'Description text' } }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should reject text-info text longer than 2000 chars', () => {
      const result = createServiceSchema.safeParse({
        ...basePayload,
        meta_data: [
          { id: '1', type: 'text-info', label: 'Info', data: { text: 'A'.repeat(2001) } }
        ]
      });
      expect(result.success).toBe(false);
    });

    it('should reject text-description text longer than 5000 chars', () => {
      const result = createServiceSchema.safeParse({
        ...basePayload,
        meta_data: [
          { id: '1', type: 'text-description', label: 'Desc', data: { text: 'A'.repeat(5001) } }
        ]
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid icon metadata', () => {
      const result = createServiceSchema.safeParse({
        ...basePayload,
        meta_data: [
          { id: '1', type: 'icon', label: 'Icon Label', data: { name: 'star-icon' } }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid date_time metadata', () => {
      const result = createServiceSchema.safeParse({
        ...basePayload,
        meta_data: [
          { id: '1', type: 'date_time', label: 'Date', data: { value: '2026-06-19T12:00:00Z' } }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid list metadata', () => {
      const result = createServiceSchema.safeParse({
        ...basePayload,
        meta_data: [
          { id: '1', type: 'list', label: 'Items', data: { items: ['Item 1', 'Item 2'] } }
        ]
      });
      expect(result.success).toBe(true);
    });
  });

  describe('meta_data URL & XSS protocol checks', () => {
    it('should accept valid http/https URLs for photo, video, and link', () => {
      const result = createServiceSchema.safeParse({
        ...basePayload,
        meta_data: [
          { id: '1', type: 'photo', label: 'Photo', data: { url: 'https://images.com/pic.png', alt: 'Pic' } },
          { id: '2', type: 'video', label: 'Video', data: { url: 'http://videos.com/clip.mp4' } },
          { id: '3', type: 'link', label: 'Link', data: { url: 'https://external.com', label: 'Go' } }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should reject photo url with non-http/https schemes (XSS prevention)', () => {
      const invalidSchemes = ['javascript:alert(1)', 'ftp://files.com/img.jpg', 'data:image/png;base64,...'];
      for (const url of invalidSchemes) {
        const result = createServiceSchema.safeParse({
          ...basePayload,
          meta_data: [
            { id: '1', type: 'photo', label: 'Photo', data: { url, alt: 'Malicious' } }
          ]
        });
        expect(result.success).toBe(false);
      }
    });

    it('should reject video url with non-http/https schemes', () => {
      const result = createServiceSchema.safeParse({
        ...basePayload,
        meta_data: [
          { id: '1', type: 'video', label: 'Video', data: { url: 'javascript:window.location="..."' } }
        ]
      });
      expect(result.success).toBe(false);
    });

    it('should reject link url with non-http/https schemes', () => {
      const result = createServiceSchema.safeParse({
        ...basePayload,
        meta_data: [
          { id: '1', type: 'link', label: 'Link', data: { url: 'javascript:alert(9)', label: 'Click' } }
        ]
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid youtube domains in video-youtube metadata', () => {
      const validYoutube = [
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ'
      ];
      for (const url of validYoutube) {
        const result = createServiceSchema.safeParse({
          ...basePayload,
          meta_data: [
            { id: '1', type: 'video-youtube', label: 'YouTube Video', data: { url } }
          ]
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject non-youtube domains in video-youtube metadata (Script embed protection)', () => {
      const invalidYoutube = [
        'https://vimeo.com/12345',
        'https://youtube.attacker.com/watch',
        'javascript:alert(2)'
      ];
      for (const url of invalidYoutube) {
        const result = createServiceSchema.safeParse({
          ...basePayload,
          meta_data: [
            { id: '1', type: 'video-youtube', label: 'YouTube Video', data: { url } }
          ]
        });
        expect(result.success).toBe(false);
      }
    });
  });

  describe('seo_data validation & XSS protocol checks', () => {
    it('should accept valid seo_data details', () => {
      const result = createServiceSchema.safeParse({
        ...basePayload,
        seo_data: {
          meta_title: 'SEO Title',
          meta_description: 'SEO Desc',
          og_image: 'https://images.com/og.jpg',
          canonical_url: 'http://my-canonical.com',
          is_indexable: true
        }
      });
      expect(result.success).toBe(true);
    });

    it('should reject og_image and canonical_url with non-http/https schemes', () => {
      const payloadWithBadImage = {
        ...basePayload,
        seo_data: {
          og_image: 'javascript:alert(3)'
        }
      };
      const payloadWithBadCanonical = {
        ...basePayload,
        seo_data: {
          canonical_url: 'javascript:alert(4)'
        }
      };
      expect(createServiceSchema.safeParse(payloadWithBadImage).success).toBe(false);
      expect(createServiceSchema.safeParse(payloadWithBadCanonical).success).toBe(false);
    });
  });
});
