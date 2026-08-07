# 02 · Articles & Article Categories

Base Path: `/api/public`  
Authentication: API Key required on all endpoints (see [01-authentication.md](./01-authentication.md))

---

## Overview

The **Articles API** allows public visitors and client frontends to query published blog posts, news, and categories.

### 🌐 Internationalization (i18n) & Default Sorting Behavior

- **Default Sorting (Default Ordering)**: Articles are sorted by default in descending order by publication date (`published_at DESC`), ensuring that the newest content appears first. To fetch the "3 Latest Articles" for a homepage hero section, pass `limit=3` (`GET /api/public/articles?limit=3`).
- **Content Language**: Public API responses return database content (`title`, `excerpt`, `content`) directly as authored by the administrator in its original language (Arabic or English) without any server-side translation layer per request. Client applications display the returned text directly and use local dictionaries (`lang/*.json`) for UI chrome (buttons, layout direction `dir="rtl"`).

### 🔍 Search & Filtering Limitations

The Public API does **NOT** support free-text search query parameters (e.g. `?search=`, `?q=`, `?filter=`). Supported query parameters are strictly restricted to pagination (`page`, `limit`) and category filtering (`article_category_id`). Client applications requiring full-text search must fetch the dataset via standard endpoints and perform client-side text filtering.

### 🧩 Dynamic Custom Fields (`meta_data`)

Articles contain a flexible `meta_data` array configured by administrators for additional rich details (e.g. key takeaways, bullet point lists, embedded videos, downloadable files, custom CTA links). See [09-field-schemas.md](./09-field-schemas.md) for full field schemas and React rendering components.

### 🔢 Display Priority & Custom Sorting (`sort_order`) — Categories Only

Article **Categories** include an integer `sort_order` field (default `0`) that controls their display order. Articles themselves are sorted exclusively by publication date (`published_at DESC`).
- **Category `sort_order > 0` (Pinned Priority)**: Explicit position set by an administrator. Lower numbers indicate higher visual priority (`sort_order = 1` appears before `sort_order = 2`).
- **Category `sort_order = 0` (Default Unpinned)**: Standard categories with no custom priority, falling back to creation date ordering.
- **Article Ordering**: Articles within any listing are always sorted by `published_at DESC` (newest first). There is no article-level `sort_order` in the Public API.

### 🤖 MANDATORY AI IMPLEMENTATION DIRECTIVE: Smart Dynamic SEO & Open Graph Integration

AI Coding Assistants and Frontend Developers generating code for Article pages **MUST programmatically implement dynamic SEO & Open Graph metadata generation**:

1. **Mandatory Dynamic Head Injection**: Article Detail pages (`/articles/:slug`) must automatically construct `<title>`, `<meta name="description">`, `og:title`, `og:description`, `og:image`, `canonical`, and `robots` metadata.
2. **Smart Fallback Resolution Logic**:
   - **Title**: Use `seo_data.meta_title` if present and non-empty; otherwise fall back to `article.title`.
   - **Description**: Use `seo_data.meta_description` if present and non-empty; otherwise fall back to `article.excerpt` truncated to 155 characters.
   - **Social Sharing Image (`og:image`, `twitter:image`)**: Use `seo_data.og_image` if present; otherwise fall back to `article.preview_image_url` or site logo.
   - **Canonical Link**: Set `<link rel="canonical">` to `seo_data.canonical_url` if present; otherwise use the absolute page URL.
   - **Crawler Control (`is_indexable`)**: Check `seo_data.is_indexable`. If `false` → inject `noindex, nofollow`; if `true` → inject `index, follow`.

---

## Articles

### `GET /articles`

Returns a **paginated** list of published articles.
- **Without `article_category_id` parameter**: Returns ONLY **standalone articles** (articles that do not belong to any category, i.e., `category_id IS NULL`).
- **With `article_category_id=<uuid>` parameter**: Returns articles belonging specifically to that category ID.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | `integer` | `1` | Page number (1-indexed) |
| `limit` | `integer` | `12` | Number of items per page (server caps hard limit at `100`) |
| `article_category_id` | `string (UUID)` | — | Filter by specific category ID |

---

### `GET /articles/all`

Returns a **paginated** list of **ALL published articles**, including both category-linked articles AND standalone articles (`category_id IS NULL` or `category_id IS NOT NULL`). Returns `category_name` and `category_slug` inside each article object.

**Query Parameters**: `page` (default `1`), `limit` (default `12`)

---

### `GET /articles/count`

Returns the total count of **standalone active (published) articles** (`category_id IS NULL`).

---

### `GET /articles/count/all`

Returns the total count of **ALL active (published) articles** across the board (both standalone and category-linked).

---

### `GET /articles/:slug`

Returns **full details** for a single published article by its slug.

**Success Response — `200 ARTICLE_FETCHED`**

```json
{
  "success": true,
  "code": "ARTICLE_FETCHED",
  "message": "Article retrieved successfully",
  "data": {
    "article": {
      "id": "uuid",
      "title": "My First Article",
      "slug": "my-first-article",
      "excerpt": "A short summary...",
      "preview_image_url": "https://cdn.example.com/image.jpg",
      "reading_time_minutes": 5,
      "published_at": "2025-01-01T10:00:00.000Z",
      "category_name": "Technology",
      "category_slug": "tech",
      "meta_data": [],
      "seo_data": {}
    }
  }
}
```

---

### `GET /articles/:slug/comments`

Returns **approved comments** for a specific article, paginated in a flat array sorted chronologically (`created_at DESC`).

**Success Response — `200 ARTICLE_COMMENTS_FETCHED`**

```json
{
  "success": true,
  "code": "ARTICLE_COMMENTS_FETCHED",
  "message": "Comments retrieved successfully",
  "data": {
    "comments": [
      {
        "id": "comment-uuid-1",
        "user_name": "Sarah Miller",
        "content": "Great article! Very helpful overview.",
        "parent_id": null,
        "created_at": "2025-01-02T12:00:00.000Z"
      },
      {
        "id": "comment-uuid-2",
        "user_name": "Aura Studio Team",
        "content": "Thank you Sarah! Glad you found it useful.",
        "parent_id": "comment-uuid-1",
        "created_at": "2025-01-02T12:30:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 2, "totalPages": 1 }
  }
}
```

> 💡 **UI Tip for Threaded Comments & Pagination Across Pages**:  
> • If `parent_id` matches an `id` present on the current page, render the reply indented under its parent comment.  
> • If a reply's parent comment (`parent_id`) exists on a different page (due to pagination offset), the client UI should render the reply with a reference tag (e.g. *"In reply to previous comment"*), or fetch the parent thread on demand.

---

## Article Categories

### `GET /article-categories`

Returns a **paginated** list of active article categories.

**Query Parameters**: `page` (default `1`), `limit` (default `20`)

---

### `GET /article-categories/:slug`

Returns **full details** for a specific article category by slug.

---

### `GET /article-categories/:slug/articles`

Returns a **paginated** list of articles published within a specific category, alongside category metadata.

**Query Parameters**: `page` (default `1`), `limit` (default `12`)

---

## Field Reference Summary

### Article Object (`Article`)

| Field | Type | Nullable | Description |
|-------|------|:--------:|-------------|
| `id` | `string (UUID)` | ❌ | Unique article ID |
| `title` | `string` | ❌ | Article title |
| `slug` | `string` | ❌ | Unique URL slug |
| `author_name` | `string` | ✅ | Author display name (from Users table) |
| `excerpt` | `string` | ✅ | Short summary text (plain text, not HTML) |
| `preview_image_url` | `string (URL)` | ✅ | **Absolute URL** (e.g. `https://cdn.example.com/image.jpg`) — returned as-is from database, no path resolution needed |
| `reading_time_minutes` | `integer` | ✅ | Estimated reading time in minutes |
| `published_at` | `string (ISO 8601)` | ✅ | Publication date |
| `category_name` | `string` | ✅ | Category title (only present in `/articles/all` and `/articles/:slug` responses) |
| `category_slug` | `string` | ✅ | Category slug (only present in `/articles/all` and `/articles/:slug` responses) |
| `seo_data` | `object` | ❌ | SEO metadata object (see [09-field-schemas.md](./09-field-schemas.md)) |
| `meta_data` | `array` | ❌ | Dynamic custom fields array (see [09-field-schemas.md](./09-field-schemas.md)) |

> ⚠️ **Important — No `content` Field in Public API**: The full HTML article body (`content` column) is **NOT returned** by any Public API endpoint. Only `excerpt` (plain text summary) is available. Article rich content is delivered exclusively through the `meta_data` dynamic fields array.

---

## Module Error Reference (Articles API)

| Status | Code | Cause | Resolution / Handling |
|--------|------|-------|-----------------------|
| `401` | `API_KEY_MISSING` | Missing `x-api-key` header | Attach `x-api-key` header to request |
| `401` | `INVALID_API_KEY` | Key HMAC signature invalid or expired | Re-issue key from Admin Dashboard |
| `403` | `DOMAIN_MISMATCH` | Request `Origin` does not match key domain binding | Re-issue key bound to correct domain |
| `404` | `ARTICLE_NOT_FOUND` | Requested article slug does not exist or is unpublished | Redirect user to 404 page |
| `404` | `CATEGORY_NOT_FOUND` | Requested category slug does not exist | Redirect user to 404 page |
| `429` | `RATE_LIMIT_EXCEEDED` | Exceeded rate limit (`PUBLIC_LIMITER`) | Wait 60s before retrying |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server execution error | Retry or report issue |
