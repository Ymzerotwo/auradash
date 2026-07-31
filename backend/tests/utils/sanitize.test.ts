import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeForDb, escapeLikePattern } from '../../src/utils/sanitize';

describe('Sanitize Utility', () => {
  it('should strip < and > tags to prevent XSS', () => {
    const malicious = '<script>alert("hack")</script>';
    const safe = sanitizeHtml(malicious);
    expect(safe).toBe('&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt;');
  });

  it('should escape &, ", and \' to prevent XSS in attributes', () => {
    const normalText = 'Tom & Jerry said "Hello\'s"';
    const safe = sanitizeHtml(normalText);
    expect(safe).toBe('Tom &amp; Jerry said &quot;Hello&#39;s&quot;');
  });

  it('should handle null and undefined gracefully', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
  });

  it('should handle non-string inputs gracefully', () => {
    // @ts-ignore testing invalid input
    expect(sanitizeHtml(123)).toBe('123');
  });

  describe('sanitizeForDb', () => {
    it('should trim and sanitize strings', () => {
      const input = '  <p>Hello World</p>  ';
      expect(sanitizeForDb(input)).toBe('&lt;p&gt;Hello World&lt;/p&gt;');
    });
  });

  describe('escapeLikePattern', () => {
    it('should escape backslashes, percent signs, and underscores', () => {
      expect(escapeLikePattern('abc%def_ghi\\jkl')).toBe('abc\\%def\\_ghi\\\\jkl');
    });

    it('should handle non-string inputs gracefully', () => {
      // @ts-ignore testing invalid input
      expect(escapeLikePattern(123)).toBe('');
      // @ts-ignore testing invalid input
      expect(escapeLikePattern(null)).toBe('');
    });
  });
});

