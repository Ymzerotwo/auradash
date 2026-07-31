# 07 · Error Reference & Error Codes Dictionary

This document provides a **complete, exhaustive reference for every error code** returned by the AuraDash Public API. Use this guide to handle errors programmatically in your client fetch client or AI-generated application.

---

## Standard Error Envelope

Every error response returned by the API adheres to a unified JSON structure:

```json
{
  "success": false,
  "code": "ERROR_CODE_SLUG",
  "message": "Human-readable description of what went wrong",
  "data": null,
  "errors": [ ... ]  // Included ONLY on VALIDATION_ERROR (400)
}
```

### Envelope Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Always `false` on any error condition |
| `code` | `string` | Machine-readable error code slug — use this in `switch`/`case` statements in your client code |
| `message` | `string` | Human-readable explanation of the error |
| `data` | `null` | Always `null` on errors |
| `errors` | `array` | Array of Zod field-level validation issues (present only when `code === "VALIDATION_ERROR"`) |

---

## Complete Error Codes Dictionary

### 🔐 1. Authentication & Security Errors (401 / 403)

These errors occur before reaching business controllers and are enforced by the HMAC API Key middleware.

#### `API_KEY_MISSING` (HTTP 401)
- **Definition**: The incoming request did not include an API key in either the `x-api-key` header or the `Authorization: Bearer <key>` header.
- **Cause**: Client request sent without authentication headers.
- **Resolution**: Attach `x-api-key: <your_key>` header to all public fetch calls.
```json
{
  "success": false,
  "code": "API_KEY_MISSING",
  "message": "API key is required"
}
```

#### `INVALID_API_KEY` (HTTP 401)
- **Definition**: The provided API key failed cryptographic HMAC-SHA256 signature verification, is malformed, or has passed its expiration timestamp (for Test keys).
- **Cause**: Stolen/altered key, corrupted token string, or expired Test key.
- **Resolution**: Re-issue a new API key from **Admin Dashboard → Settings → API Keys**.
```json
{
  "success": false,
  "code": "INVALID_API_KEY",
  "message": "Invalid or expired API key"
}
```

#### `ORIGIN_REQUIRED` (HTTP 403)
- **Definition**: A Production API key was supplied, but the request lacked the browser `Origin` or `Referer` header.
- **Cause**: Non-browser client (like cURL or Postman) using a Production key without setting an `Origin` header.
- **Resolution**: Use a **Test Key** for server-to-server or local testing, or explicitly send an `Origin: https://yourdomain.com` header.
```json
{
  "success": false,
  "code": "ORIGIN_REQUIRED",
  "message": "Origin header is required for production keys"
}
```

#### `DOMAIN_MISMATCH` (HTTP 403)
- **Definition**: The `Origin` header sent by the client browser does not match the domain cryptographically bound to the Production API key.
- **Cause**: Reusing an API key issued for `domain-a.com` on `domain-b.com`.
- **Resolution**: Generate a dedicated Production API key bound to your client's exact domain.
```json
{
  "success": false,
  "code": "DOMAIN_MISMATCH",
  "message": "Request origin does not match API key domain"
}
```

---

### 📝 2. Validation Errors (HTTP 400)

#### `VALIDATION_ERROR` (HTTP 400)
- **Definition**: The request body or query parameters failed Zod schema validation checks.
- **Cause**: Missing mandatory form fields, invalid email format, message text too short/long, or invalid UUID parameters.
- **Payload Structure**: Returns an `errors` array containing field paths and specific issue messages.

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "errors": [
    {
      "code": "too_small",
      "minimum": 2,
      "type": "string",
      "message": "name_required",
      "path": ["full_name"]
    },
    {
      "code": "invalid_string",
      "validation": "email",
      "message": "invalid_email",
      "path": ["email"]
    }
  ]
}
```

---

### 💼 3. Business Logic & Not Found Errors (400 / 404)

#### `ARTICLE_NOT_FOUND` (HTTP 404)
- **Definition**: The requested article slug does not exist in the database or is not in active/published status.
- **Resolution**: Verify the article slug or redirect client user to a 404 Not Found page.
```json
{
  "success": false,
  "code": "ARTICLE_NOT_FOUND",
  "message": "Article not found"
}
```

#### `CATEGORY_NOT_FOUND` (HTTP 404)
- **Definition**: The requested article or service category slug/ID does not exist or is inactive.
- **Resolution**: Verify category slug.
```json
{
  "success": false,
  "code": "CATEGORY_NOT_FOUND",
  "message": "Category not found"
}
```

#### `SERVICE_NOT_FOUND` (HTTP 400 / 404)
- **Definition**: The requested service slug does not exist, or the `service_id` passed in a booking request (`POST /api/public/inbox`) does not reference an active service.
- **Resolution**: Select an active service from `GET /api/public/booking/services`.
```json
{
  "success": false,
  "code": "SERVICE_NOT_FOUND",
  "message": "The specified service does not exist or is inactive"
}
```

#### `MISSING_FINANCIAL_CONTRACT` (HTTP 400)
- **Definition**: A booking submission (`POST /api/public/inbox` with `inquiry_type: "service"`) requested a service that lacks configured pricing or terms.
- **Resolution**: Ensure the service has valid pricing configured in the Admin Dashboard.
```json
{
  "success": false,
  "code": "MISSING_FINANCIAL_CONTRACT",
  "message": "Service missing required pricing contract"
}
```

---

### ⚡ 4. Rate Limiting & Server Errors (429 / 500)

#### `TOO_MANY_REQUESTS` (HTTP 429)
- **Definition**: The connecting IP address exceeded Cloudflare Workers rate limits (`PUBLIC_LIMITER` or `PUBLIC_SUBMISSION_LIMITER`).
- **Cause**: Automated bot behavior or rapid repeated form submissions.
- **Resolution**: Wait 60 seconds before retrying requests.
```json
{
  "success": false,
  "code": "TOO_MANY_REQUESTS",
  "message": "Rate limit exceeded. Please wait before trying again."
}
```

#### `INTERNAL_SERVER_ERROR` (HTTP 500)
- **Definition**: An unexpected runtime exception occurred on the Cloudflare Workers backend.
- **Cause**: Unhandled edge runtime error or missing environment variable (e.g. `AURADASH_MASTER_SECRET`).
- **Resolution**: Check server execution logs via Cloudflare Workers dashboard.
```json
{
  "success": false,
  "code": "INTERNAL_SERVER_ERROR",
  "message": "Failed to process request"
}
```

---

## Complete Quick Reference Table

| Code Slug | HTTP Status | Category | Brief Description |
|-----------|:-----------:|----------|-------------------|
| `API_KEY_MISSING` | 401 | Security | Missing `x-api-key` header |
| `INVALID_API_KEY` | 401 | Security | Invalid HMAC signature or expired key |
| `ORIGIN_REQUIRED` | 403 | Security | Production key missing browser `Origin` header |
| `DOMAIN_MISMATCH` | 403 | Security | Request `Origin` does not match key domain binding |
| `VALIDATION_ERROR` | 400 | Input | Form body or parameter validation check failed |
| `ARTICLE_NOT_FOUND` | 404 | Content | Article slug not found or unpublished |
| `CATEGORY_NOT_FOUND` | 404 | Content | Category slug not found |
| `SERVICE_NOT_FOUND` | 400 / 404 | Content | Service slug or ID not found/inactive |
| `MISSING_FINANCIAL_CONTRACT` | 400 | Business | Service missing required pricing details |
| `TOO_MANY_REQUESTS` | 429 | Protection | Rate limit quota exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | System | Unexpected edge server exception |
