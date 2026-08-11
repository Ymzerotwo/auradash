# 09 · Field Reference (seo_data & meta_data)

> **Concise specification for `seo_data` and `meta_data` field objects shared across Articles and Services.**
>
> 💡 **EDUCATIONAL BLUEPRINT NOTICE**: All JSON snippets, field labels, and sample payloads in this reference are **strictly pedagogical examples to explain data formats**. They are not fixed templates for cloning or hardcoding. Client frontends must parse dynamic API data dynamically.

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
   - Fallback: Article `excerpt` (truncated 155 chars) or Service description from `meta_data` (finding an item with `type: "text-description"`)
   - HTML Tag: `<meta name="description" content="{meta_description}" />` and `<meta property="og:description" content="{meta_description}" />`

3. **Social Image Sharing (Open Graph / Twitter Card)**:
   - Primary: `seo_data.og_image`
   - Fallback: Article `preview_image_url` or Service image from `meta_data` (finding an item with `type: "photo"`)
   - HTML Tag: `<meta property="og:image" content="{og_image}" />` and `<meta name="twitter:image" content="{og_image}" />`

4. **Canonical URL (Duplicate Content Prevention)**:
   - HTML Tag: `<link rel="canonical" href="{canonical_url}" />`

5. **Search Engine Crawler Control (`is_indexable`)**:
   - If `is_indexable === false` → Inject `<meta name="robots" content="noindex, nofollow" />` to hide private or draft pages from search engines.
   - If `is_indexable === true` → Inject `<meta name="robots" content="index, follow" />`.

---

## 🏛️ Complete Entity Anatomy: Articles vs. Services

Every content entity in AuraDash is composed of three synchronized layers: **Native Database Columns**, **Dynamic Modular Blocks (`meta_data`)**, and **Search/Social Metadata (`seo_data`)**.

### 📰 1. Complete Article Object Anatomy

```json
{
  "id": "3b92f718-49f8-4e8c-a114-1e0fcf884cb1",
  "title": "Invisalign vs Traditional Braces: Clinical Comparison",
  "slug": "invisalign-vs-traditional-braces",
  "excerpt": "A comprehensive clinical comparison covering duration, comfort, and aesthetics.",
  "preview_image_url": "https://cdn.example.com/articles/invisalign-cover.jpg",
  "reading_time_minutes": 5,
  "published_at": "2026-08-01T10:00:00.000Z",
  "category_name": "Orthodontics",
  "category_slug": "orthodontics",
  "meta_data": [
    {
      "id": "block-1",
      "label": "Medical Reviewer",
      "type": "text-info",
      "data": { "text": "Dr. Elena Rostova, DMD (Specialist Orthodontist)" }
    },
    {
      "id": "block-2",
      "label": "Overview",
      "type": "text-description",
      "data": { "text": "Choosing between clear aligners and metal brackets..." }
    },
    {
      "id": "block-3",
      "label": "Key Advantages",
      "type": "list",
      "data": { "items": ["Removable for eating", "Virtually invisible"] }
    },
    {
      "id": "block-4",
      "label": "Book Free 3D Scan",
      "type": "link",
      "data": { "url": "/contact?service=invisalign", "label": "Book Scan" }
    }
  ],
  "seo_data": {
    "meta_title": "Invisalign vs Traditional Braces | Dental Care Guide",
    "meta_description": "Compare clear aligners with braces for speed and comfort.",
    "og_image": "https://cdn.example.com/articles/invisalign-cover.jpg",
    "canonical_url": "https://example.com/articles/invisalign-vs-traditional-braces",
    "is_indexable": true
  }
}
```

### 🛠️ 2. Complete Service Object Anatomy & Financial Contract

```json
{
  "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "name": "Invisalign & Clear Aligners",
  "slug": "invisalign-clear-aligners",
  "sort_order": 1,
  "service_category_id": null,
  "is_active": 1,
  "meta_data": [
    {
      "id": "srv-name",
      "label": "Name",
      "type": "text-info",
      "data": { "text": "Invisalign Full Treatment" }
    },
    {
      "id": "srv-price",
      "label": "Price",
      "type": "text-info",
      "data": { "text": "3500" }
    },
    {
      "id": "srv-discount",
      "label": "Discount",
      "type": "text-info",
      "data": { "text": "500" }
    },
    {
      "id": "srv-desc",
      "label": "Overview",
      "type": "text-description",
      "data": { "text": "Custom 3D designed clear aligners to gently straighten your smile." }
    },
    {
      "id": "srv-includes",
      "label": "What's Included",
      "type": "list",
      "data": { "items": ["3D ClinCheck Scan", "Full Aligner Set", "Post-Treatment Retainers"] }
    }
  ],
  "seo_data": {
    "meta_title": "Invisalign & Clear Aligners | Sana Dental",
    "meta_description": "Transform your smile with invisible clear aligners from certified orthodontists.",
    "og_image": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=1200",
    "canonical_url": "https://sanadental.com/services/invisalign-clear-aligners",
    "is_indexable": true
  }
}
```

> 🚨 **MANDATORY FINANCIAL CONTRACT IN SERVICE `meta_data`**:  
> To accept bookings (`POST /api/public/inbox` with `service_id`), the backend strictly requires:
> 1. Field with label/ID `"Name"` (value e.g. `"Invisalign Full Treatment"`).
> 2. Field with label/ID `"Price"` (numeric value e.g. `"3500"`).
> 
> If missing or non-numeric, the API throws `400 MISSING_FINANCIAL_CONTRACT: Missing required service fields (Name, Price). Please review: auradash.ymzerotwo.com/docs`.

---

## `meta_data` — Dynamic Modular Block & Custom Field Builder

The `meta_data` array is a **Unified Modular Block Builder** shared equally across both **Services and Articles**. It empowers administrators and authors to freely envision, assemble, and structure the layout and content flow of any service or article in **ANY custom order** (e.g. text paragraph ➔ photo diagram ➔ bullet list ➔ YouTube video embed ➔ download link ➔ info badges) without writing a single line of frontend code.

Each element follows the polymorphic schema:

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
