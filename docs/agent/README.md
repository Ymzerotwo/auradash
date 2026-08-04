# AuraDash Public API — Developer & AI Agent Context

> **Version:** 1.0 · **Base URL:** `https://<your-worker>.workers.dev/api/public`  
> **Authentication:** HMAC-SHA256 Stateless API Key (`x-api-key`)

---

## Overview

The **AuraDash Public API** is a stateless, read-heavy RESTful API designed for web applications, mobile apps, and third-party integrations to consume live data (articles, services, business settings) and submit public interactions (contact inquiries, article comments) — securely without exposing admin credentials.

**Every request** sent to public endpoints requires a valid API key passed via the `x-api-key` header. Keys are cryptographically verified using HMAC-SHA256 signatures and bound to specific domains, ensuring stolen keys cannot be abused on unauthorized domains.

> 🚨 **IMPORTANT DIRECTIVE FOR AI AGENTS & DEVELOPERS (READ-ONLY CONTEXT)**:  
> All architectural documentation, route paths, query parameter structures, and caching explanations in this directory are **strictly for understanding and context (Read-Only)**.  
> **AI Coding Assistants MUST NOT modify, alter, or rewrite the backend URL structures, route definitions, API contracts, or caching mechanisms.** AI Agents must consume the API endpoints exactly as documented without attempting to refactor or change backend routes.

---

## 🤖 Core Purpose & Instructions for AI Agents

If you are an **AI Coding Assistant** (Cursor, Antigravity, ChatGPT, Claude, GitHub Copilot) reading this folder, follow these fundamental principles:

### 1. What This Documentation Teaches You
- How to consume live public data (Articles, Services, Business Settings, Categories).
- How to submit public interactions (Contact form inquiries, Article comments).
- How to construct valid HTTP requests using HMAC API Keys (`x-api-key`).
- How to parse standardized JSON response envelopes and handle error codes.

### 2. Why You Should Use It
- To build **custom client applications** (e.g., Flutter / React Native mobile apps, Next.js / Vue / Nuxt client websites, landing pages).
- To ensure client applications follow security, caching, rate-limiting, and error-handling best practices without making assumptions.

### 3. 🚨 ZERO RELATION TO THE ADMIN DASHBOARD (Strict Disambiguation)
- **PUBLIC CLIENTS ONLY**: This documentation applies **EXCLUSIVELY to Public API endpoints (`/api/public/*`)** for client-facing websites and mobile apps.
- **NOT FOR ADMIN DASHBOARD**: This documentation has **ABSOLUTELY ZERO RELATION to the AuraDash Admin Dashboard** (`/api/*`).
- The Admin Dashboard uses KV-backed Sessions, Double-Submit CSRF tokens, and RBAC permissions. **DO NOT** attempt to use these public API keys or public endpoints for Admin Dashboard authentication or administration tasks.

---

## Documentation Index

| File | Subject |
|------|---------|
| [01-authentication.md](./01-authentication.md) | How to obtain API keys, production vs test keys, HMAC validation, and domain binding |
| [02-articles.md](./02-articles.md) | Articles & Categories endpoints — listing, detail, pagination, and comments |
| [03-services.md](./03-services.md) | Services & Categories endpoints — listing, detail, and booking-optimized views |
| [04-inbox.md](./04-inbox.md) | Public contact & inquiry submission endpoint (POST only) |
| [05-comments.md](./05-comments.md) | Public article comment submission endpoint |
| [06-settings.md](./06-settings.md) | Public business settings (site branding, contact info, social links) |
| [07-errors.md](./07-errors.md) | Complete error codes reference, HTTP status codes, and troubleshooting guide |
| [08-frontend-integration.md](./08-frontend-integration.md) | **Complete Frontend Integration Blueprint** — File structure, HTTP client, React Query hooks, caching strategy, and code examples |
| [09-field-schemas.md](./09-field-schemas.md) | **Complete Field Reference** — Articles & Services field schemas, `seo_data` structure, and `meta_data` field types |
| [10-security-rules.md](./10-security-rules.md) | **🔒 MANDATORY Security Rules** — Strict security compliance rules for AI agents and developers building Public API clients |
| [11-faq-and-antihallucination.md](./11-faq-and-antihallucination.md) | **🤖 Anti-Hallucination Q&A Guide** — Essential Q&A preventing AI models from hallucinating non-existent features or security mistakes |
| [openapi.json](./openapi.json) | **⚙️ OpenAPI 3.0.3 Specification** — Standard JSON specification for all 23 public endpoints |
| [PROMPT_TEMPLATE.md](./PROMPT_TEMPLATE.md) | **🤖 Ready-to-Use AI Prompts** — Copy-paste prompt templates for generating client apps using Cursor/ChatGPT/Antigravity |

---

## Core Conventions & Data Behaviors

- 🌐 **Content Language**: Public API endpoints return database content (`title`, `excerpt`, `content`) directly as authored by the administrator in its original language (Arabic or English). There is no server-side translation layer per request. Client applications display the content directly and use locale dictionaries (`lang/*.json`) for UI controls (buttons, headers, navigation).
- ⚡ **Default Sorting**: Listing endpoints (e.g., `GET /articles`) sort items by default by publication date descending (`published_at DESC`). To retrieve "Latest 3 Articles" for a homepage card grid, simply pass `limit=3` (`GET /api/public/articles?limit=3`).
- 📝 **Public Bookings**: Service booking requests are submitted via `POST /api/public/inbox` using `inquiry_type: "service"` & `service_id: "<uuid>"`. Ad-hoc booking submissions are reviewed and converted to CRM profiles & bookings by admins.

---

## Quick Start

### 1. Obtain an API Key

Log into the AuraDash Admin Dashboard → **Settings → API Keys** → Create a **Production** key bound to your website domain (e.g. `example.com`).

> For local development, create a **Test** key. Test keys bypass domain binding and expire within ≤ 24 hours.

### 2. Include the Key in Every Request

```http
GET /api/public/articles HTTP/1.1
Host: <your-worker>.workers.dev
x-api-key: <YOUR_API_KEY>
Origin: https://example.com
```

Or via `Authorization: Bearer` header:

```http
Authorization: Bearer <YOUR_API_KEY>
```

### 3. Handle Standard Response Envelopes

All responses follow a consistent JSON structure:

```json
{
  "success": true,
  "code": "ARTICLES_FETCHED",
  "message": "Articles retrieved successfully",
  "data": { ... }
}
```

---

## Authentication Summary

| Concept | Value |
|---------|-------|
| Primary Header | `x-api-key: <key>` |
| Alternative Header | `Authorization: Bearer <key>` |
| Key Algorithm | HMAC-SHA256 |
| Domain Binding | Exact match or subdomain of declared domain |
| Origin / Referer Header | **Required** for production keys |
| Test Key Behavior | Bypasses domain binding; max 24-hour expiration |
| Rate Limiting | Enforced on public submission endpoints (inbox & comments) |

---

## Standard Response Envelope

```typescript
interface ApiResponse<T = any> {
  success: boolean;       // true on 2xx status, false on 4xx/5xx
  code: string;           // Machine-readable code (e.g. "ARTICLES_FETCHED")
  message: string;        // Human-readable description
  data?: T;               // Response payload on success
  errors?: ZodIssue[];    // Validation errors array on VALIDATION_ERROR (400)
}
```

---

## Rate Limiting & Anti-Spam

Submission endpoints (`POST /comments`, `POST /inbox`) are protected by a dedicated rate limiter (`PUBLIC_SUBMISSION_LIMITER`). Exceeding the rate limit returns `429 Too Many Requests`. Submissions also feature a random tarpit delay (500ms – 1.5s) to discourage automated bots.

---

## Base URL Convention

| Environment | Base URL |
|-------------|----------|
| Production | `https://<worker>.workers.dev/api/public` |
| Local Development | `http://localhost:8787/api/public` |

---

## ⚡ Edge Caching Architecture & Atomic Overwrite Meta-Cache

AuraDash utilizes an advanced **Edge Micro-Caching Architecture** built on the Cloudflare Workers Cache API (`caches.default`). It delivers sub-millisecond public API response times globally while solving the classic wildcard cache invalidation problem on Cloudflare free/standard edge tiers.

### 🏛️ The Problem with Traditional Edge Caching

On Cloudflare Workers, standard Cloudflare tiers **do NOT support wildcard cache purging** (e.g., purging all `/api/public/articles*` endpoints when a new article is created). Traditional workarounds require looping through all possible pagination parameters (e.g., `page=1..50`, `limit=10,20,50`), which is slow, unreliable, and fragile.

### ⚡ The "Atomic Overwrite" Meta-Cache Solution

AuraDash solves this with a zero-loop, instant global invalidation pattern called **Atomic Overwrite Meta-Caching**:

1. **Meta-Hash Generation**:
   AuraDash maintains a tiny 6-character random string (e.g., `services` → `a1b2c3`) stored in a dedicated internal cache key (`/internal/meta-hash/{entityType}`).

2. **Transparent Query Versioning**:
   When a client requests a public endpoint (e.g. `GET /api/public/services`), `cache.middleware.ts` reads the current entity hash (`a1b2c3`) and appends it to the internal cache key as `_v=a1b2c3`:
   ```
   Internal Cache Key: GET http://localhost/api/public/services?_v=a1b2c3
   ```

3. **Instant Global Invalidation on Update (`purgeEntityCache`)**:
   When an administrator creates, updates, or deletes a service/article via the dashboard:
   - `purgeEntityCache(c, 'services')` is triggered.
   - It generates a **new random 6-character hash** (e.g. `x9y8z7`) and performs an **Atomic `cache.put()` Overwrite** on `/internal/meta-hash/services`.

4. **Zero-Latency Invalidation**:
   The very next public GET request for `/api/public/services` fetches the new hash (`x9y8z7`). The resulting cache key becomes `GET /api/public/services?_v=x9y8z7`.
   - Because the URL changed, it **instantly MISSES the old cache** and fetches fresh data from D1 Database.
   - The old cache naturally expires without requiring any manual delete loops or wildcard purges.

### 🔄 Entity Relationship Cascades

When an entity is updated, `purgeEntityCache` invalidates all related entity groups to guarantee data consistency:

| Updated Entity (`type`) | Triggered Invalidation Group | Reason |
|-------------------------|------------------------------|--------|
| `services` / `service-categories` / `booking` | `['services', 'service-categories', 'booking']` | Service price/category updates affect booking & public catalog |
| `articles` / `article-categories` | `['articles', 'article-categories']` | Article publishing affects category counters and lists |
| `settings` | `['settings']` | Business identity updates affect public footer & header |
| `comments` | `['comments', 'articles']` | Approved comments update article comment counts |

### 🛠️ Code Reference

- **Cache Middleware**: `backend/src/middleware/cache.middleware.ts`
- **Cache Utility & Atomic Purging**: `backend/src/utils/cache.utils.ts`


