/**
 * Realistic sanitize-html mock for Cloudflare Workers test environment.
 * 
 * The real sanitize-html depends on htmlparser2 which requires Node.js
 * DOM APIs unavailable in the workerd runtime. This mock replicates the
 * core behavior needed for testing: tag stripping and attribute filtering.
 */

// Default allowed tags matching sanitize-html's actual defaults
const DEFAULT_ALLOWED_TAGS = [
  'address', 'article', 'aside', 'footer', 'header',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hgroup', 'main', 'nav', 'section',
  'blockquote', 'dd', 'div', 'dl', 'dt', 'figcaption', 'figure', 'hr',
  'li', 'menu', 'ol', 'p', 'pre', 'ul',
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn',
  'em', 'i', 'kbd', 'mark', 'q', 'rb', 'rp', 'rt', 'rtc', 'ruby',
  's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr',
  'caption', 'col', 'colgroup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr'
];

const DEFAULT_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  'a': ['href', 'name', 'target'],
  'img': ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading']
};

const DEFAULT_ALLOWED_SCHEMES = ['http', 'https', 'ftp', 'mailto', 'tel'];

interface SanitizeOptions {
  allowedTags?: string[] | false;
  allowedAttributes?: Record<string, string[]> | false;
  allowedSchemes?: string[];
  disallowedTagsMode?: 'discard' | 'escape' | 'recursiveEscape';
  allowProtocolRelative?: boolean;
  enforceHtmlBoundary?: boolean;
}

function sanitizeHtml(html: string, options: SanitizeOptions = {}): string {
  const allowedTags = options.allowedTags === false ? false : (options.allowedTags ?? DEFAULT_ALLOWED_TAGS);
  const allowedAttributes = options.allowedAttributes === false ? false : (options.allowedAttributes ?? DEFAULT_ALLOWED_ATTRIBUTES);
  const allowedSchemes = options.allowedSchemes ?? DEFAULT_ALLOWED_SCHEMES;

  // Strip all tags if allowedTags is empty array
  if (Array.isArray(allowedTags) && allowedTags.length === 0) {
    // First, completely remove script/style tags AND their content (discard mode)
    let cleaned = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
    // Then strip remaining tags
    return cleaned.replace(/<[^>]*>/g, '');
  }

  if (allowedTags === false) {
    return html;
  }

  // Process tags: keep allowed, strip disallowed
  let result = html;

  // First, completely remove script/style tags AND their content
  result = result.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');

  // Remove disallowed tags (those not in the allowed list)
  // Process self-closing and opening/closing tags
  result = result.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g, (match, tagName) => {
    const lower = tagName.toLowerCase();
    if (!allowedTags.includes(lower)) {
      return '';
    }
    
    // Tag is allowed — now filter attributes
    if (allowedAttributes === false) {
      return match;
    }

    // For closing tags, just return them
    if (match.startsWith('</')) {
      return match;
    }

    // Parse and filter attributes
    const tagAllowedAttrs = [
      ...(allowedAttributes[lower] || []),
      ...(allowedAttributes['*'] || [])
    ];

    // Extract attributes
    const attrRegex = /\s([a-zA-Z][a-zA-Z0-9-]*)(?:="([^"]*)")?/g;
    let filteredAttrs = '';
    let attrMatch;
    while ((attrMatch = attrRegex.exec(match)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2] || '';
      
      if (tagAllowedAttrs.includes(attrName)) {
        // Check scheme for href/src attributes
        if (['href', 'src'].includes(attrName)) {
          const scheme = attrValue.split(':')[0]?.toLowerCase();
          if (scheme && !allowedSchemes.includes(scheme) && attrValue.includes(':')) {
            continue; // Skip attribute with disallowed scheme
          }
        }
        
        // Skip event handlers (on*)
        if (attrName.startsWith('on')) continue;
        
        filteredAttrs += ` ${attrName}="${attrValue}"`;
      }
    }

    const selfClosing = match.endsWith('/>') || ['img', 'br', 'hr', 'input'].includes(lower);
    return `<${lower}${filteredAttrs}${selfClosing ? ' /' : ''}>`;
  });

  return result;
}

// Expose defaults matching the real library's structure
sanitizeHtml.defaults = {
  allowedTags: DEFAULT_ALLOWED_TAGS,
  allowedAttributes: DEFAULT_ALLOWED_ATTRIBUTES,
  allowedSchemes: DEFAULT_ALLOWED_SCHEMES,
  disallowedTagsMode: 'discard' as const,
  allowProtocolRelative: true,
  enforceHtmlBoundary: false,
};

export default sanitizeHtml;
