# 11 · Anti-Hallucination Q&A Guide for AI Agents

> **MANDATORY AI DIRECTIVE**: This document addresses common misconceptions and prevents AI Coding Assistants (**Cursor**, **Antigravity**, **ChatGPT**, **Claude**, **GitHub Copilot**) from hallucinating non-existent features, modifying backend routes, or introducing security anti-patterns when building clients for AuraDash.

---

## ❓ Question 1: Can I use this Public API to log in as an Admin, manage users, or access `/api/workspace`?
> **❌ ABSOLUTELY NOT.**  
> - **Public API Only**: All endpoints documented in this folder start with `/api/public/*` and are intended **exclusively for public client applications** (websites, landing pages, mobile apps).  
> - **Zero Admin Access**: Admin Dashboard routes (`/api/*`, `/api/workspace`, `/api/team`, etc.) operate on KV-backed Sessions, CSRF tokens, and RBAC permissions. They are completely separate and **cannot** be accessed using public API keys.

---

## ❓ Question 2: Can I modify, refactor, or rewrite backend API routes or URL query structures?
> **❌ NO. ALL ENDPOINTS ARE READ-ONLY CONTRACTS.**  
> - AI Coding Assistants **MUST NOT** attempt to alter backend routes, change parameter names, or refactor endpoint structures.  
> - Consume the API routes **exactly as documented** in `openapi.json` and the documentation index.

---

## ❓ Question 3: Should I put the API Key in the URL query string (e.g. `GET /api/public/articles?api_key=secret`)?
> **❌ NO. THIS IS A SECURITY VIOLATION.**  
> - API keys **MUST ALWAYS** be passed in HTTP request headers:  
>   - Preferred: `x-api-key: <YOUR_API_KEY>`  
>   - Alternative: `Authorization: Bearer <YOUR_API_KEY>`  
> - Never expose API keys in URL parameters, logs, or client-side public bundles without environment protection.

---

## ❓ Question 4: Should I implement a server-side translation layer or pass `?lang=ar` query parameters for database content?
> **❌ NO.**  
> - Database text (`title`, `excerpt`, `content`) is returned in its original language as authored by the administrator.  
> - Client applications display database content directly and use local `lang/*.json` dictionaries **only for static UI elements** (buttons, form labels, header navigation).

---

## ❓ Question 5: Can I send `POST` requests to create new articles, categories, or services via the Public API?
> **❌ NO.**  
> - The Public API allows `POST` requests for **only two specific endpoints**:  
>   1. `POST /api/public/inbox` (Public contact inquiries and service booking requests).  
>   2. `POST /api/public/comments` (Public article comment submissions).  
> - Creating, updating, or deleting articles, services, or categories requires Admin Dashboard session permissions.

---

## ❓ Question 6: How do public users request a service booking?
> **✅ VIA `POST /api/public/inbox`**  
> - Submit a `POST` request to `/api/public/inbox` with:  
>   - `inquiry_type`: `"service"`  
>   - `service_id`: `"<service-uuid>"`  
>   - `full_name`, `email`, `phone`, and optional `message`.  
> - Admins review these inquiries in the dashboard and convert them into CRM customer bookings.

---

## ❓ Question 7: Do I need to concatenate base URLs or domain paths to render image URLs?
> **❌ NO.**  
> - All image URLs returned by the API (`preview_image_url`, R2 media URLs, and images inside `meta_data`) are **complete, absolute HTTPS URLs**.  
> - Render them directly in image components (`<img src="...">` or `Image` widgets) without modification.

---

## ❓ Question 8: What should I do if the API returns a `429 Too Many Requests` status code?
> **❌ DO NOT RETRY IMMEDIATELY IN A LOOP.**  
> - Public submission endpoints enforce strict rate limits (`PUBLIC_SUBMISSION_LIMITER`).  
> - The API returns a `Retry-After: 60` HTTP header specifying the exact seconds to wait.  
> - Client apps must handle `429 RATE_LIMIT_EXCEEDED` gracefully by parsing `Retry-After`, displaying a cooldown countdown message (e.g., *"Please wait 60 seconds before trying again"*), and disabling the submit button until the timer expires.

---

## ❓ Question 9: Why did my Production API Key receive a `403 DOMAIN_MISMATCH` error?
> **✅ PRODUCTION KEYS ARE BOUND TO SPECIFIC DOMAINS.**  
> - Production keys (`auradash_pk_*`) verify the HTTP `Origin` header against the domain declared when creating the key.  
> - For local development (`localhost`), Postman, or mobile app simulators, **ALWAYS use a Test Key (`auradash_ts_*`)**, which bypasses domain binding.

---

## ❓ Question 10: Does the client application need a direct SQLite / D1 database connection or ORM?
> **❌ NO.**  
> - The client application is **100% decoupled and headless**.  
> - It communicates exclusively over HTTPS REST API calls using JSON envelopes. No database drivers, ORMs, or SQL queries are needed on the client.

---

## ❓ Question 11: How does pagination work? Can I request `limit=9999` to fetch all articles at once?
> **❌ NO. USE PAGINATION RESPONSIBLY (HARD CAP: 100).**  
> - Request reasonable page sizes (default `12` or `20`; backend enforces a strict hard cap `MAX_LIMIT = 100`).  
> - Pass `page` and `limit` parameters (e.g., `GET /api/public/articles?page=1&limit=20`).  
> - Read exact pagination metadata from `data.pagination`: `{ total, page, limit, totalPages }`.

---

## ❓ Question 12: Are draft or unpublished articles returned by the Public API?
> **❌ NO.**  
> - Public article endpoints query **ONLY** active, published articles (`is_active = 1 AND published_at IS NOT NULL AND published_at <= CURRENT_TIMESTAMP`).  
> - Drafts, scheduled, or inactive articles are filtered server-side and only accessible inside the Admin Dashboard.

---

## ❓ Question 13: Does the Public API require Cookies, CSRF tokens, or Session IDs?
> **❌ NO.**  
> - Public endpoints are 100% stateless and session-free.  
> - Do not send `session_id` cookies or `x-csrf-token` headers. Only send `x-api-key`.

---

## ❓ Question 14: What is the difference between Production Keys (`auradash_pk_*`) and Test Keys (`auradash_ts_*`)?
> **✅ KEY TYPES COMPARISON:**  
> - **Production Key (`auradash_pk_*`)**: Domain-bound to a specific live origin (e.g., `example.com`), **never expires** until manually revoked. Use for live client apps.  
> - **Test Key (`auradash_ts_*`)**: Bypasses domain binding, expires in **≤ 24 hours**. Use for `localhost`, Postman, mobile simulators, and CI/CD pipelines.

---

## ❓ Question 15: Can public users edit or delete their submitted comments or inbox inquiries?
> **❌ NO.**  
> - Public POST submissions are **write-once append-only**.  
> - Editing, moderating, or deleting comments and inquiries is performed exclusively by authorized administrators inside the Admin Dashboard.

---

## ❓ Question 16: What happens if the administrator updates `AURADASH_MASTER_SECRET` on the backend?
> **✅ ALL EXISTING API KEYS BECOME IMMEDIATELY INVALID.**  
> - Keys are validated statelessly via HMAC-SHA256 signatures derived from `AURADASH_MASTER_SECRET`.  
> - Rotating the secret invalidates all keys globally. Your client will receive `401 INVALID_API_KEY`. Handle this by prompting the developer to re-issue keys.

---

## ❓ Question 17: How are unapproved article comments handled, and what is the endpoint path?
> **✅ UNAPPROVED COMMENTS ARE HIDDEN FROM THE PUBLIC API.**  
> - Submitted comments start with `status: 'pending'` or `'spam'`.  
> - Endpoint path: `GET /api/public/articles/:slug/comments` (uses article `:slug`).  
> - Returns **ONLY** comments with `status: 'approved'`.

---

## ❓ Question 18: Can public users upload media or files directly to Cloudflare R2 via the Public API?
> **❌ NO.**  
> - Media upload (`POST /api/upload`) is an internal admin endpoint strictly restricted to authenticated Admin Dashboard sessions.  
> - Public users cannot upload files to R2 storage.

---

## ❓ Question 19: Are WebSocket or Server-Sent Events (SSE) connections supported on public routes?
> **❌ NO.**  
> - Public API endpoints are standard stateless HTTPS REST endpoints.  
> - Do not attempt WebSocket or SSE connections on `/api/public/*`.

---

## ❓ Question 20: What is the exact header key for sending API Keys?
> **✅ `x-api-key` (or `Authorization: Bearer <key>`).**  
> - Header names are case-insensitive in HTTP/2 and HTTP/3.  
> - Standard practice: `x-api-key: auradash_pk_xxxxxxxxxxxx`

---

## ❓ Question 21: Can I pass text search or query filtering parameters (e.g. `?search=`, `?q=`, `?filter=`) to listing endpoints?
> **❌ NO. FULL-TEXT SEARCH PARAMETERS ARE NOT SUPPORTED ON THE BACKEND.**  
> - The Public API listing endpoints (`GET /articles`, `GET /services`) do **NOT** support free-text search query parameters like `?search=`, `?q=`, `?query=`, or `?filter=`.  
> - The ONLY supported query parameters are `page`, `limit`, and category filters (`article_category_id` or category slug endpoints).  
> - AI Coding Assistants **MUST NOT** hallucinate search query parameters in API fetch requests. If a client UI requires text search, fetch the items via the standard API endpoints and perform **client-side text filtering** over the returned dataset.

---

## Quick Anti-Hallucination Checklist for AI

| Action | Allowed? | Correct Approach |
|--------|----------|------------------|
| Modify backend API routes | ❌ No | Consume routes strictly as documented |
| Put API Key in URL query | ❌ No | Send key in `x-api-key` header |
| Admin operations via Public API | ❌ No | Admin operations require Dashboard Sessions |
| Concatenate image URL paths | ❌ No | Image URLs are already full absolute HTTPS URLs |
| Retry 429 errors in a loop | ❌ No | Read `Retry-After: 60` header, show cooldown UI |
| Pass `?search=` or `?q=` params | ❌ No | No backend text search; filter datasets client-side |
| Use Test Key in production | ❌ No | Production keys for live domains, Test keys for local dev |
| Request `limit=9999` pagination | ❌ No | Use reasonable limits (6–20) with `{ total, page, limit, totalPages }` |
| Send cookies/CSRF to Public API | ❌ No | Public API is 100% stateless; use `x-api-key` only |
| Upload media via Public API | ❌ No | Media uploads require Admin Dashboard session (`POST /api/upload`) |
