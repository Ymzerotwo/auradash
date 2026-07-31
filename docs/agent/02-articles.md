# 02 · Articles & Article Categories

Base Path: `/api/public`  
Authentication: API Key required on all endpoints (see [01-authentication.md](./01-authentication.md))

---

## Overview

The **Articles API** allows public visitors and client frontends to query published blog posts, news, and categories.

### 🌐 Internationalization (i18n) & Default Sorting Behavior

- **Default Sorting (Default Ordering)**: Articles are sorted by default in descending order by publication date (`published_at DESC`), ensuring that the newest content appears first. To fetch the "3 Latest Articles" for a homepage hero section, pass `limit=3` (`GET /api/public/articles?limit=3`).
- **Content Language**: Public API responses return database content (`title`, `excerpt`, `content`) directly as authored by the administrator in its original language (Arabic or English) without any server-side translation layer per request. Client applications display the returned text directly and use local dictionaries (`lang/*.json`) for UI chrome (buttons, layout direction `dir="rtl"`).

### 🧩 Dynamic Custom Fields (`meta_data`)

Articles contain a flexible `meta_data` array configured by administrators for additional rich details (e.g. key takeaways, bullet point lists, embedded videos, downloadable files, custom CTA links). See [09-field-schemas.md](./09-field-schemas.md) for full field schemas and React rendering components.

### 🔢 Display Priority & Custom Sorting (`sort_order`)

Every article includes an integer `sort_order` field (default `0`):
- **`sort_order > 0` (Pinned Priority)**: Explicit position set by an administrator. Lower numbers indicate higher visual priority (`sort_order = 1` appears before `sort_order = 2`).
- **`sort_order = 0` (Default Unpinned)**: Standard items with no custom priority, automatically falling back to publication date ordering (`published_at DESC`).
- **Pre-Sorted Edge Output**: The Public API delivers articles pre-sorted by the backend (`sort_order > 0` first in ascending order, then unpinned items by date). Frontend clients can render the returned array directly without needing client-side sorting algorithms.

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

Returns a **paginated** list of published articles. Optionally filterable by category.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | `integer` | `1` | Page number (1-indexed) |
| `limit` | `integer` | `12` | Number of items per page |
| `article_category_id` | `string (UUID)` | — | Filter by category ID |

**Request Example**

```http
GET /api/public/articles?page=1&limit=6&article_category_id=abc-123
x-api-key: <YOUR_KEY>
Origin: https://example.com
```

**Success Response — `200 ARTICLES_FETCHED`**

```json
{
  "success": true,
  "code": "ARTICLES_FETCHED",
  "message": "Articles retrieved successfully",
  "data": {
    "articles": [
      {
        "id": "uuid",
        "title": "My First Article",
        "slug": "my-first-article",
        "excerpt": "A short summary...",
        "cover_image_url": "https://cdn.example.com/image.jpg",
        "published_at": "2025-01-01T10:00:00.000Z",
        "article_category_id": "uuid-or-null",
        "meta_data": [],
        "seo_data": {}
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 6,
      "totalPages": 7
    }
  }
}
```

### 📄 Pagination Metadata Architecture

AuraDash uses **Standard Offset-Based Pagination** (`page` & `limit`), returning `{ total, page, limit, totalPages }`.
- **Page Jump Navigation**: Frontend clients can render numeric page buttons `[1] [2] ... [7]` directly using `totalPages`.
- **Infinite Scrolling**: Data-fetching libraries (e.g., React Query) consume page numbers using:
  `getNextPageParam: (lastPage) => lastPage.pagination.page < lastPage.pagination.totalPages ? lastPage.pagination.page + 1 : undefined`

---

---

### `GET /articles/all`

Returns a **paginated** list of **all** published articles, including those linked to categories.

**Query Parameters**: `page` (default `1`), `limit` (default `12`)

---

### `GET /articles/count`

Returns the **total count** of standalone active (published) articles.

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

Returns **approved comments** for a specific article, paginated.

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

> 💡 **UI Tip for AI Agents & Developers**:  
> • If `parent_id` is set, render the comment indented underneath the parent comment (`id === parent_id`).  
> • Admin/staff replies currently share the same comment structure. The administrator's `user_name` (e.g. "Aura Studio Team") can be used to visually distinguish official replies if desired.

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
| `429` | `TOO_MANY_REQUESTS` | Exceeded rate limit (`PUBLIC_LIMITER`) | Wait 60s before retrying |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server execution error | Retry or report issue |
