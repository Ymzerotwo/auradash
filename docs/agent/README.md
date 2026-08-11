# AuraDash Public API — Developer & AI Agent Context

> **Version:** 1.0 · **Base URL:** `https://api.yourdomain.com/api/public`  
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

### 4. 🚨 CONNECT REAL API FIRST (NO MOCK-ONLY LAZINESS)
- **Live Endpoints First, Styling Second**: When building any client application, **wire up the live HTTP requests (`GET /settings`, `GET /services`, `GET /articles`, `POST /inbox`, `POST /comments`) from Day 1**.
- **Never build mock-only UIs**: Static fallbacks (`FALLBACK_PUBLIC_SETTINGS`, offline mocks) are strictly an emergency safety net (Resilience Layer) in case the server is down or unreachable. They are NEVER a substitute for executing real network calls. Connecting the real API first ensures complete CMS synchronization and eliminates schema mismatches.

### 5. 📖 MANDATORY: READ ALL DOCUMENTATION FILES & OBEY ALL RULES (NO SHORTCUTS)
- **Exhaustive Reading Requirement**: AI Coding Assistants **MUST thoroughly read and process EVERY SINGLE FILE** in this `./docs/agent/` folder (from `01-authentication.md` to `12-data-onboarding-and-demo.md` plus `PROMPT_TEMPLATE.md` and `openapi.json`) before generating client code.
- **Strict Rule Compliance**: You **MUST strictly adhere to every single rule, data schema, error handling directive, and security constraint** documented in these files.
- **Zero Laziness / Zero Assumptions**: Do NOT skip reading any file, do NOT use placeholders, do NOT guess or hallucinate backend fields/endpoints, and do NOT take shortcuts. Every line of code generated must faithfully align with the documented architectural standards.

### 6. 🚫 STRICT PROHIBITION: NEVER READ OR INSPECT BACKEND SOURCE CODE
- **Sole Source of Truth**: The documentation in this `./docs/agent/` folder and `openapi.json` is the **ONLY authoritative reference** for all API contracts, data schemas, response envelopes, error codes, and field definitions.
- **Do NOT Inspect `auradash/backend`**: AI Coding Assistants **MUST NOT read, search, or inspect backend code, server routes, Cloudflare Workers scripts, D1 SQLite database migrations, or seed files**.
- **Why**: Reading backend source code wastes context/tokens, leads to architectural confusion, and causes models to hallucinate internal server structures instead of treating the backend as a decoupled, headless REST API.
- **Data Management**: All content (Articles, Services, Settings, Categories) is managed via the **AuraDash Admin Dashboard UI** and consumed via the Public API. Client applications must never attempt to seed databases directly.

### 7. 💡 ALL EXAMPLES ARE FOR UNDERSTANDING & TEACHING (NOT FOR CLONING OR HARDCODING)
- **Pedagogical Blueprint Notice**: Every single sample service, article blueprint, JSON payload, custom field label, and price tier in this documentation is **purely an educational illustration** to explain data formats and dynamic rendering patterns.
- **No Direct Cloning / Hardcoding**: AI Coding Assistants **MUST NOT clone, hardcode, or blindly copy-paste these sample values** as static data into client source code.
- **Purpose**: AI models must use these examples **exclusively to teach and explain the concepts to the user**, and then guide the user to input their own genuine, customized business data via their Admin Dashboard.

### 8. 🚫 STRICT ZERO-CACHE DIRECTIVE & REAL-TIME SYNC (NO CACHING BY DEFAULT)
- **Zero Local/Server Caching by Default**: All client applications across ANY platform or framework MUST disable all caching on API requests and data layers by default.
- **Why**: AuraDash is a real-time headless CMS. Changes made in the Admin Dashboard (editing services, updating clinic hours, publishing articles) MUST be reflected on the live frontend immediately upon page refresh or view reload.
- **If User Asks to Enable Caching**:
  1. *Advise First*: The AI assistant **MUST FIRST advise the user against caching** (explaining that live dashboard updates won't be seen immediately).
  2. *Execute Only If User Insists*: If the user confirms or explicitly requests caching, only then implement the specific cache behavior requested.

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
| [12-data-onboarding-and-demo.md](./12-data-onboarding-and-demo.md) | **🚀 Data Onboarding & Demo Guide** — Guidelines for AI agents to visualize demo content and guide users to populate data via the Dashboard |
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
Host: api.yourdomain.com
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

Submission endpoints (`POST /comments`, `POST /inbox`) are protected by a dedicated rate limiter (`PUBLIC_SUBMISSION_LIMITER`). Exceeding the rate limit returns `429 RATE_LIMIT_EXCEEDED`. Submissions also feature a random tarpit delay (500ms – 1.5s) to discourage automated bots.

---

## CORS (Cross-Origin Resource Sharing)

Public API endpoints are configured with **open CORS** to allow requests from any origin:

| Header | Value |
|--------|-------|
| `Access-Control-Allow-Origin` | `*` |
| `Access-Control-Allow-Methods` | `GET, POST, HEAD, OPTIONS` |
| `Access-Control-Allow-Headers` | `Content-Type, x-api-key` |
| `Access-Control-Max-Age` | `86400` (24 hours) |
| `Credentials` | `false` (cookies are NOT sent with public API requests) |

Browsers automatically handle preflight `OPTIONS` requests. No special CORS configuration is needed in your client application.

---

## Base URL Convention & Custom Domains

| Environment | Base URL |
|-------------|----------|
| Production | `https://api.yourdomain.com/api/public` |
| Local Development | `http://localhost:8787/api/public` |

### ⚠️ Why Custom Domains are Mandatory for Production (Cookie Policies)

AuraDash **must** be deployed on a Custom Domain (e.g., `api.yourdomain.com`) in production rather than relying on the default Cloudflare Workers subdomain (`*.workers.dev`).

**The Reason:** Cloudflare `*.workers.dev` domains are listed on the [Public Suffix List (eTLD)](https://publicsuffix.org/). Modern web browsers enforce strict security policies on these domains, completely blocking cross-site `SameSite=None; Secure` cookies. 
If you attempt to use a `.workers.dev` domain in production, features that rely on secure cookies (such as Admin Dashboard authentication sessions and CSRF tokens) will silently fail and be rejected by the browser. 

Always bind your Cloudflare Worker to a Custom Domain before taking the project live.

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


