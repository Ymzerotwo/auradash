# PROMPT TEMPLATE · Instructions for AI Client Generators

> **HOW TO USE THIS FILE**: Copy and paste the appropriate prompt template below into your AI Coding Assistant (**Cursor**, **Google Antigravity**, **Claude**, **ChatGPT**, **GitHub Copilot**) when instructing it to build a custom client website or mobile app connected to your AuraDash Public API.

---

## ⚙️ Environment Configuration Reference

Before prompting your AI model, prepare your environment variables according to your active development stage:

### 🟡 Local Development & Testing Environment
- **API Base URL**: `http://localhost:8787/api/public`
- **Key Type**: **Test Key** (`auradash_ts_*`) — Generated from Admin Dashboard → Settings → API Keys → New API Key (Type: Test). Test keys bypass domain binding and expire in ≤ 24 hours. Ideal for `localhost`, mobile emulators, Postman, and CI pipelines.

### 🔵 Live Production Environment
- **API Base URL**: `https://api.yourdomain.com/api/public` (or custom domain `https://api.yourdomain.com/api/public`)
- **Key Type**: **Production Key** (`auradash_pk_*`) — Generated from Admin Dashboard → Settings → API Keys → New API Key (Type: Production). Cryptographically bound to your specific production domain (e.g., `example.com`).

---

## 🧭 Mandatory Pre-Step for AI Assistants: Read Documentation & Conceptualize UI

Before writing any client code, AI Coding Assistants **MUST**:
1. **Thoroughly Read the Documentation**: Read all specification files inside `./docs/agent/` (`README.md`, `01-authentication.md`, `02-articles.md`, `03-services.md`, `04-inbox.md`, `05-comments.md`, `06-settings.md`, `07-errors.md`, `08-frontend-integration.md`, `09-field-schemas.md`, `10-security-rules.md`, `11-faq-and-antihallucination.md`, `12-data-onboarding-and-demo.md`) and `./docs/agent/openapi.json`.
2. **Connect Real Backend API First (No Mock/Fallback Laziness)**: 
   - 🚨 **MANDATORY**: Initialize the HTTP client and connect real API service functions (`getPublicSettings()`, `getAllServices()`, `getAllArticles()`, `submitBooking()`, etc.) to live components **FIRST** before spending time on UI/CSS polish.
   - Fallback data (`FALLBACK_PUBLIC_SETTINGS`, static offline objects) is **strictly an emergency resilience safety net** in case the server is down. It is NEVER a substitute for executing real network calls.
3. **Strict Zero-Cache Directive (Real-Time CMS Synchronization)**:
   - 🚫 **MANDATORY**: Disable all local and server-side data caching by default across your HTTP client and framework data layers.
   - *Why*: AuraDash is a real-time headless CMS. Updates made in the dashboard (services, prices, articles, hours) must appear live immediately upon refreshing or reloading the view.
   - *User Advisory Protocol*: If the user requests caching, **first advise them against it** (explaining that live updates will be delayed). Only enable caching if the user explicitly confirms/insists.
4. **Strict Ban on Inspecting Backend Source Code**: Do NOT inspect, read, or search the backend codebase (`auradash/backend`, database migrations, D1 SQLite schemas). The documentation in `./docs/agent/` and `openapi.json` is your 100% complete and authoritative source of truth.
5. **All Documentation Examples are Pedagogical Blueprints (No Cloning)**: Treat all sample JSON payloads, clinic services, and article examples in this folder as educational illustrations to help you teach and guide the user on how the system works. Never hardcode or clone these sample values into client source code.
6. **Collaborative UI Vision & Layout Conceptualization**: Brainstorm and align with the user on the visual design, page hierarchy, and component layout before implementation:
   - 🛠️ **Service Design & Card Envisioning**:
     - Discuss and define the visual structure of **Service Cards** (e.g. card elevation, price/duration pills from `meta_data`, category tags, highlight badges).
     - Discuss **Service Page & Grid Layout** (e.g., standalone grid vs category tabs/accordion, handling priority sorting using `sort_order`).
     - Define the **Service Detail Page Layout** (how custom `meta_data` elements like bullet list inclusions, photo galleries, YouTube demo embeds, and CTA buttons render dynamically).
   - 📰 **Article Design & Card Envisioning**:
     - Discuss and define the visual structure of **Article Cards** (cover image ratio, title typography, excerpt preview, author tag, reading time badge, published date).
     - Discuss **Blog Page & Grid Layout** (hero featured post, article grid distribution, category filter sidebar/tabs, pagination control).
     - Define the **Article Detail & Discussion View** (typography for rich reading experience, dynamic `meta_data` highlights, and nested/threaded comment tree design).

---

## 📱 Template 1: Generating a Mobile App (Flutter / Swift / Kotlin)

```text
You are an expert mobile developer. Your task is to build a complete mobile app (using Flutter / Swift / Kotlin) connected to the AuraDash Public API.

MANDATORY STEP 0 — Connect Real API First:
You MUST set up the HTTP client and wire live API endpoints (GET /settings, GET /services, GET /articles, POST /inbox) to your components from the very start. Do NOT build mock-only UIs. Fallback data is strictly an emergency resilience layer if the network is offline.

MANDATORY STEP 1 — Read Documentation First:
Before generating code, you MUST thoroughly read all files in `./docs/agent/` and `./docs/agent/openapi.json` to understand API contracts, data models (meta_data, seo_data), authentication (x-api-key), and error handling rules.

MANDATORY STEP 2 — Collaborative UI Vision & Layout Envisioning:
Actively collaborate with me to envision and define the UI/UX layout before building components:
- Services UI: Propose and brainstorm the design of Service Cards (badges, duration/pricing pills from meta_data), grid distribution (standalone vs category tabs, priority sort_order), detail page layout (dynamic meta_data widgets for photos, video embeds, feature lists), and booking submission flow.
- Articles UI: Propose and brainstorm Article Cards (cover image ratio, title typography, excerpt preview, reading time, published date), blog grid distribution, category filtering layout, article detail view, and threaded discussion comments.
Environment Configuration:
- Development Base URL: http://localhost:8787/api/public (or Android Emulator: http://10.0.2.2:8787/api/public)
- Production Base URL: https://api.yourdomain.com/api/public
- API Key (Test for Dev): <YOUR_TEST_API_KEY_auradash_ts_xxx>
- API Key (Production for Release): <YOUR_PRODUCTION_API_KEY_auradash_pk_xxx>

Strict Architectural Requirements:
1. Attach `x-api-key: <API_KEY>` to every request header.
2. Wire up live API requests to components immediately on mount. Never replace live calls with static mocks.
3. Parse the standard API JSON envelope: check if `success === true`, extract `data`. If `false`, handle `code` slug.
4. Implement dynamic SEO and Head fallbacks for Articles and Services according to `02-articles.md` and `03-services.md`.
5. Map dynamic `meta_data` fields (images, text-block, bullet-list, video-youtube, link) using clean, reusable UI widgets.
6. Support submission of booking requests via `POST /inbox` with inquiry_type ("service", "general", "offer") and proper handling of `service_id`.

Start by outlining the visual UI structure and card designs with me, then generate the API Client and UI pages (Home, Services Catalog, Article Blog, Booking Form, Contact Us).
```

---

## 🌐 Template 2: Generating a Web Frontend (Next.js / Vue / Nuxt / Svelte)

```text
You are a senior frontend engineer. Your task is to build a modern, high-performance client website connected to the AuraDash Public API.

MANDATORY STEP 0 — Connect Real API First:
You MUST initialize the network client and connect all live endpoints (GET /settings for Header/Footer, GET /services for Catalog, GET /articles for Blog, POST /inbox for Contact/Bookings) from Day 1. Do NOT build static/mock views instead of real API calls. Fallback data is strictly for offline resilience when the backend is unreachable.

MANDATORY STEP 1 — Read Documentation First:
Before generating code, you MUST thoroughly read all documentation in `./docs/agent/` and `./docs/agent/openapi.json` to master the API contracts, response envelopes, meta_data schemas, seo_data mapping, and security rules.

MANDATORY STEP 2 — Collaborative UI Vision & Layout Envisioning:
Brainstorm and align with me on the visual layout, components, and aesthetic direction before coding:
- Service Visuals: Propose and detail the visual concept for Service Cards (pricing/duration pills from meta_data, category badges), grid/card distribution (category tabs vs flat grid, pinned sort_order), detail page layout (dynamic meta_data rendering for galleries, YouTube embeds, feature lists), and booking modal.
- Article Visuals: Propose and detail the visual concept for Article Cards (cover image aspect ratio, title typography, excerpt preview, reading time, published date), blog grid distribution, category filtering, reading layout, and threaded comments discussion section.
Environment Configuration Setup:
- `.env.local` (Local Dev):
  NEXT_PUBLIC_AURADASH_BASE_URL=http://localhost:8787/api/public
  NEXT_PUBLIC_AURADASH_API_KEY=<YOUR_TEST_API_KEY_auradash_ts_xxx>

- `.env.production` (Production Site):
  NEXT_PUBLIC_AURADASH_BASE_URL=https://api.yourdomain.com/api/public
  NEXT_PUBLIC_AURADASH_API_KEY=<YOUR_PRODUCTION_API_KEY_auradash_pk_xxx>

Strict Architectural Requirements:
1. Include `x-api-key` in default HTTP client request headers from environment variables.
2. Wire live API fetching into Header, Footer, Home, Services, Articles, and Contact pages immediately.
3. Enforce strict Zero-Cache directive across all network requests and data layers. If user asks for caching, first advise them against it.
4. Follow all security rules in `./docs/agent/10-security-rules.md`.
5. Implement smart dynamic SEO metadata generation on Detail pages (`/articles/[slug]` and `/services/[slug]`) using `seo_data` fields with proper fallbacks.
6. Respect `is_indexable` flag (inject `noindex, nofollow` when `is_indexable === false`).
7. Render `meta_data` dynamic custom fields dynamically.
8. Handle `429 RATE_LIMIT_EXCEEDED` rate limiting gracefully with user notification and button disabling.
9. Build responsive UI views for Home, Services Catalog, Article Blog, Threaded Comments, and Booking Modal.
```

---

## 🎨 Template 3: Quick One-Page Landing Page or Booking Widget

```text
Build a clean, high-converting one-page landing page that connects to AuraDash Public API.

MANDATORY STEP 0 — Connect Real API First:
Initialize live API calls (GET /settings, GET /services/all, POST /inbox) immediately in your script/components before focusing on UI styling. Fallback data is only a safety net.

MANDATORY STEP 1 — Read Documentation:
Read `./docs/agent/README.md`, `03-services.md`, `04-inbox.md`, `09-field-schemas.md`, and `openapi.json` before building.

MANDATORY STEP 2 — Envision UI Layout:
Brainstorm with me the visual layout of Service Cards (highlighting duration, price pills, and custom meta_data fields), the grid distribution, and the booking form drawer/modal.
Environment setup:
- API Base URL: http://localhost:8787/api/public (Dev) or https://api.yourdomain.com/api/public (Prod)
- API Key: Pass via `x-api-key` header. Use Test Key for dev, Production Key for prod.

Features:
1. Fetch live Services catalog via GET /services/all.
2. Fetch global branding via GET /settings.
3. Allow visitors to book appointments via POST /inbox (handling general, service, and offer inquiry types).
4. Validate form inputs client-side before sending requests.
```
