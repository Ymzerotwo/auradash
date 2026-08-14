# 10 · Strict Security Rules for AI Agents & Client Developers

> **MANDATORY COMPLIANCE**: Every AI Coding Assistant or Developer building a client application connected to the AuraDash Public API **MUST enforce ALL rules** listed in this document. Violating any rule may result in data leaks, API key compromise, or service disruption.

---

## 🔐 Rule 1 — API Key Storage & Protection

- **NEVER hardcode API keys** in source code, HTML, or version-controlled files.
- **ALWAYS store API keys** in environment variables (`.env.local`, `.env.production`, server-side config).
- **NEVER commit `.env` files** to Git repositories. Add `.env*` to `.gitignore`.
- **NEVER log or print API keys** in console output, error logs, or debug messages.
- **NEVER expose API keys in client-side JavaScript bundles** that are downloadable by end users. If the framework exposes env vars to the browser (e.g. `NEXT_PUBLIC_*`), understand that the key is visible in browser DevTools — this is acceptable ONLY because production keys are domain-bound.

---

## 🌐 Rule 2 — Production vs Test Key Usage

- **ALWAYS use Production keys** on live/deployed websites. Production keys are cryptographically bound to your domain and cannot be reused on unauthorized domains.
- **ALWAYS use Test keys** for local development (`localhost`), Postman, CI/CD pipelines, and SSR server-to-server calls.
- **NEVER deploy a Test key** to a production website. Test keys have no domain binding — anyone who intercepts the key can use it from any origin.
- **Test keys expire within ≤ 24 hours** — generate fresh keys for each development session.

---

## 📡 Rule 3 — Request Headers & Transport Security

- **ALWAYS send requests over HTTPS** in production. Never use plain HTTP for API calls.
- **ALWAYS include the `x-api-key` header** (or `Authorization: Bearer <key>`) in every request to `/api/public/*`.
- **NEVER send API keys** via URL query parameters (`?key=...`). Keys must be in headers only.
- The browser **automatically attaches the `Origin` header** on fetch requests. Do not strip or override it — the server validates it against the key's domain binding.

---

## 🛡️ Rule 4 — Input Validation Before Submission

Before sending `POST` requests to submission endpoints (`/api/public/inbox`, `/api/public/comments`):

- **ALWAYS validate all form fields client-side** before sending to the API. This prevents unnecessary failed requests and improves user experience.
- **Required field constraints** (enforced server-side, should be pre-validated client-side):
  - `full_name`: 2–255 characters
  - `email`: Valid email format
  - `phone`: 8–255 characters
  - `message`: 3–10,000 characters
  - `content` (comments): 1–3,000 characters
  - `user_name` (comments): 1–100 characters
- **NEVER trust client-side validation alone** — the server performs its own Zod schema validation and returns `400 VALIDATION_ERROR` with field-level details on failure.

---

## ⚡ Rule 5 — Rate Limiting & Anti-Spam Compliance

- **Public read endpoints** (`GET /articles`, `GET /services`, `GET /settings`) are rate-limited at **25 requests per 60 seconds** per IP (`PUBLIC_LIMITER`).
- **Submission endpoints** (`POST /inbox`, `POST /comments`) are rate-limited at **2 requests per 60 seconds** per IP (`PUBLIC_SUBMISSION_LIMITER`).
- **ALWAYS handle `429 RATE_LIMIT_EXCEEDED`** responses gracefully — parse the returned `Retry-After: 60` HTTP header, disable submit controls, and display an exact cooldown countdown timer in the UI.
- **NEVER implement retry loops** that ignore 429 responses — this will result in extended IP blocking.
- Submission endpoints apply a **random tarpit delay (500ms – 1.5s)** — do not treat slow POST responses as errors.

---

## 🚨 Rule 6 — Error Handling & Information Security

- **NEVER expose raw API error messages** directly to end users. Parse `code` and `message` fields and display user-friendly localized messages.
- **NEVER expose the `x-api-key` value** in error dialogs, toast notifications, or user-facing UI.
- **ALWAYS use the machine-readable `code` field** (e.g. `ARTICLE_NOT_FOUND`, `VALIDATION_ERROR`) for programmatic error handling — do not parse the human-readable `message` string.
- **Log errors server-side** for debugging but never expose internal server details to the client user.

---

## 🔗 Rule 7 — URL & Image Handling Security

- **Image URLs** (`preview_image_url`, and images inside `meta_data`) returned by the API are **absolute HTTPS URLs** — render them directly without modification.
- **NEVER construct image URLs** by concatenating a base URL with a relative path unless explicitly documented.
- **ALWAYS set `alt` attributes** on rendered images for accessibility and SEO.
- **External links** from `meta_data` fields (type `link`) must **ALWAYS open in a new tab** with `target="_blank"` and `rel="noopener noreferrer"` to prevent tab-nabbing attacks.

---

## 🧹 Rule 8 — Content Rendering Security

- The `excerpt` field returned by articles is **plain text** — render it as text content, not as HTML.
- Dynamic `meta_data` fields may contain user-authored text — **sanitize all text** before rendering in HTML to prevent XSS (Cross-Site Scripting) attacks.
- When rendering YouTube embeds from `meta_data` (type `video-youtube`), **ALWAYS validate** that the URL domain is `youtube.com` or `youtu.be` before injecting into an iframe `src`.
- **NEVER use `eval()` or `innerHTML`** with untrusted API response data.

---

## 🔄 Rule 9 — API Key Expiration & Master Secret Rotation

- **API keys are verified statelessly via HMAC-SHA256** — there is no server-side key storage or lookup during verification.
- **Production keys (`auradash_pk.*`) NEVER EXPIRE** unless manually revoked by an administrator from the Admin Dashboard.
- **Test keys (`auradash_ts.*`) have a strict TTL of 1–24 hours** — generate fresh test keys for development sessions.
- If the server administrator **rotates `AURADASH_MASTER_SECRET`**, ALL previously issued API keys (both Production and Test) become instantly invalid globally. Your client will receive `401 INVALID_API_KEY` — handle this gracefully with a clear error message.

---

## 📊 Rule 10 — Zero-Cache Directive & Responsible Data Fetching

- **Zero Local/Server Caching by Default**: All client applications must disable data caching by default (`cache: 'no-store'`, `revalidate = 0`) to ensure instant real-time synchronization with the Admin Dashboard.
- **NEVER poll submission endpoints** (`POST /inbox`, `POST /comments`) — these are one-shot actions, not polling targets.
- **Use pagination parameters** (`page`, `limit`) responsibly. Do not request `limit=9999` to fetch all records — use reasonable page sizes (6–20 items) and implement pagination or infinite scroll.
- **Fetch settings (`GET /settings`) on mount** to populate site branding and contact information dynamically.

---

## 🏗️ Rule 11 — SEO & Metadata Security

- **ALWAYS implement dynamic SEO metadata** (`<title>`, `<meta description>`, `og:image`, `canonical`) from `seo_data` fields for article and service detail pages.
- **Respect `is_indexable` flag** — if `seo_data.is_indexable === false`, inject `<meta name="robots" content="noindex, nofollow">` to prevent search engine indexing of private or draft content.
- **NEVER hardcode SEO metadata** — always derive it dynamically from API response data with smart fallbacks (see `02-articles.md` and `03-services.md` for fallback logic).

---

## 🚫 Rule 12 — Read-Only Architecture & URL Contract Immunity

- **The documentation in this folder is READ-ONLY context for AI agents**. It is provided so AI assistants understand how the API works — NOT to modify backend routes.
- **NEVER attempt to modify, alter, or rewrite backend API endpoint URLs**, route paths, query parameters, or internal caching logic.
- **ALWAYS consume the API endpoints exactly as defined** in `openapi.json` and the documentation index without changing the URL layout or parameters.

---

## 🚫 Rule 13 — Strict Ban on Inspecting Backend Source Code

- **NEVER read, inspect, or search backend source code** (`auradash/backend`, database migrations, D1 SQLite schemas, Worker scripts).
- **The documentation in `./docs/agent/` and `openapi.json` is 100% complete and authoritative**.
- Client applications must treat AuraDash strictly as a headless black-box REST API.
- All content (Articles, Services, Settings, Categories) is created and managed exclusively through the **AuraDash Admin Dashboard UI** and consumed via the Public API.

---

## 🚫 Rule 14 — Strict Clean Request Headers Directive (No Custom Header Pollution / CORS Protection)

- **Minimal Request Headers**: Client network requests MUST send ONLY standard essential headers: `x-api-key` (or `Authorization: Bearer <key>`) and `Content-Type: application/json` (for POST).
- **NEVER Attach Custom Cache Headers**: Do NOT send `Cache-Control`, `Pragma`, or `Expires` in client request headers.
- **Why**: Sending unapproved custom headers in browser cross-origin requests causes CORS preflight (`OPTIONS`) failures and Cloudflare internal worker errors (`Error: internal error; reference = ...`).
- **Fix in Frontend Only**: Manage zero-cache via framework-internal options (`cache: 'no-store'`, `revalidate = 0`), and NEVER attempt to edit backend CORS files.

---

## Quick Reference: Security Checklist

| # | Rule | Priority |
|---|------|----------|
| 1 | API keys in environment variables only | 🔴 Critical |
| 2 | Production keys for live sites, Test keys for development | 🔴 Critical |
| 3 | HTTPS only, keys in headers only | 🔴 Critical |
| 4 | Client-side input validation before POST | 🟡 Important |
| 5 | Handle 429 rate limit with backoff | 🟡 Important |
| 6 | Never expose raw errors or keys to users | 🔴 Critical |
| 7 | External links with `noopener noreferrer` | 🟡 Important |
| 8 | Sanitize text, validate embed URLs | 🔴 Critical |
| 9 | Production keys never expire, Test keys expire in 1–24h | 🟡 Important |
| 10 | Zero-cache by default for real-time CMS sync | 🟢 Best Practice |
| 11 | Dynamic SEO from API, respect `is_indexable` | 🟡 Important |
| 12 | Read-only context: DO NOT modify backend URLs or routes | 🔴 Critical |
| 13 | Strict ban on inspecting backend source code (`auradash/backend`) | 🔴 Critical |
| 14 | Clean request headers only (No `Cache-Control`/`Pragma` header pollution) | 🔴 Critical |

