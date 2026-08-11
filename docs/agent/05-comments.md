# 05 · Article Comments

Base Path: `/api/public`  
Authentication: API Key required (see [01-authentication.md](./01-authentication.md))  
Rate Limiting: `PUBLIC_SUBMISSION_LIMITER` enforced.

---

## Overview

The **Comments API** allows website visitors to **submit comments on published articles**. Submitted comments enter a `pending` state until moderated and approved by an administrator in the dashboard. Approved comments become visible via `GET /articles/:slug/comments` (see [02-articles.md](./02-articles.md)).

> ⚠️ **POST requests only.** Reading approved comments is handled via the Articles API.

---

## Threaded Replies & Admin Replies Architecture

### 💬 1. Threaded / Nested Replies (`parent_id`)
Comments support multi-level nested discussions:
- **Root Comments**: Submitted with `"parent_id": null`. These appear as main top-level comments on the article.
- **Nested Replies**: Submitted with `"parent_id": "<uuid-of-parent-comment>"`. When fetching comments via `GET /api/public/articles/:slug/comments`, replies reference their parent comment ID. Frontend client applications can tree-group or indent nested replies underneath their parent comment block.

### 🛡️ 2. Admin / Staff Replies
When a business manager or staff member responds to a user comment from the Admin Dashboard, the reply is created with the administrator's name as `user_name` (e.g. "Aura Studio Team"). The Public API returns comment objects with the same fields for both visitor and admin comments (`id`, `user_name`, `content`, `parent_id`, `created_at`).

> 💡 **Note**: The database stores an `is_admin_reply` flag and `user_id` reference for admin replies, but these fields are **not exposed** in the current Public API response. Client applications can optionally use the `user_name` value to visually distinguish official team responses if desired.

---

## `POST /comments`

Submits a new comment on an article.

**Rate Limiting:** Enforced (`PUBLIC_SUBMISSION_LIMITER`)  
**Tarpit Delay:** 500ms – 1.5s artificial delay (protects against automated bots)

### Request Headers

```http
POST /api/public/comments HTTP/1.1
Content-Type: application/json
x-api-key: <YOUR_KEY>
Origin: https://example.com
```

### Request Body Example

```json
{
  "article_id": "uuid-of-the-article",
  "user_name": "Sarah Miller",
  "user_email": "sarah@example.com",
  "content": "Great article, very informative!",
  "parent_id": null
}
```

### Field Reference

| Field | Type | Mandatory | Validation |
|-------|------|:---------:|------------|
| `article_id` | `string (UUID)` | ✅ | Must reference an active, published article |
| `user_name` | `string` | ✅ | Max 100 chars · HTML sanitized · Cannot be empty |
| `user_email` | `string` | ✅ | Valid email format · Max 255 chars · Lowercased · HTML sanitized |
| `content` | `string` | ✅ | Min 1 char · Max 3,000 chars · HTML sanitized |
| `parent_id` | `string (UUID)` | ❌ Optional | Parent comment UUID for threaded replies; `null` for root comments |

---

### Success Response — `201 COMMENT_SUBMITTED`

```json
{
  "success": true,
  "code": "COMMENT_SUBMITTED",
  "message": "Comment submitted successfully and is pending approval",
  "data": {
    "id": "uuid-of-new-comment"
  }
}
```

---

### 🤖 MANDATORY AI IMPLEMENTATION DIRECTIVE: Professional Error Handling

When implementing the comments submission UI, AI Coding Assistants MUST handle submission errors gracefully:
- **Generic Fallback Message**: If a submission fails unexpectedly (e.g. 500 error, network timeout), **DO NOT** display raw technical stack traces. Display a clean, generic error message.
- **Localization**: All error and feedback messages **MUST be written natively in the language that the client website is built with**. They must be professional, clear, and reassuring.

---

### Error Responses & Module Error Reference

| HTTP Status | Code | Cause / Reason | Resolution / Handling |
|-------------|------|----------------|-----------------------|
| `400` | `VALIDATION_ERROR` | Missing or invalid fields (e.g. empty content, invalid email) | Show field error in form UI |
| `401` | `API_KEY_MISSING` / `INVALID_API_KEY` | Missing or invalid `x-api-key` header | Check authentication header |
| `404` | `ARTICLE_NOT_FOUND` | `article_id` does not reference an active, published article | Verify target article ID |
| `429` | `RATE_LIMIT_EXCEEDED` | Rate limit exceeded (`PUBLIC_SUBMISSION_LIMITER`) | Show "Please wait before commenting again" |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected backend server exception | Show generic retry message |
