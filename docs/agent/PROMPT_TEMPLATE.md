# PROMPT TEMPLATES · Universal AI Client Generation Master Guide

> **HOW TO USE THIS FILE**:  
> Choose the specific framework prompt below that matches your project stack (**Next.js**, **React + Vite**, **Nuxt / Vue**, **Flutter**, **SwiftUI**, **Kotlin / Jetpack Compose**, or **Vanilla HTML/JS**).  
> Copy and paste the prompt into your AI Coding Assistant (**Google Antigravity**, **Cursor**, **Claude 3.5 Sonnet**, **ChatGPT-4o**, **GitHub Copilot**) to generate a modern, high-performance client application connected to your **AuraDash Headless CMS Public API** using the **latest stable framework versions**.

---

## ⚙️ Universal Environment Configuration Reference

Before running any prompt, ensure your environment variables are configured for your active stage:

### 🟡 Local Development & Testing (`localhost` / Emulators)
- **API Base URL**: `http://localhost:8787/api/public` (Android Emulator: `http://10.0.2.2:8787/api/public`)
- **Key Type**: **Test Key** (`auradash_ts.*`) — Generated from *Admin Dashboard → Settings → API Keys → New API Key (Type: Test)*. Format: `auradash_ts.<base64Payload>.<base64Signature>`. Bypasses domain validation, expires in ≤ 24h. Ideal for local dev, emulators, and CI.

### 🔵 Live Production Environment
- **API Base URL**: `https://api.yourdomain.com/api/public`
- **Key Type**: **Production Key** (`auradash_pk.*`) — Generated from *Admin Dashboard → Settings → API Keys → New API Key (Type: Production)*. Format: `auradash_pk.<base64Payload>.<base64Signature>`. Bound to your registered domain (e.g. `example.com`).

> [!CAUTION]
> ### 🚨 STRICT RULE: NEVER MODIFY OR REFORMAT API KEY STRINGS
> - **DO NOT REPLACE DOTS (`.`) WITH UNDERSCORES (`_`)**
> - The backend verification engine strictly splits by dot `apiKey.split('.')` into exactly 3 parts (`prefix.payload.signature`).
> - Always copy and paste the raw, complete key string directly into your environment file (`.env.local` / `.env.production`).

---

## 🧭 The 7 Golden Universal Directives for AI Assistants

Every AI model building an AuraDash client **MUST** adhere to these 7 non-negotiable rules:

1. **🔌 Connect Real Live API First (Zero Mocking Laziness)**: Wire up the HTTP client and connect real API endpoints (`GET /settings`, `GET /services`, `GET /articles`, `POST /inbox`) to components on Day 1. Static mock arrays and fallback objects are strictly for emergency offline resilience.
2. **📖 Read Documentation First**: Thoroughly read all files in `./docs/agent/` and `./docs/agent/openapi.json` before generating code.
3. **🧹 Clean Request Headers Only (No Custom Cache Header Pollution)**:
   - Request headers must contain **ONLY** `x-api-key: <KEY>` (or `Authorization: Bearer <KEY>`) and `Content-Type: application/json`.
   - 🚫 **NEVER send `Cache-Control`, `Pragma`, or `Expires`** in client outgoing requests (prevents browser CORS preflight `OPTIONS` failure).
   - Zero-cache must be enforced at framework runtime (`cache: 'no-store'`, `next: { revalidate: 0 }`, `staleTime: 0`).
4. **💰 Enforce the Financial Contract (`MISSING_FINANCIAL_CONTRACT`)**: Services passed to `POST /inbox` (or linked from articles) must have `Name` and numeric `Price` in `meta_data`.
5. **🏛️ Render the 3 Pillars of Articles**:
   - **Column Identity**: Title, Slug, Cover Image (`preview_image_url`), Excerpt, Reading Time (`reading_time_minutes`), Author, Category.
   - **Modular Content Blocks**: Dynamically render `meta_data` arrays (`text-description`, `list`, `photo`, `video-youtube`, `link`, `text-info`).
   - **SEO Metadata**: Dynamically map `seo_data` (`meta_title`, `meta_description`, `og_image`, `is_indexable`).
6. **🛡️ Graceful Error & Rate Limit Handling**: Parse response envelopes (`{ success, data, error }`). Intercept `429 RATE_LIMIT_EXCEEDED` with user toast notices and cooldown state.
7. **🎨 Stunning, Wow-Factor UI Aesthetics**: Modern typography (Inter, Outfit, Plus Jakarta Sans), sleek dark/light mode tokens, smooth transitions, responsive layouts, and zero generic placeholders.

---

## 🚀 Framework-Specific AI Master Prompts (Latest Versions)

---

### ⚛️ 1. Next.js (Latest Version — App Router, Server Components & React Query)

```text
You are a senior Next.js fullstack engineer. Your task is to build a high-performance, SEO-optimized client website using the latest stable version of Next.js (App Router), React (Latest), and Tailwind CSS connected to the AuraDash Headless CMS Public API.

MANDATORY STEP 0 — Connect Real Live API First:
You MUST initialize the network client and connect all live endpoints (GET /settings, GET /services, GET /articles, POST /inbox) to components from the very first step. Do NOT write static mock placeholders instead of real API calls. Fallback data is strictly for offline resilience when the backend is unreachable.

MANDATORY STEP 1 — Read Documentation First:
Before writing code, read all files in `./docs/agent/` and `./docs/agent/openapi.json` to master the API response format ({ success, data, error }), dynamic meta_data schemas, and security rules.

MANDATORY STEP 2 — Clean Request Headers & Zero-Cache:
- Client fetch requests must send ONLY `x-api-key` and `Content-Type: application/json`.
- NEVER send custom cache headers (`Cache-Control`, `Pragma`) in request headers (causes browser CORS preflight rejections).
- Enforce real-time CMS zero-cache via Next.js native options: `fetch(url, { cache: 'no-store', next: { revalidate: 0 } })` and React Query `staleTime: 0`.
- IMPORTANT: API keys have 3 dot-separated parts (auradash_pk.xxx.yyy or auradash_ts.xxx.yyy). NEVER replace dots with underscores.

Environment Setup:
- `.env.local` (Local Dev):
  NEXT_PUBLIC_AURADASH_BASE_URL=http://localhost:8787/api/public
  NEXT_PUBLIC_AURADASH_API_KEY=<YOUR_TEST_API_KEY_auradash_ts.xxx.yyy>
- `.env.production` (Production):
  NEXT_PUBLIC_AURADASH_BASE_URL=https://api.yourdomain.com/api/public
  NEXT_PUBLIC_AURADASH_API_KEY=<YOUR_PRODUCTION_API_KEY_auradash_pk.xxx.yyy>

Architectural Requirements:
1. Universal API Client: Create a type-safe API client in `lib/api.ts` wrapping fetch with `x-api-key` header and standard error envelope extraction.
2. Dynamic Branding & Settings: Fetch global branding (`GET /settings`) in the root `layout.tsx` to dynamically power the Header, Logo, Navigation, Footer, Social Links, and Working Hours.
3. Services Catalog (`/services` & `/services/[slug]`):
   - Render service categories and standalone services with `sort_order` priority.
   - On Service Detail page, dynamically map custom `meta_data` blocks (photo galleries, YouTube embeds, feature lists, pricing/duration pills).
   - Ensure Financial Contract compliance (`Name` and numeric `Price` mapped from `meta_data`).
4. Articles & Knowledge Hub (`/articles` & `/articles/[slug]`):
   - Render all 3 Pillars of Articles: Cover image (`preview_image_url`), reading time badge, author tag, published date.
   - Dynamic Block Renderer: Render `meta_data` blocks (`text-description`, `list`, `photo`, `video-youtube`, `link`).
   - Threaded Comments System: Fetch comments via `GET /articles/[id]/comments` and submit via `POST /articles/[id]/comments`.
   - Dynamic Next.js Metadata: Implement `generateMetadata()` using `seo_data` (`meta_title`, `meta_description`, `og_image`, `is_indexable`).
5. Direct Booking & Contact Drawer (`POST /inbox`):
   - Build a high-converting Booking Modal / Drawer supporting `inquiry_type: "service" | "general" | "offer"` with `service_id`.
   - Handle rate limiting (`429 RATE_LIMIT_EXCEEDED`) and validation errors gracefully.

Start by proposing the visual UI design system and page structure with me, then generate the API client, layout, and pages.
```

---

### ⚡ 2. React + Vite (Latest Version — SPA with TanStack Query & Tailwind CSS)

```text
You are a lead Frontend React engineer. Your task is to build a sleek, ultra-responsive Single Page Application (SPA) using the latest version of React, Vite (Latest), TanStack Query (React Query Latest), and Tailwind CSS connected to the AuraDash Public API.

MANDATORY STEP 0 — Connect Real Live API First:
Initialize Axios/Fetch client and connect real API queries (GET /settings, GET /services, GET /articles, POST /inbox) immediately. Do NOT build mock-only UIs.

MANDATORY STEP 1 — Read Documentation First:
Read `./docs/agent/` and `./docs/agent/openapi.json` to understand API envelopes, meta_data custom fields, and error codes.

MANDATORY STEP 2 — Clean Request Headers & TanStack Query Zero-Cache:
- Send clean headers: `x-api-key: import.meta.env.VITE_AURADASH_API_KEY` and `Content-Type: application/json`.
- Do NOT inject custom `Cache-Control` or `Pragma` headers in Axios/Fetch.
- Configure QueryClient with `{ defaultOptions: { queries: { staleTime: 0, gcTime: 0, refetchOnWindowFocus: true } } }` for real-time CMS sync.
- IMPORTANT: API keys have 3 dot-separated parts (auradash_pk.xxx.yyy or auradash_ts.xxx.yyy). NEVER replace dots with underscores.

Environment Variables (`.env`):
- `VITE_AURADASH_BASE_URL=http://localhost:8787/api/public`
- `VITE_AURADASH_API_KEY=<YOUR_TEST_API_KEY_auradash_ts.xxx.yyy>`

Core Features to Implement:
1. API Service Layer: Create modular services (`settings.service.ts`, `services.service.ts`, `articles.service.ts`, `inbox.service.ts`).
2. Global State & Layout: Dynamically populate Navbar, Footer, and Contact details from `GET /settings`.
3. Services Grid & Detail Modal: Render service cards with price pills, duration tags, and dynamic `meta_data` block viewer.
4. Blog & Article Reader: Full article view with cover image, reading time, author, modular content blocks, and interactive comment submission.
5. Interactive Booking Modal: Direct appointment booking connected to `POST /inbox` with client-side form validation and loading spinners.
6. Rate Limit Protection: Gracefully handle `429 RATE_LIMIT_EXCEEDED` with toast notifications.

Let's begin by outlining the UI component tree and aesthetic design tokens.
```

---

### 💚 3. Vue / Nuxt (Latest Version — Composition API / Pinia / useFetch)

```text
You are a senior Nuxt / Vue engineer. Your task is to build an elegant, ultra-fast client website using the latest stable version of Nuxt, Vue (Latest Composition API `<script setup>`), Pinia, and Tailwind CSS powered by the AuraDash Public API.

MANDATORY STEP 0 — Connect Real Live API First:
Set up `$fetch` / `useFetch` composables and wire live endpoints (GET /settings, GET /services, GET /articles, POST /inbox) on Day 1. Never substitute live API calls with static mock arrays.

MANDATORY STEP 1 — Read Documentation First:
Read all specifications in `./docs/agent/` and `./docs/agent/openapi.json`.

MANDATORY STEP 2 — Clean Headers & Zero-Cache in Nuxt:
- Configure Nuxt runtimeConfig for `auradashBaseUrl` and `auradashApiKey`.
- Send ONLY `x-api-key` in default request headers. No `Cache-Control` header injection.
- Enforce real-time data sync with `useFetch(url, { cache: 'no-cache', initialCache: false })`.
- IMPORTANT: API keys have 3 dot-separated parts (auradash_pk.xxx.yyy or auradash_ts.xxx.yyy). NEVER replace dots with underscores.

Configuration (`nuxt.config.ts`):
```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      auradashBaseUrl: process.env.NUXT_PUBLIC_AURADASH_BASE_URL || 'http://localhost:8787/api/public',
      auradashApiKey: process.env.NUXT_PUBLIC_AURADASH_API_KEY || ''
    }
  }
})
```

Requirements:
1. Composables: Build `useAuraApi()`, `useAuraSettings()`, `useAuraServices()`, `useAuraArticles()`.
2. Dynamic Head / SEO: Use `useSeoMeta()` and `useHead()` on `/articles/[slug]` and `/services/[slug]` mapping `seo_data` fields with fallbacks. Respect `is_indexable` flag.
3. Modular Block Component: Build `<DynamicMetaBlock :blocks="item.meta_data" />` rendering text, lists, photos, YouTube embeds, and links.
4. Booking Modal: Reactive booking drawer submitting to `POST /inbox` with status feedback.
5. Error Handling: Intercept non-200 responses and handle `MISSING_FINANCIAL_CONTRACT` and `RATE_LIMIT_EXCEEDED`.

Start by proposing the layout hierarchy and component architecture with me.
```

---

### 💙 4. Flutter (Latest Version — Cross-Platform Mobile App)

```text
You are a staff Mobile Flutter engineer. Your task is to build a high-end, responsive iOS & Android mobile application using the latest stable version of Flutter, Dart (Latest), Clean Architecture, and Riverpod (or BLoC) connected to the AuraDash Public API.

MANDATORY STEP 0 — Connect Real Live API First:
Set up Dio / Http client with live endpoints (GET /settings, GET /services, GET /articles, POST /inbox) immediately. Do NOT build mock-only screens.

MANDATORY STEP 1 — Read Documentation First:
Read `./docs/agent/` and `./docs/agent/openapi.json` to master data models, JSON envelopes, and error codes.

MANDATORY STEP 2 — Clean Request Headers & Base URL Handling:
- Send `x-api-key: <KEY>` and `Content-Type: application/json` in Dio BaseOptions.
- IMPORTANT: API keys have 3 dot-separated parts (auradash_pk.xxx.yyy or auradash_ts.xxx.yyy). NEVER replace dots with underscores.
- Local Android Emulator Base URL: `http://10.0.2.2:8787/api/public`
- iOS Simulator Base URL: `http://localhost:8787/api/public`
- Production Base URL: `https://api.yourdomain.com/api/public`

Architectural Layers:
1. Data Layer:
   - Models: `SettingsModel`, `ServiceModel`, `ArticleModel`, `CommentModel`, `MetaDataBlockModel`, `SeoDataModel`.
   - Safe JSON Parsing: Safely parse `meta_data` arrays and `seo_data` maps with null safety.
2. Domain & Repositories:
   - `SettingsRepository`, `ServicesRepository`, `ArticlesRepository`, `InboxRepository`.
3. Presentation & UI Widgets:
   - `DynamicMetaRenderer`: Flutter widget rendering `text-info` chips, `text-description` paragraphs, `list` bullet points, `photo` cached network images, `video-youtube` launcher/player, and `link` buttons.
   - Services Catalog Screen with Category filtering tabs and priority sorting.
   - Article Reader Screen with cover image parallax, author badge, reading time, and nested comments list.
   - Fast Booking Bottom Sheet with phone/email validation submitting to `POST /inbox`.
4. Error Handling:
   - Handle network connectivity errors, API Error envelopes (`code` & `message`), and rate limiting.

Let's start by defining the app theme, state management setup, and screen navigation flow.
```

---

### 🍎 5. Swift / SwiftUI (Latest Version — Native iOS App)

```text
You are a senior iOS Engineer specializing in the latest versions of Swift, SwiftUI, Swift Concurrency (async/await), and MVVM architecture. Your task is to build a native iOS application connected to the AuraDash Public API.

MANDATORY STEP 0 — Connect Real Live API First:
Create `AuraDashClient` using `URLSession` and connect live endpoints (GET /settings, GET /services, GET /articles, POST /inbox) from the start.

MANDATORY STEP 1 — Read Documentation First:
Read all specifications in `./docs/agent/` and `./docs/agent/openapi.json`.

MANDATORY STEP 2 — Clean Request Headers & URLSession Config:
- Add `x-api-key` and `Content-Type: application/json` to `URLRequest`.
- Use `.ephemeral` or `.default` with `requestCachePolicy = .reloadIgnoringLocalCacheData` for live CMS synchronization.
- IMPORTANT: API keys have 3 dot-separated parts (auradash_pk.xxx.yyy or auradash_ts.xxx.yyy). NEVER replace dots with underscores.
- Base URL: `http://localhost:8787/api/public` (Dev Simulator) / `https://api.yourdomain.com/api/public` (Prod).

iOS Architecture:
1. Network Layer (`AuraDashAPIClient`):
   - Generic request method decoding standard response envelope: `struct ApiResponse<T: Decodable>: Decodable { let success: Bool; let data: T?; let code: String?; let message: String? }`.
2. ViewModels (`@Observable` or `ObservableObject`):
   - `ServicesViewModel`, `ArticlesViewModel`, `SettingsViewModel`, `BookingViewModel`.
3. SwiftUI Views:
   - `DynamicMetaDataView`: Dynamic view mapping `meta_data` blocks (AsyncImage, Text, BulletList, YouTube Link/SafariView).
   - `ServicesListView` with Category segmented picker and detailed sheet.
   - `ArticleDetailView` with high-resolution hero cover, reading time badge, and threaded comments.
   - `BookingSheet`: Native iOS form with validation submitting to `POST /inbox`.

Let's begin by establishing the Models and API Client.
```

---

### 🤖 6. Kotlin / Jetpack Compose (Latest Version — Native Android App)

```text
You are a senior Android Engineer specializing in the latest Kotlin, Jetpack Compose, Coroutines, StateFlow, and Clean Architecture (MVVM). Your task is to build a native Android app connected to the AuraDash Public API.

MANDATORY STEP 0 — Connect Real Live API First:
Set up Retrofit / Ktor client with live endpoints (GET /settings, GET /services, GET /articles, POST /inbox) on Day 1.

MANDATORY STEP 1 — Read Documentation First:
Read `./docs/agent/` and `./docs/agent/openapi.json`.

MANDATORY STEP 2 — Clean Request Headers & Network Config:
- OkHttpClient Interceptor adding `x-api-key` and `Content-Type: application/json`.
- IMPORTANT: API keys have 3 dot-separated parts (auradash_pk.xxx.yyy or auradash_ts.xxx.yyy). NEVER replace dots with underscores.
- Android Emulator Dev URL: `http://10.0.2.2:8787/api/public`
- Physical Device Dev URL: `http://<YOUR_LOCAL_IP>:8787/api/public`
- Production URL: `https://api.yourdomain.com/api/public`

Android Stack:
1. Data Layer:
   - Retrofit 2 + KotlinX Serialization / Moshi.
   - DTOs for `SettingsDto`, `ServiceDto`, `ArticleDto`, `CommentDto`, `ApiResponse<T>`.
2. Domain & Repository:
   - `AuraDashRepository` with Kotlin `Flow<Resource<T>>`.
3. Jetpack Compose UI:
   - `DynamicMetaDataContent`: Compose renderer for text blocks, bullet lists, Coil AsyncImage photos, and action links.
   - `ServicesScreen` with LazyColumn, Category Filter Chips, and Service Cards.
   - `ArticleScreen` with TopAppBar, Hero Image, reading time chip, and Comment Thread.
   - `BookingModalBottomSheet` for appointment inquiries via `POST /inbox`.
4. Material 3 Theming:
   - Dynamic colors, Dark/Light mode support, and smooth elevation animations.

Let's begin by defining the Retrofit API Interface and Repository.
```

---

### 🌐 7. Vanilla HTML5 + Modern JavaScript + Tailwind (Ultra-Light Landing Page)

```text
You are an expert web developer. Build a blazing-fast, ultra-lightweight single-page landing page using modern semantic HTML5, Vanilla JavaScript (ESNext), and Tailwind CSS (via CDN or CLI) connected to the AuraDash Public API.

MANDATORY STEP 0 — Connect Real Live API First:
Fetch live data immediately (`GET /settings`, `GET /services/all`, `GET /articles`, `POST /inbox`) inside `app.js` on `DOMContentLoaded`.

MANDATORY STEP 1 — Read Documentation First:
Read `./docs/agent/README.md`, `03-services.md`, `04-inbox.md`, `09-field-schemas.md`, and `openapi.json`.

MANDATORY STEP 2 — Clean Request Headers:
- Send clean headers: `headers: { 'x-api-key': CONFIG.API_KEY, 'Content-Type': 'application/json' }`.
- Do NOT add custom cache headers. Use standard browser fetch.
- IMPORTANT: API keys have 3 dot-separated parts (auradash_pk.xxx.yyy or auradash_ts.xxx.yyy). NEVER replace dots with underscores.

Environment Configuration (`config.js`):
```javascript
const CONFIG = {
  BASE_URL: 'http://localhost:8787/api/public', // or https://api.yourdomain.com/api/public
  API_KEY: '<YOUR_TEST_OR_PROD_API_KEY_auradash_ts_or_pk.xxx.yyy>'
};
```

Features to Build:
1. Dynamic Hero & Branding: Inject clinic/business name, phone, working hours, and social links from `GET /settings`.
2. Services Showcase: Render responsive service cards with pricing and duration badges from `meta_data`.
3. Articles Carousel / Grid: Render latest 3 articles with cover images, reading time, and excerpts.
4. Seamless Booking Modal: Interactive appointment booking form sending `POST /inbox` with live validation and success alert.
5. Mobile Responsive Menu & Fast Navigation.

Generate the clean `index.html`, `app.js`, and `styles.css`.
```
