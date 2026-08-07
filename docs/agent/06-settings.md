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
Host: api.yourdomain.com
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
      "siteName": "Aura Studio",
      "logoUrl": "https://cdn.example.com/logo.png",
      "contactInfo": {
        "email": "hello@example.com",
        "phone": "+15550000000",
        "address": "New York, NY"
      },
      "socialMedia": {
        "instagram": "https://instagram.com/aurastudio",
        "facebook": "https://facebook.com/aurastudio",
        "twitter": "https://twitter.com/aurastudio",
        "youtube": "https://www.youtube.com/@Ym_zerotwo",
        "linkedin": "https://linkedin.com/company/aurastudio"
      },
      "locations": [],
      "workingHours": {},
      "currency": "USD",
      "timezone": "UTC"
    }
  }
}
```

> ⚠️ **Note for AI Agents**: The `currency` and `timezone` fields are returned by the backend but are **NOT yet implemented or used** in any client-facing feature. AI Agents **MUST ignore these fields** and should not build any UI or logic around them until further notice.

---

## Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `siteName` | `string` | Website / Business name |
| `logoUrl` | `string (URL)` \| `null` | Brand logo URL |
| `contactInfo` | `object` | Contact information object (email, phone, address) |
| `socialMedia` | `object` | Social media profile URLs |
| `locations` | `array` | Business locations |
| `workingHours` | `object` | Business working hours |
| `currency` | `string` | ⚠️ **Not yet developed** — Default currency code (e.g. `"USD"`). Reserved for future use. |
| `timezone` | `string` | ⚠️ **Not yet developed** — Default timezone (e.g. `"UTC"`). Reserved for future use. |

---

## Module Error Reference (Settings API)

| Status | Code | Cause / Reason | Resolution / Handling |
|--------|------|----------------|-----------------------|
| `401` | `API_KEY_MISSING` / `INVALID_API_KEY` | Missing or invalid `x-api-key` header | Pass valid `x-api-key` header |
| `403` | `DOMAIN_MISMATCH` | Request `Origin` does not match key domain binding | Re-issue key bound to client domain |
| `500` | `INTERNAL_SERVER_ERROR` | Server execution error fetching global settings | Retry or check server logs |
