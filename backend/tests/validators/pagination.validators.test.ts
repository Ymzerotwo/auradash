import { describe, it, expect } from 'vitest';
import { paginationSchema } from '../../src/validators/pagination.validators';

describe('Pagination Validators', () => {
  it('should validate valid pagination parameters and apply defaults', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.search).toBeUndefined();
    }
  });

  it('should coerce string parameters to integers', () => {
    const result = paginationSchema.safeParse({
      page: '3',
      limit: '50',
      search: 'Test Search Query'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
      expect(result.data.search).toBe('Test Search Query');
    }
  });

  it('should fail if limit is above max 100', () => {
    const result = paginationSchema.safeParse({
      limit: 101
    });
    expect(result.success).toBe(false);
  });

  it('should fail if page is below min 1', () => {
    const result = paginationSchema.safeParse({
      page: 0
    });
    expect(result.success).toBe(false);
  });
});
