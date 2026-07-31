import { describe, it, expect } from 'vitest';
import { checkSlugSchema } from '../../src/validators/check-slug.validators';

describe('Check Slug Validators', () => {
  it('should validate valid slug check request', () => {
    const validData = {
      slug: 'valid-slug-123',
      table: 'services',
      exclude_id: 'some_id_to_exclude'
    };

    const result = checkSlugSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe('valid-slug-123');
    }
  });

  it('should fail if table name is invalid', () => {
    const invalidData = {
      slug: 'valid-slug',
      table: 'invalid_table_name'
    };

    const result = checkSlugSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should fail if slug is missing', () => {
    const invalidData = {
      table: 'services'
    };

    const result = checkSlugSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
