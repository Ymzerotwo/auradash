# 06 · Public Settings

Base Path: `/api/public`  
Authentication: API Key required (see [01-authentication.md](./01-authentication.md))

---

## Overview

The Public Settings API exposes **global business settings** (site branding, contact information, social links) configured in the AuraDash Admin Dashboard. This allows client websites and applications to dynamically render business identity and contact details without hardcoding them in frontend source code.

---

## `GET /settings`

Retrieves public-facing business settings.

### Request Example

```http
GET /api/public/settings HTTP/1.1
Host: <your-worker>.workers.dev
x-api-key: <YOUR_KEY>
Origin: https://example.com
```

### Success Response — `200 SETTINGS_FETCHED`

```json
{
  "success": true,
  "code": "SETTINGS_FETCHED",
  "message": "Global settings retrieved",
  "data": {
    "settings": {
      "site_name": "Aura Studio",
      "site_tagline": "Creating Unforgettable Moments",
      "site_description": "Professional photography and videography services.",
      "logo_url": "https://cdn.example.com/logo.png",
      "favicon_url": "https://cdn.example.com/favicon.ico",
      "contact_email": "hello@example.com",
      "contact_phone": "+15550000000",
      "contact_address": "New York, NY",
      "social_links": {
        "instagram": "https://instagram.com/aurastudio",
        "facebook": "https://facebook.com/aurastudio",
        "twitter": "https://twitter.com/aurastudio",
        "youtube": "https://www.youtube.com/@Ym_zerotwo",
        "linkedin": "https://linkedin.com/company/aurastudio"
      },
      "whatsapp_number": "+15550000000"
    }
  }
}
```

---

## Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `site_name` | `string` | Website / Business name |
| `site_tagline` | `string` | Short slogan or tagline |
| `site_description` | `string` | Brief site description |
| `logo_url` | `string (URL)` | Brand logo URL |
| `favicon_url` | `string (URL)` | Favicon URL |
| `contact_email` | `string` | Main contact email |
| `contact_phone` | `string` | Main contact phone number |
| `contact_address` | `string` | Physical business address |
| `social_links` | `object` | Social media profile URLs |
| `whatsapp_number` | `string` | WhatsApp contact number |
| `locale` | `string` | Default locale string |

---

## Module Error Reference (Settings API)

| Status | Code | Cause / Reason | Resolution / Handling |
|--------|------|----------------|-----------------------|
| `401` | `API_KEY_MISSING` / `INVALID_API_KEY` | Missing or invalid `x-api-key` header | Pass valid `x-api-key` header |
| `403` | `DOMAIN_MISMATCH` | Request `Origin` does not match key domain binding | Re-issue key bound to client domain |
| `500` | `INTERNAL_SERVER_ERROR` | Server execution error fetching global settings | Retry or check server logs |
