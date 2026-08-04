# 03 · Services & Service Categories

Base Path: `/api/public`  
Authentication: API Key required on all endpoints (see [01-authentication.md](./01-authentication.md))

---

## Overview

The Services API provides two distinct consumption patterns:

| Pattern | Path Prefix | Purpose |
|---------|-------------|---------|
| **Display Mode** | `/services`, `/service-categories` | Full rich content pages, service catalogs, and detail pages |
| **Booking Mode** | `/booking/...` | Lean, optimized flat responses for booking form dropdowns |

### 📝 Booking Submission Workflow

> 💡 **IMPORTANT NOTE FOR DEVELOPERS & AI AGENTS**:  
> The endpoints in this document (`/booking/services`, `/services`) are **READ-ONLY** for fetching service data and populating selection dropdowns.  
> **Submitting a booking request** is executed via `POST /api/public/inbox` using `inquiry_type: "service"` and passing the selected `service_id` (see [04-inbox.md](./04-inbox.md)).  
> When submitted, the request is safely held in the Admin Inbox. In the Admin Dashboard, the business manager reviews the submission and converts it into a verified Customer CRM profile & Pending Booking record via an Atomic D1 Transaction.

### 🧩 Dynamic Custom Fields (`meta_data`)

Services return a dynamic `meta_data` array configured by administrators for service specifications (e.g., service duration, package inclusions/bullet lists, sample photo galleries, YouTube demo videos, downloadable PDFs, custom WhatsApp links). See [09-field-schemas.md](./09-field-schemas.md) for full schemas and a production React rendering component.

### 🔢 Display Priority & Custom Sorting (`sort_order`)

Every service contains a `sort_order` integer field (default `0`):
- **`sort_order > 0` (Pinned Priority)**: Higher priority items set explicitly by administrators (`1` appears before `2`).
- **`sort_order = 0` (Unpinned Default)**: Standard services ordered by creation date.
- **Pre-Sorted Output**: The API returns services pre-sorted by `sort_order ASC`. Frontend widgets and dropdowns can render the array in the exact order received.

### 🤖 MANDATORY AI IMPLEMENTATION DIRECTIVE: Smart Dynamic SEO & Open Graph Integration

AI Coding Assistants and Frontend Developers generating code for Service pages **MUST programmatically implement dynamic SEO & Open Graph metadata generation**:

1. **Mandatory Dynamic Head Injection**: Service Detail pages (`/services/:slug`) must automatically construct `<title>`, `<meta name="description">`, `og:title`, `og:description`, `og:image`, `canonical`, and `robots` metadata.
2. **Smart Fallback Resolution Logic**:
   - **Title**: Use `seo_data.meta_title` if present and non-empty; otherwise fall back to `service.name`.
   - **Description**: Use `seo_data.meta_description` if present and non-empty; otherwise extract text from `service.meta_data` (finding an item with `type: "text-description"` in `meta_data` and truncating to 155 characters), or fall back to site description.
   - **Social Sharing Image (`og:image`, `twitter:image`)**: Use `seo_data.og_image` if present; otherwise extract image URL from `service.meta_data` (finding an item with `type: "photo"` in `meta_data`), or fall back to default site logo.
   - **Canonical Link**: Set `<link rel="canonical">` to `seo_data.canonical_url` if present; otherwise use the absolute page URL.
   - **Crawler Control (`is_indexable`)**: Check `seo_data.is_indexable`. If `false` → inject `noindex, nofollow`; if `true` → inject `index, follow`.

---

## Booking-Optimized Endpoints

These endpoints return **lean, flat data** specifically formatted for dropdown selectors and booking widgets. They omit heavy SEO metadata and descriptions.

### `GET /booking/service-categories`

Returns all **active** service categories formatted for dropdowns.

**Success Response — `200 BOOKING_CATEGORIES_FETCHED`**

```json
{
  "success": true,
  "code": "BOOKING_CATEGORIES_FETCHED",
  "message": "Booking categories fetched successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Photography",
      "slug": "photography"
    }
  ]
}
```

---

### `GET /booking/services`

Returns all **active** services (standalone and category-linked) formatted for booking selection.

---

### `GET /booking/service-categories/:slug/services`

Returns services under a **specific category** formatted for booking selection.

---

## Display-Mode Service Endpoints

### `GET /services`

Returns a **paginated** list of active standalone services.

**Query Parameters**: `page` (default `1`), `limit` (default `20`)

---

### `GET /services/all`

Returns a **paginated** list of **all** active services (standalone + category-linked).

**Query Parameters**: `page` (default `1`), `limit` (default `20`)

---

### `GET /services/:slug`

Returns **full details** for a single active service by slug.

**Success Response — `200 SERVICE_FETCHED`**

```json
{
  "success": true,
  "code": "SERVICE_FETCHED",
  "message": "Service retrieved successfully",
  "data": {
    "service": {
      "id": "uuid",
      "service_category_id": "uuid-or-null",
      "name": "Wedding Photography Package",
      "slug": "wedding-photography",
      "meta_data": [],
      "seo_data": {}
    }
  }
}
```

---

## Display-Mode Category Endpoints

### `GET /service-categories`

Returns a **paginated** list of active service categories.

**Query Parameters**: `page` (default `1`), `limit` (default `20`)

---

### `GET /service-categories/:slug`

Returns **full details** for a single service category by slug.

---

### `GET /service-categories/:slug/services`

Returns a **paginated** list of services under a specific category.

**Query Parameters**: `page` (default `1`), `limit` (default `20`)

---

## Field Reference Summary

### Service Object (`Service`) — Display Mode Endpoints

| Field | Type | Nullable | Description |
|-------|------|:--------:|-------------|
| `id` | `string (UUID)` | ❌ | Unique service ID |
| `name` | `string` | ❌ | Service name |
| `slug` | `string` | ❌ | Unique URL slug |
| `seo_data` | `object` | ❌ | SEO metadata object (see [09-field-schemas.md](./09-field-schemas.md)) |
| `meta_data` | `array` | ❌ | Dynamic custom fields array — **All service details** (images, descriptions, pricing, duration, feature lists, videos) are stored inside `meta_data` as dynamic fields (see [09-field-schemas.md](./09-field-schemas.md)) |

### Booking-Optimized Service Object (Lean)

| Field | Type | Nullable | Description |
|-------|------|:--------:|-------------|
| `id` | `string (UUID)` | ❌ | Unique service ID |
| `name` | `string` | ❌ | Service name |
| `slug` | `string` | ❌ | Unique URL slug |
| `parent_id` | `string (UUID)` | ✅ | Parent category ID (`service_category_id`) |

> ⚠️ **Important — Service Data Architecture**: Unlike Articles, the Services table uses a **minimal schema** (`id`, `name`, `slug`, `meta_data`, `seo_data`). All rich content (images, descriptions, pricing, duration, bullet lists, videos) is stored and delivered exclusively through the `meta_data` dynamic fields array. There are no top-level `excerpt`, `description`, `cover_image_url`, `price`, or `currency` columns in the database.

---

## Module Error Reference (Services API)

| Status | Code | Cause | Resolution / Handling |
|--------|------|-------|-----------------------|
| `401` | `API_KEY_MISSING` | Missing `x-api-key` header | Attach `x-api-key` header to request |
| `401` | `INVALID_API_KEY` | Key HMAC signature invalid or expired | Re-issue key from Admin Dashboard |
| `403` | `DOMAIN_MISMATCH` | Request `Origin` does not match key domain binding | Re-issue key bound to correct domain |
| `404` | `SERVICE_NOT_FOUND` | Requested service slug does not exist or is inactive | Redirect user to 404 page |
| `404` | `CATEGORY_NOT_FOUND` | Requested service category slug does not exist | Redirect user to 404 page |
| `429` | `RATE_LIMIT_EXCEEDED` | Exceeded rate limit (`PUBLIC_LIMITER`) | Wait 60s before retrying |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server execution error | Retry or report issue |
