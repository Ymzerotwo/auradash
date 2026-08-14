# 08 · Framework-Agnostic Integration Architecture

> **CORE PRINCIPLE**: This document defines the **universal architectural principles and data flow patterns** for connecting ANY client application (**Flutter**, **React / Next.js**, **Vue / Nuxt**, **iOS Swift**, **Android Kotlin**, **Svelte**, or **PHP**) to the AuraDash Public API. It is 100% language-agnostic and framework-agnostic.

> 🚨 **MANDATORY DIRECTIVE: CONNECT REAL API FIRST, DESIGN/STYLE SECOND (NO LAZINESS / NO MOCK-ONLY UI)**:
> When building or refactoring client applications, **YOU MUST WIRE UP AND ACTIVATE REAL API CALLS FIRST** before perfecting UI layouts or CSS styles.
> - **Never rely on static fallback data while building**: Do NOT build components that only read from local objects/mocks.
> - **The Real API is Mandatory**: Every component (Header, Footer, Services, Blog, Contact, Booking) MUST actively initiate real HTTP requests (`GET /settings`, `GET /services`, `GET /articles`, `POST /inbox`, `POST /comments`) via the network client on initial mount/render.
> - **Role of Fallbacks**: Hardcoded fallbacks (`FALLBACK_PUBLIC_SETTINGS`, static mocks) are **strictly an emergency safety net (Resilience Layer)** to prevent UI crashes if the server is offline or the network drops. They are NEVER a substitute for making the live API connection. Connecting to the live backend first eliminates schema mismatches, ensures real-time CMS synchronization, and avoids costly hydration/wiring bugs later.

---

## 1. High-Level Architectural Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              Client Application (Any Tech Stack)                │
│  (Flutter / React / Vue / Swift / Kotlin / PHP / Vanilla JS)    │
│                                                                 │
│  ┌──────────────┐    ┌───────────────┐    ┌─────────────────┐  │
│  │   UI Views   │───►│ State/Store   │───►│   HTTP Client   │  │
│  │ / Components │    │  Layer        │    │ (Network Layer) │  │
│  └──────────────┘    └───────────────┘    └────────┬────────┘  │
│                                                     │           │
│                                           ┌─────────▼────────┐  │
│                                           │ Config Constants │  │
│                                           │ BASE_URL / API_KEY│  │
│                                           └─────────┬────────┘  │
└─────────────────────────────────────────────────────┼───────────┘
                                                       │
                                              x-api-key header
                                              Origin header (browser)
                                                       │
                                    ┌──────────────────▼──────────────────┐
                                    │        AuraDash Public API           │
                                    │   /api/public/*                      │
                                    │                                      │
                                    │  ┌────────────────────────────────┐ │
                                    │  │  HMAC-SHA256 API Key Middleware │ │
                                    │  │  ✅ Mathematical Signature      │ │
                                    │  │  ✅ Domain Binding Check        │ │
                                    │  └────────────────────────────────┘ │
                                    │                                      │
                                    │  Articles · Services · Inbox         │
                                    │  Comments · Settings                 │
                                    └──────────────────────────────────────┘
```

---

## 2. Universal Client Architecture Layers

Any client application connecting to AuraDash should structure its network and data layers into **3 decoupled tiers**:

### 🔹 Tier 1: Configuration Layer (Environment Constants)
- **Base URL**: Set to your custom API domain + path prefix: `https://api.yourdomain.com/api/public` (or local dev: `http://localhost:8787/api/public`).
- **API Key**: Securely loaded from environment configuration. 
  - *Production Keys*: Domain-bound for live applications.
  - *Test Keys*: Unbound keys for local development, mobile simulators, or S2S testing (expire ≤ 24h).

### 🔹 Tier 2: HTTP Transport & Interceptor Layer
- **Mandatory Header Injection**: Every outgoing HTTP request MUST attach the header `x-api-key: <YOUR_API_KEY>` (or `Authorization: Bearer <YOUR_API_KEY>`).
- **Content Type**: `Content-Type: application/json` for POST requests.
- **Unified Response Processing**:
  - Read `success` boolean from the JSON envelope.
  - If `success === true`: Unpack `data` payload and pass to UI/State layer.
  - If `success === false`: Extract `code` (e.g., `VALIDATION_ERROR`, `ARTICLE_NOT_FOUND`) and throw/handle a domain-specific exception.

### 🔹 Tier 3: Domain Service Layer (Feature Modules)
Decouple HTTP calls into feature-based service modules:
1. **Articles Service**: Handles listing (`GET /articles`), single article detail (`GET /articles/:slug`), and nested comments (`GET /articles/:slug/comments`).
2. **Services Service**: Handles display catalog (`GET /services`) and lean dropdown data (`GET /booking/services`).
3. **Inbox Service**: Handles submission of contact inquiries and booking requests (`POST /inbox`).
4. **Comments Service**: Handles posting visitor comments (`POST /comments`).
5. **Settings Service**: Handles fetching business identity and social links (`GET /settings`).

---

## 3. Core Operational Data Flows

### A. Dynamic SEO & Head Generation Pattern
- When a user or crawler accesses a Detail page (`/articles/:slug` or `/services/:slug`), the client fetches the resource payload.
- The UI layer evaluates `seo_data` object with fallback logic:
  1. `Title`: `seo_data.meta_title` ➔ Fallback: Resource `title`/`name`.
  2. `Description`: `seo_data.meta_description` ➔ Fallback: Article `excerpt` (truncated 155 chars) or Service description from `meta_data` (item with `type: "text-description"`).
  3. `Social Image`: `seo_data.og_image` ➔ Fallback: Article `preview_image_url` / Service image from `meta_data` (item with `type: "photo"`) / site logo.
  4. `Robots`: If `seo_data.is_indexable === false` ➔ Inject `noindex, nofollow`.

### B. Public Service Booking Submission Flow
1. Client fetches lean service dropdown items via `GET /booking/services`.
2. Visitor selects a service and completes the contact form.
3. Client dispatches `POST /inbox` payload:
   ```json
   {
     "full_name": "Visitor Name",
     "phone": "+123456789",
     "email": "visitor@example.com",
     "inquiry_type": "service",
     "service_id": "<SELECTED_SERVICE_UUID>",
     "message": "Inquiry details..."
   }
   ```
4. Backend verifies pricing & availability, stores message in Admin Inbox, and returns submission ID.

### C. Threaded Comment & Tree Rendering Pattern
1. Client fetches approved comments via `GET /articles/:slug/comments`.
2. Comments return flat array with `id` and `parent_id`.
3. Client UI groups comments:
   - Items with `parent_id === null` rendered as **Root Comments**.
   - Items with `parent_id !== null` rendered **Indented/Nested** under parent comment matching `id === parent_id`.

---

## 4. Exception & Error Resolution Pipeline

When an API request fails, AI models and client applications must evaluate errors according to this decision tree:

```
                      Is Response 2xx Status?
                             │
                  ┌──────────┴──────────┐
                  │ YES                 │ NO
                  ▼                     ▼
        Unpack data Payload      Evaluate HTTP Status Code
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
       HTTP 401 / 403               HTTP 400                      HTTP 429
   (Authentication Failure)    (Validation / Not Found)        (Rate Limited)
           │                            │                            │
   Check x-api-key header       Inspect `code` slug:          Enforce 60s cooldown.
   & Origin header binding.    • VALIDATION_ERROR:           Display user-friendly
                                 Show field-level errors.     "Please wait" message.
                               • ARTICLE_NOT_FOUND:
                                 Render 404 View.
```

---

## 5. Summary Checklist for AI Frontend Generators

When instructing an AI Agent to build a frontend client for AuraDash in ANY framework:
1. 🚨 **CONNECT REAL API FIRST**: Always initialize and connect HTTP services (`GET /settings`, `GET /services`, `GET /articles`, `POST /inbox`, etc.) to live components BEFORE spending time on UI/CSS polish. Fallbacks are strictly an offline safety net.
2. 🚫 **STRICT ZERO-CACHE POLICY**: Ensure all API requests and page routes have caching completely disabled at runtime (`cache: "no-store"`, `next: { revalidate: 0 }`, `dynamic = "force-dynamic"`, `staleTime: 0`) for real-time CMS sync. Do NOT attach `Cache-Control` in HTTP request headers.
3. ✅ **Pass `x-api-key`** in default network headers.
4. ✅ **Parse standard envelope** (`success`, `code`, `data`, `errors`).
5. ✅ **Derive SEO metadata dynamically** using `seo_data` fallbacks.
6. ✅ **Render `meta_data` dynamic fields** using component mappers.
7. ✅ **Submit forms to `/inbox` and `/comments`** with proper `inquiry_type` enums.

---

## 6. Strict Zero-Cache Directive & Real-Time Sync Policy (No Caching by Default)

> 🚨 **UNIVERSAL ARCHITECTURAL PRINCIPLE: ZERO LOCAL / SERVER CACHING BY DEFAULT**  
> AuraDash operates as a real-time Headless CMS. When an administrator adds a new service, updates pricing, edits business hours, or publishes an article in the Admin Dashboard, the changes **MUST appear live on the client application immediately upon page refresh or view reload**.  
> **Rule**: All client applications—regardless of language or framework (**Flutter**, **React / Next.js**, **Vue / Nuxt**, **iOS Swift**, **Android Kotlin**, **Svelte**, etc.)—**MUST explicitly disable all caching on API requests and data layers by default**.

### 🚫 Strict Clean Request Headers Directive (No Custom Cache Header Pollution)
- **Minimal Standard Request Headers**: Outgoing HTTP request headers MUST contain **ONLY**:
  ```json
  {
    "Content-Type": "application/json",
    "x-api-key": "<API_KEY>"
  }
  ```
  *(or `Authorization: Bearer <API_KEY>`)*.
- **DO NOT Attach Custom Cache Headers in Network Requests**: AI models and developers **MUST NOT** send custom cache-control headers (`Cache-Control: no-cache, no-store`, `Pragma: no-cache`, `Expires: 0`) in client `fetch()` request headers.
- **Why**: Sending unapproved custom headers in browser cross-origin requests causes the browser to issue a CORS Preflight (`OPTIONS`) request listing those headers in `Access-Control-Request-Headers`. If the backend does not permit them, Cloudflare / Wrangler Workerd throws internal errors (`X [ERROR] Error: internal error; reference = ...`) or rejects the preflight check.
- **The Correct Universal Way to Disable Caching**: Disable caching strictly at the **framework/client runtime level** (e.g. Next.js internal options: `fetch(url, { cache: 'no-store', next: { revalidate: 0 } })`, `export const dynamic = 'force-dynamic'`; React Query: `staleTime: 0`) **WITHOUT polluting or adding extra HTTP request headers**.

### 🌐 Universal Implementation Guidelines
1. **Network Layer**: Keep request headers clean (`x-api-key` + `Content-Type` only).
2. **Framework-Specific Awareness**: If using a framework that enables caching or static pre-rendering by default (such as Next.js App Router), configure internal framework options (`cache: 'no-store'`, `revalidate: 0`, `dynamic = 'force-dynamic'`) to force dynamic data fetching.
3. **State Management**: If using state management or query libraries (e.g., React Query, Pinia, Riverpod, Bloc), configure query lifecycles to fetch fresh data on view mount rather than serving stale cache (`staleTime: 0`).

---

### ⚠️ Mandatory Advisory Protocol If User Requests Caching

If the user specifically asks to enable caching (e.g., *"Can we cache services or articles?"*):

1. **Step 1 (Mandatory Advisory)**: The AI Assistant **MUST FIRST advise the user against caching**:
   > *"It is strongly recommended NOT to cache public API endpoints so that updates made in the AuraDash Admin Dashboard (such as adding services, editing prices, updating contact numbers, or publishing articles) appear live in real-time immediately. Enabling caching will cause visitors to see stale data until the cache expires."*
2. **Step 2 (Execute If User Insists)**: If and only if the user confirms or explicitly insists on enabling caching (e.g. for high-traffic optimization or static pre-generation), then and only then proceed to configure the specific cache behavior requested by the user.



