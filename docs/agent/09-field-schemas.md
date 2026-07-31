# 09 · Field Reference (seo_data & meta_data)

> Concise specification for `seo_data` and `meta_data` field objects shared across Articles and Services.

---

## `seo_data` — Search Engine Metadata

A fixed-schema JSON object containing SEO metadata for search crawlers and social cards.

```json
"seo_data": {
  "meta_title": "Page Title for Google",
  "meta_description": "Search snippet description (up to 160 characters)",
  "og_image": "https://cdn.example.com/image.jpg",
  "canonical_url": "https://example.com/services/my-service",
  "is_indexable": true
}
```

| Field | Type | Purpose |
|-------|------|---------|
| `meta_title` | `string` | `<title>` and `og:title` tag content |
| `meta_description` | `string` | `<meta name="description">` content |
| `og_image` | `string (URL)` | Social sharing card image URL (WhatsApp, Twitter/X, Facebook) |
| `canonical_url` | `string (URL)` | `<link rel="canonical">` tag to prevent duplicate content indexing |
| `is_indexable` | `boolean` | Search crawler directive (`true` = `index, follow`, `false` = `noindex, nofollow`) |

---

### 🔍 Framework-Agnostic SEO & Open Graph Tag Mapping Pattern

When generating pages for public web frontends, client applications map `seo_data` fields directly to HTML `<head>` tags or SSR framework metadata heads:

1. **Title Mapping**:
   - Primary: `seo_data.meta_title`
   - Fallback: Article or Service `title`
   - HTML Tag: `<title>{meta_title}</title>` and `<meta property="og:title" content="{meta_title}" />`

2. **Description Mapping**:
   - Primary: `seo_data.meta_description`
   - Fallback: Article or Service `excerpt`
   - HTML Tag: `<meta name="description" content="{meta_description}" />` and `<meta property="og:description" content="{meta_description}" />`

3. **Social Image Sharing (Open Graph / Twitter Card)**:
   - Primary: `seo_data.og_image`
   - Fallback: `preview_image_url` or `cover_image_url`
   - HTML Tag: `<meta property="og:image" content="{og_image}" />` and `<meta name="twitter:image" content="{og_image}" />`

4. **Canonical URL (Duplicate Content Prevention)**:
   - HTML Tag: `<link rel="canonical" href="{canonical_url}" />`

5. **Search Engine Crawler Control (`is_indexable`)**:
   - If `is_indexable === false` → Inject `<meta name="robots" content="noindex, nofollow" />` to hide private or draft pages from search engines.
   - If `is_indexable === true` → Inject `<meta name="robots" content="index, follow" />`.

---

## `meta_data` — Dynamic Custom Fields

An **array** of dynamic custom fields configured by administrators for articles and services.

Each element follows the schema:

```json
{
  "id": "unique-field-id",
  "label": "Display Label",
  "type": "field-type",
  "data": { ... }
}
```

### Field Types Specification

| Type | `data` Object Payload | Usage / UI Representation |
|------|----------------------|---------------------------|
| `text-info` | `{ "text": "..." }` | Short text (Price, duration, location) |
| `text-description` | `{ "text": "..." }` | Multi-line text paragraph |
| `icon` | `{ "name": "Camera" }` | Icon name from [Lucide Icons](https://lucide.dev) |
| `photo` | `{ "url": "...", "alt": "..." }` | Image URL with alt text |
| `video` | `{ "url": "..." }` | Direct MP4/WebM video URL |
| `video-youtube` | `{ "url": "..." }` | YouTube embed link |
| `date_time` | `{ "value": "ISO 8601" }` | Date & timestamp |
| `link` | `{ "url": "...", "label": "..." }` | Call to Action button / link |
| `list` | `{ "items": ["...", "..."] }` | Bullet point list |

---

### Complete `meta_data` Response Example

```json
"meta_data": [
  {
    "id": "field-1",
    "label": "Service Duration",
    "type": "text-info",
    "data": { "text": "4 Hours Session" }
  },
  {
    "id": "field-2",
    "label": "What's Included",
    "type": "list",
    "data": {
      "items": [
        "50 High-Resolution Edited Photos",
        "Online Digital Gallery",
        "Full Commercial Rights"
      ]
    }
  },
  {
    "id": "field-3",
    "label": "Video Trailer",
    "type": "video-youtube",
    "data": { "url": "https://www.youtube.com/embed/dQw4w9WgXcQ" }
  },
  {
    "id": "field-4",
    "label": "Download Brochure",
    "type": "link",
    "data": { "url": "https://example.com/brochure.pdf", "label": "Download PDF" }
  }
]
```

---

### 🎨 Universal Framework-Agnostic UI Rendering Architectural Pattern

Whether building in **Flutter**, **React / Next.js**, **Vue / Nuxt**, **iOS (SwiftUI)**, **Android (Jetpack Compose)**, or **PHP**, client applications iterate through the `meta_data` array to render custom UI blocks dynamically:

1. **Iterate Array**: Loop over `meta_data` items in the exact array order returned by the API (which reflects the administrator's intended visual display sequence).
2. **Type Dispatching**: Match each item's `type` field using a polymorphic switch statement or component dictionary:
   - `text-info` → Render label and text key in a badge, card, or info box.
   - `text-description` → Render multiline paragraph text block.
   - `icon` → Resolve icon string name against client icon set (e.g. Lucide, FontAwesome).
   - `photo` → Render responsive image tag/widget using `data.url` and `data.alt`.
   - `video` → Render HTML5 video player or native video player widget.
   - `video-youtube` → Render responsive iframe embed or webview video component.
   - `date_time` → Format `data.value` timestamp according to user locale.
   - `link` → Render Call-to-Action button or hyperlink using `data.url` and `data.label`.
   - `list` → Iterate `data.items` string array to render bullet points or feature list.
3. **Graceful Fallback**: Ignore unknown or unsupported `type` strings safely to maintain backward and forward compatibility.
