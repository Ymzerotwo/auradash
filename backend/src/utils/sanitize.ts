/**
 * AuraDash Sanitize Utility
 * Utility functions for sanitizing user inputs to prevent XSS and SQL injection attacks.
 * It enforces robust escaping mechanisms for HTML and SQL contexts.
 */

const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapes HTML tag characters and quotes to prevent Cross-Site Scripting (XSS).
 * Purpose: Neutralizes potentially dangerous characters before they can be rendered 
 * in raw HTML contexts or email templates.
 * 
 * @param str The user-supplied string to sanitize
 * @returns Safely escaped string
 */
export const sanitizeHtml = (str: string | null | undefined): string => {
  if (str === null || str === undefined) return '';
  const stringified = String(str);
  return stringified.replace(/[&<>"']/g, (match) => htmlEntities[match] || match);
};

/**
 * Transforms and sanitizes inputs before storing them in the database.
 * Purpose: Can be used within Zod schemas (e.g., z.string().transform(sanitizeForDb)) 
 * to ensure that stored data is stripped of dangerous HTML tags and trailing whitespace.
 * 
 * @param val The string value to sanitize
 * @returns Cleaned string safe for database storage
 */
export const sanitizeForDb = (val: string): string => {
  if (typeof val !== 'string') return '';
  return sanitizeHtml(val.trim());
};

/**
 * Escapes SQL LIKE special characters (%, _, \) to prevent wildcard injection.
 * Purpose: Ensures that user-supplied search terms are treated as literal strings 
 * rather than pattern matchers, closing a significant SQL logic bypass vulnerability.
 * 
 * @param input The search term to escape
 * @returns Escaped string safe for use in SQL LIKE clauses
 */
export const escapeLikePattern = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
};
