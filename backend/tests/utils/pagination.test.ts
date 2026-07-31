import { describe, it, expect } from 'vitest';
import { getPaginationOptions } from '../../src/utils/pagination';

// ─── getPaginationOptions Tests ────────────────────────────────────────────────

describe('Utils: Pagination - getPaginationOptions', () => {
  it('should return default values when no arguments provided', () => {
    const result = getPaginationOptions();
    expect(result.page).toBe(1);
    expect(result.limit).toBe(25);
  });

  it('should return default values for null arguments', () => {
    const result = getPaginationOptions(null, null);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(25);
  });

  it('should return default values for undefined arguments', () => {
    const result = getPaginationOptions(undefined, undefined);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(25);
  });

  it('should parse valid page number', () => {
    const result = getPaginationOptions('3', '10');
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
  });

  it('should use custom default limit', () => {
    const result = getPaginationOptions(undefined, undefined, 50);
    expect(result.limit).toBe(50);
  });

  it('should clamp page to minimum 1', () => {
    const result = getPaginationOptions('0', '10');
    expect(result.page).toBe(1);
  });

  it('should clamp negative page to 1', () => {
    const result = getPaginationOptions('-5', '10');
    expect(result.page).toBe(1);
  });

  it('should clamp limit to minimum 1', () => {
    const result = getPaginationOptions('1', '0');
    expect(result.limit).toBe(1);
  });

  it('should clamp negative limit to 1', () => {
    const result = getPaginationOptions('1', '-10');
    expect(result.limit).toBe(1);
  });

  it('should cap limit at MAX_LIMIT (100)', () => {
    const result = getPaginationOptions('1', '500');
    expect(result.limit).toBe(100);
  });

  it('should accept exactly MAX_LIMIT (100)', () => {
    const result = getPaginationOptions('1', '100');
    expect(result.limit).toBe(100);
  });

  it('should handle non-numeric page string (fallback to 1)', () => {
    const result = getPaginationOptions('abc', '10');
    expect(result.page).toBe(1);
  });

  it('should handle non-numeric limit string (fallback to default)', () => {
    const result = getPaginationOptions('1', 'abc');
    expect(result.limit).toBe(25);
  });

  it('should handle floating point page (parseInt truncates)', () => {
    const result = getPaginationOptions('2.7', '10');
    expect(result.page).toBe(2);
  });

  it('should handle floating point limit (parseInt truncates)', () => {
    const result = getPaginationOptions('1', '15.9');
    expect(result.limit).toBe(15);
  });

  it('should handle empty string page', () => {
    const result = getPaginationOptions('', '10');
    expect(result.page).toBe(1);
  });

  it('should handle empty string limit', () => {
    const result = getPaginationOptions('1', '');
    expect(result.limit).toBe(25);
  });

  it('should handle whitespace-only strings', () => {
    const result = getPaginationOptions('  ', '  ');
    expect(result.page).toBe(1);
    expect(result.limit).toBe(25);
  });

  it('should handle large page numbers', () => {
    const result = getPaginationOptions('999999', '10');
    expect(result.page).toBe(999999);
  });

  it('should cap custom default limit to MAX_LIMIT', () => {
    const result = getPaginationOptions(undefined, undefined, 200);
    // Custom default 200 > MAX_LIMIT 100, but defaultLimit only applies when
    // no limitQuery is given, and MAX_LIMIT is applied to the parsed result
    expect(result.limit).toBe(100);
  });

  describe('Additional Robustness Tests', () => {
    it('should clamp a negative custom default limit to 1', () => {
      const result = getPaginationOptions(undefined, undefined, -10);
      expect(result.limit).toBe(1);
    });

    it('should handle non-string number inputs correctly by converting them to string first', () => {
      // @ts-ignore testing invalid typed input
      const result = getPaginationOptions(5, 12);
      expect(result.page).toBe(5);
      expect(result.limit).toBe(12);
    });
  });
});
