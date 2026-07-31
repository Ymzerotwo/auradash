import { describe, it, expect } from 'vitest';
import { createArticleSchema, updateArticleSchema } from '../../src/validators/article.validators';

describe('Validators: Article - createArticleSchema', () => {
  const validPayload = {
    category_id: 'cat-123',
    title: 'Standard Article Title',
    slug: 'standard-article-slug-123',
    excerpt: 'This is a short excerpt.',
    preview_image_url: 'https://example.com/image.png',
    reading_time_minutes: 5,
    author_id: 'author-123',
    published_at: '2026-06-15 09:00:00',
    meta_data: [
      { id: 'b1', type: 'text-info', label: 'Introduction', data: { text: 'Intro text' } },
      { id: 'b2', type: 'text-description', label: 'Details', data: { text: 'Detail text' } }
    ],
    seo_data: {
      meta_title: 'SEO Title',
      meta_description: 'SEO Description',
      og_image: 'https://example.com/og.png',
      canonical_url: 'https://example.com/canonical',
      is_indexable: true
    },
    sort_order: 1,
    is_active: true
  };

  it('should accept valid article payload', () => {
    const result = createArticleSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Standard Article Title');
      expect(result.data.slug).toBe('standard-article-slug-123');
    }
  });

  it('should accept valid Arabic slugs', () => {
    const payload = {
      ...validPayload,
      slug: 'أهمية-تغيير-زيت-المحرك-123'
    };
    const result = createArticleSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('should reject Arabic slugs with invalid special characters', () => {
    const payload = {
      ...validPayload,
      slug: 'أهمية-تغيير-زيت-المحرك؟'
    };
    const result = createArticleSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('should reject duplicate custom field block labels', () => {
    const payload = {
      ...validPayload,
      meta_data: [
        { id: 'b1', type: 'text-info', label: 'Duplicate Label', data: { text: 'First' } },
        { id: 'b2', type: 'text-description', label: '  duplicate label  ', data: { text: 'Second' } }
      ]
    };
    const result = createArticleSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('custom_field_label_duplicate');
    }
  });

  it('should reject empty custom field block labels', () => {
    const payload = {
      ...validPayload,
      meta_data: [
        { id: 'b1', type: 'text-info', label: '   ', data: { text: 'First' } }
      ]
    };
    const result = createArticleSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('custom_field_label_required');
    }
  });

  /* 🛡️ Security / Penetration Tests */
  describe('Penetration & Robustness Tests', () => {
    it('should sanitize HTML tags from string fields (XSS defense)', () => {
      const payload = {
        ...validPayload,
        title: '  <script>alert("xss")</script>My Title  ',
        excerpt: '  An <iframe src="javascript:alert(1)"></iframe> excerpt  '
      };
      const result = createArticleSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;My Title');
        expect(result.data.excerpt).toBe('An &lt;iframe src=&quot;javascript:alert(1)&quot;&gt;&lt;/iframe&gt; excerpt');
      }
    });

    it('should sanitize HTML tags in meta_data custom fields labels', () => {
      const payload = {
        ...validPayload,
        meta_data: [
          { id: 'b1', type: 'text-info', label: '<b>Bold Label</b>', data: { text: 'Test' } }
        ]
      };
      const result = createArticleSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success && result.data.meta_data) {
        expect(result.data.meta_data[0].label).toBe('&lt;b&gt;Bold Label&lt;/b&gt;');
      }
    });

    it('should reject extremely long fields (SQL / buffer overflow prevention)', () => {
      const payload = {
        ...validPayload,
        title: 'A'.repeat(500)
      };
      const result = createArticleSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('too_long');
      }
    });

    it('should reject non-integer sort_order', () => {
      const payload = {
        ...validPayload,
        sort_order: 1.5
      };
      const result = createArticleSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('invalid_sort_order');
      }
    });
  });
});

describe('Validators: Article - updateArticleSchema', () => {
  it('should accept partial payloads for updates', () => {
    const result = updateArticleSchema.safeParse({
      title: 'Updated Title Only'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Updated Title Only');
      expect(result.data.slug).toBeUndefined();
    }
  });

  it('should not apply default values for sort_order or is_active during partial updates', () => {
    const result = updateArticleSchema.safeParse({
      title: 'Updated Title Only'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort_order).toBeUndefined();
      expect(result.data.is_active).toBeUndefined();
    }
  });
});
