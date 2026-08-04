# PROMPT TEMPLATE · Instructions for AI Client Generators

> **HOW TO USE THIS FILE**: Copy and paste the appropriate prompt template below into your AI Coding Assistant (**Cursor**, **Google Antigravity**, **Claude**, **ChatGPT**, **GitHub Copilot**) when instructing it to build a custom client website or mobile app connected to your AuraDash Public API.

---

## ⚙️ Environment Configuration Reference

Before prompting your AI model, prepare your environment variables according to your active development stage:

### 🟡 Local Development & Testing Environment
- **API Base URL**: `http://localhost:8787/api/public`
- **Key Type**: **Test Key** (`auradash_ts_*`) — Generated from Admin Dashboard → Settings → API Keys → New API Key (Type: Test). Test keys bypass domain binding and expire in ≤ 24 hours. Ideal for `localhost`, mobile emulators, Postman, and CI pipelines.

### 🔵 Live Production Environment
- **API Base URL**: `https://<your-worker>.workers.dev/api/public` (or custom domain `https://api.yourdomain.com/api/public`)
- **Key Type**: **Production Key** (`auradash_pk_*`) — Generated from Admin Dashboard → Settings → API Keys → New API Key (Type: Production). Cryptographically bound to your specific production domain (e.g., `example.com`).

---

## 📱 Template 1: Generating a Mobile App (Flutter / Swift / Kotlin)

```text
You are an expert mobile developer. Your task is to build a complete mobile app (using Flutter / Swift / Kotlin) connected to the AuraDash Public API.

Environment Configuration:
- Development Base URL: http://localhost:8787/api/public (or Android Emulator: http://10.0.2.2:8787/api/public)
- Production Base URL: https://<YOUR_WORKER_URL>.workers.dev/api/public
- API Key (Test for Dev): <YOUR_TEST_API_KEY_auradash_ts_xxx>
- API Key (Production for Release): <YOUR_PRODUCTION_API_KEY_auradash_pk_xxx>

Strict Architectural Requirements:
1. Attach `x-api-key: <API_KEY>` to every request header.
2. Read the OpenAPI specification in `./docs/agent/openapi.json` and documentation in `./docs/agent/` for all endpoint schemas.
3. Parse the standard API JSON envelope: check if `success === true`, extract `data`. If `false`, handle `code` slug.
4. Implement dynamic SEO and Head fallbacks for Articles and Services according to `02-articles.md` and `03-services.md`.
5. Map dynamic `meta_data` fields (images, text-block, bullet-list, video-youtube, link) using clean, reusable UI widgets.
6. Support submission of booking requests via `POST /inbox` with inquiry_type ("service", "general", "offer") and proper handling of `service_id`.

Start by generating the API Client and Environment Configuration, then build the main UI pages (Home, Services, Articles, Booking Form, Contact Us).
```

---

## 🌐 Template 2: Generating a Web Frontend (Next.js / Vue / Nuxt / Svelte)

```text
You are a senior frontend engineer. Your task is to build a modern, high-performance client website connected to the AuraDash Public API.

Environment Configuration Setup:
- `.env.local` (Local Dev):
  NEXT_PUBLIC_AURADASH_BASE_URL=http://localhost:8787/api/public
  NEXT_PUBLIC_AURADASH_API_KEY=<YOUR_TEST_API_KEY_auradash_ts_xxx>

- `.env.production` (Production Site):
  NEXT_PUBLIC_AURADASH_BASE_URL=https://<YOUR_WORKER_URL>.workers.dev/api/public
  NEXT_PUBLIC_AURADASH_API_KEY=<YOUR_PRODUCTION_API_KEY_auradash_pk_xxx>

Strict Architectural Requirements:
1. Include `x-api-key` in default HTTP client request headers from environment variables.
2. Follow all 11 security rules in `./docs/agent/10-security-rules.md`.
3. Implement smart dynamic SEO metadata generation on Detail pages (`/articles/[slug]` and `/services/[slug]`) using `seo_data` fields with proper fallbacks.
4. Respect `is_indexable` flag (inject `noindex, nofollow` when `is_indexable === false`).
5. Render `meta_data` dynamic custom fields dynamically.
6. Handle `429 RATE_LIMIT_EXCEEDED` rate limiting gracefully with user notification and button disabling.
7. Build responsive UI views for Home, Services Catalog, Article Blog, Threaded Comments, and Booking Modal.
```

---

## 🎨 Template 3: Quick One-Page Landing Page or Booking Widget

```text
Build a clean, high-converting one-page landing page that connects to AuraDash Public API.

Environment setup:
- API Base URL: http://localhost:8787/api/public (Dev) or https://<YOUR_WORKER_URL>.workers.dev/api/public (Prod)
- API Key: Pass via `x-api-key` header. Use Test Key for dev, Production Key for prod.

Features:
1. Fetch live Services catalog via GET /services/all.
2. Fetch global branding via GET /settings.
3. Allow visitors to book appointments via POST /inbox (handling general, service, and offer inquiry types).
4. Validate form inputs client-side before sending requests.
```
