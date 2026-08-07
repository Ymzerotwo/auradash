<p align="center">
  <img src="../docs/images/logo.png" alt="AuraDash Logo" width="100" />
</p>
<h1 align="center">AuraDash Backend</h1>

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-blue.svg)](https://www.typescriptlang.org/)
[![Hono](https://img.shields.io/badge/Hono-^4.12.15-orange.svg)](https://hono.dev/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-Ready-F6821F.svg)](https://workers.cloudflare.com/)
[![Vitest](https://img.shields.io/badge/Vitest-^4.1.8-729B1B.svg)](https://vitest.dev/)
[![Zod](https://img.shields.io/badge/Zod-^4.4.1-3068b7.svg)](https://zod.dev/)
[![Documentation](https://img.shields.io/badge/docs-auradash.ymzerotwo.com-brightgreen.svg)](https://auradash.ymzerotwo.com)
[![Watch Installation Guide on YouTube](https://img.shields.io/badge/YouTube-Watch_Video_Guide-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtube.com)

The powerful, secure, and globally distributed backend API for **AuraDash**. Built on the edge using Cloudflare Workers, Hono, and D1, providing low-latency responses, robust security, and seamless scalability.

---

## 📋 Table of Contents

- [🚀 Tech Stack](#-tech-stack)
- [📁 Architecture & Structure](#-architecture--structure)
- [🔀 Backend Edge Request Pipeline & Data Flow](#-backend-edge-request-pipeline--data-flow)
- [🛡️ Security & Middleware Pipeline](#%EF%B8%8F-security--middleware-pipeline)
- [🚨 Default Credentials Security Warning](#-default-credentials-security-warning)
- [🔌 API Routes](#-api-routes)
- [🤖 Headless & AI-Powered Custom Frontends](#-headless--ai-powered-custom-frontends)
- [🛠️ Infrastructure Configuration](#%EF%B8%8F-infrastructure-configuration)
- [💰 Operating Costs & Enterprise Infrastructure ($5/mo)](#-operating-costs--enterprise-infrastructure-5mo)
- [🚀 One-Click Edge Deployment](#-one-click-edge-deployment)
- [💻 Setup & Commands](#-setup--commands)
- [🧪 Testing](#-testing)
- [🔄 Background Jobs (Crons)](#-background-jobs-crons)
- [💼 Custom Solutions & Enterprise Setup](#-custom-solutions--enterprise-setup)
- [📄 License & Intellectual Property](#-license--intellectual-property)

---

## 🚀 Tech Stack

- **Framework**: [Hono](https://hono.dev/) (`^4.12.15`)
- **Runtime**: Cloudflare Workers (`cloudflare: ^6.3.0`, `wrangler: ^4.35.0`)
- **Language**: TypeScript (`^6.0.3`)
- **Validation**: Zod (`^4.4.1`) & `@hono/zod-validator` (`^0.7.6`)
- **Sanitization**: `sanitize-html` (`^2.17.4`)
- **Testing**: Vitest (`^4.1.8`) with `@cloudflare/vitest-pool-workers`

## 📁 Architecture & Structure

The codebase follows a modular, scalable controller-service architecture.

```text
auradash/backend/
├── src/
│   ├── index.ts              # Entry point & global pipeline
│   ├── types.ts              # Global AppContext & Bindings
│   ├── controllers/          # 24 controllers (auth, inbox, articles, etc.)
│   ├── routes/               # 25 route definitions
│   ├── services/             # 26 business logic services
│   ├── validators/           # 18 Zod validation schemas
│   ├── middleware/           # Core security & request handling
│   ├── utils/                # Crypto, caching, and response formats
│   └── db/                   # Raw SQL schemas, migrations, & init
├── tests/                    # 78 comprehensive test files (unit, integration, e2e)
├── migrations/               # 17 sequential D1 database migrations
├── wrangler.jsonc            # Cloudflare infrastructure config
├── tsconfig.json             # TypeScript configuration
└── vitest.config.ts          # Vitest testing environment
```

## 🔀 Backend Edge Request Pipeline & Data Flow

```
                     HTTP / HTTPS Request
                              │
                              ▼
        ┌──────────────────────────────────────────┐
        │ Cloudflare Edge Worker Entry (index.ts)  │
        └─────────────────────┬────────────────────┘
                              │
  ┌───────────────────────────┴───────────────────────────┐
  │ Global Middleware Chain                               │
  │                                                       │
  │  1. requestId()      ──▶ UUID tracing header          │
  │  2. secureHeaders()  ──▶ HSTS, CSP, X-Frame-Options     │
  │  3. bodyLimit()      ──▶ 2MB API / 100MB Upload       │
  │  4. Origin Validation──▶ Check against ALLOWED_ORIGINS│
  └───────────────────────────┬───────────────────────────┘
                              │
      ┌───────────────────────┼───────────────────────┐
      │                       │                       │
      ▼                       ▼                       ▼
┌──────────────┐      ┌──────────────┐      ┌─────────────────┐
│ Auth Routes  │      │ Public API   │      │ Dashboard API   │
│ (/api/auth/*)│      │ (/api/public)│      │ (/api/*)        │
├──────────────┤      ├──────────────┤      ├─────────────────┤
│ • Rate Limit │      │ • HMAC Key   │      │ • KV Session    │
│   (AUTH_LIM) │      │   Validation │      │   Validation    │
│ • CSRF Token │      │ • Rate Limit │      │ • CSRF Double-  │
│   Rotation & │      │   (PUBLIC)   │      │   Submit Check  │
│   Validation │      │ • Edge Cache │      │ • RBAC Path     │
│ • OTP Mail   │      │   (3600s)    │      │   Permission    │
└──────┬───────┘      └──────┬───────┘      └────────┬────────┘
       │                     │                       │
       └─────────────────────┼───────────────────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │ Controller & Service Layer  │
              │  • Zod Body Validation      │
              │  • sanitize-html for XSS    │
              │  • PBKDF2 Password Hashing  │
              └──────────────┬──────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Cloudflare D1 │    │ Cloudflare KV │    │ Cloudflare R2 │
│ (Serverless   │    │ (Session &    │    │ (Object CDN   │
│ SQLite DB)    │    │  Cache K1)    │    │  Storage)     │
└───────────────┘    └───────────────┘    └───────────────┘
```

## 🛡️ Security & Middleware Pipeline

The application features a strict, multi-layered security model applied globally and per-route.

### Global Pipeline (`src/index.ts`)
1. **Request ID Injection**: Injects unique `requestId()` for tracing.
2. **Secure Headers**: Enforces HSTS, CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
3. **Payload Limits**: 2MB for standard REST requests, 100MB for media/uploads.
4. **CORS/Origin Checks**: Strict Origin/Referer validation against `ALLOWED_ORIGINS`.

### Core Middlewares (`src/middleware/`)
- **`session.ts`**: Cloudflare KV-backed (`K1`) session management. Validates session expiry, active status, and includes IP + User-Agent hijacking detection.
- **`csrf.ts`**: Web Crypto hex token generation (32-byte). Enforces strict cookie/header matching using `timingSafeEqual()` for mutative requests.
- **`rateLimit.middleware.ts`**: Cloudflare Rate Limiter bindings (`c.env[limiterName]`). Uses composite keys (`IP_userId`) to prevent NAT blocking. Features fail-open policies on edge outages.
- **`apiKey.middleware.ts`**: Secures public APIs using stateless HMAC-SHA256 signatures. Domain binding via `normalizeDomain()` to restrict key usage.
- **`permission.ts`**: Granular JSON path-based RBAC evaluation. Protects against prototype pollution (`__proto__`, `constructor`) and supports `AND`/`OR` conditions.
- **`cache.middleware.ts`**: Programmatic edge caching via `caches.default`. Features entity-scoped meta-hashing (`_v`), sorted URL params, and 60s micro-caching.

### Real Crypto Utilities (`src/utils/crypto.ts`)
- **Password Hashing**: PBKDF2, SHA-256, 100,000 iterations via Web Crypto API (Optimized for Cloudflare Workers limits).
- **API Keys**: HMAC-SHA256 signed keys with `timingSafeEqual()` validation.

---

## 🚨 Default Credentials Security Warning

Upon initial database seeding (via `src/db/auth.sql`), a default System Administrator account is automatically created:

| Property | Default Value |
|---|---|
| **Username** | `admin` |
| **Email** | `admin@auradash.local` |
| **Default Password** | `AuraDash@2026` |

> 🚨 **CRITICAL SECURITY REQUIREMENT**:  
> You **MUST CHANGE THIS DEFAULT PASSWORD IMMEDIATELY** after your first login. Log into the Admin Dashboard, navigate to **Profile Settings**, and update the password to a strong, secret value. Leaving default credentials active on a public deployment exposes your entire system to unauthorized access.

---

## 🔌 API Routes

All endpoints return a standardized JSON envelope (`src/utils/response.ts`):
```json
{
  "success": true,
  "code": 200,
  "slug": "success_slug",
  "message": "Operation successful",
  "data": { ... },
  "meta": { "requestId": "uuid", "timestamp": "ISO8601" },
  "details": [],
  "debug": null
}
```

### Route Registration (`src/index.ts`)

| Route | Authentication | Rate Limiter | Permissions Required | Description |
|---|---|---|---|---|
| `GET /health` | None | `HEALTH_LIMITER` | None | System health check |
| `/api/auth/*` | CSRF | `AUTH`, `LOGIN_RECOVERY`, `VERIFY_CODE` | None | Login, logout, OTP, password recovery |
| `POST /api/public/inbox` | API Key | `PUBLIC_SUBMISSION_LIMITER` | None | Public contact form |
| `GET /api/public/*` | API Key | `PUBLIC_LIMITER` | None | Public services, articles, settings |
| `GET /files/*` | ⚠️ **[INACTIVE]** | `FILES_LIMITER` | None | Files served directly via R2 Public URL (`R2_PUBLIC_URL`) |
| `/api/profile` | Session + CSRF | `DASHBOARD_LIMITER` | None | User profile management |
| `/api/upload` | Session + CSRF | None (100MB body limit) | None | Direct R2 media upload |
| `/api/workspace` | Session + CSRF | `DASHBOARD_LIMITER` | `settings.workspace` | Workspace settings |
| `/api/services` | Session + CSRF | `DASHBOARD_LIMITER` | `cms.services` | Services CMS |
| `/api/articles` | Session + CSRF | `DASHBOARD_LIMITER` | `cms.articles` | Articles CMS |
| `/api/customers` | Session + CSRF | `DASHBOARD_LIMITER` | `customers` | Customer CRM |
| `/api/bookings` | Session + CSRF | `DASHBOARD_LIMITER` | `bookings` | Booking management |

*(Note: See `src/routes/` for the complete list of all 25 registered routers).*

---

## 🤖 Headless & AI-Powered Custom Frontends

AuraDash Backend is 100% **Headless & Framework-Agnostic**. Client applications connect exclusively to Public API endpoints (`/api/public/*`) using stateless HMAC API Key authentication (`x-api-key`).

### 📱 Supported Client Technologies
- **Mobile**: Flutter, React Native, iOS (Swift), Android (Kotlin)
- **Web**: Next.js, React, Vue.js, Svelte, Nuxt, Angular
- **Monoliths & CMS**: PHP (Laravel/WordPress), Python (Django/FastAPI), Basic HTML & Vanilla JS

### 🤖 AI-Agent Ready Integration
Feed your Public API specification files in [`../docs/agent/`](../docs/agent/README.md) directly to AI Coding Assistants (**Cursor**, **Google Antigravity**, **Claude**, **ChatGPT**, **Copilot**) to auto-generate custom client frontends or mobile apps in seconds!

> 📌 **Note**: The specifications in [`../docs/agent/`](../docs/agent/README.md) cover **Public Client Applications** (`/api/public/*`) using `x-api-key`. They are completely distinct from the internal **Admin Dashboard** system (`/api/*`).

---

## 🛠️ Infrastructure Configuration

### `wrangler.jsonc` (Cloudflare Bindings)
```jsonc
{
  "name": "auradash-backend",
  "main": "src/index.ts",
  "compatibility_date": "2026-04-28",
  "compatibility_flags": ["nodejs_compat"],
  "r2_buckets": [{ "binding": "STORAGE", "bucket_name": "auradash-storage", "remote": true }],
  "d1_databases": [{ "binding": "DB", "database_name": "auradash", "database_id": "..." }],
  "kv_namespaces": [{ "binding": "K1", "id": "...", "remote": true }],
  "send_email": [{ "name": "EMAILER", "remote": true }],
  "triggers": { "crons": ["0 3 * * *"] },
  "ratelimits": [
    { "name": "PUBLIC_LIMITER", "namespace_id": "1001", "simple": { "limit": 25, "period": 60 } },
    { "name": "AUTH_LIMITER", "namespace_id": "1002", "simple": { "limit": 3, "period": 60 } },
    { "name": "FILES_LIMITER", "namespace_id": "1010", "simple": { "limit": 200, "period": 60 } }, // [INACTIVE — R2 Public URL]
    { "name": "HEALTH_LIMITER", "namespace_id": "1011", "simple": { "limit": 30, "period": 60 } }
    // ... additional limiters configured
  ]
}
```

### Cloudflare Bindings Setup (`wrangler.jsonc`)

To bind Cloudflare D1 and KV services, create your `wrangler.jsonc` from `wrangler.jsonc.example`:

```bash
cp wrangler.jsonc.example wrangler.jsonc
```

Configure your resource IDs:
- **D1 Database**: `npx wrangler d1 create auradash` ➔ Copy the generated `database_id` to `d1_databases[0].database_id`.
- **KV Namespace**: `npx wrangler kv:namespace create K1` ➔ Copy the generated `id` to `kv_namespaces[0].id`.

### Environment Variables (`.dev.vars`)
Required variables for local development:
```env
# Cloudflare API Token for managing workers and bindings (Optional for local dev)
CLOUDFLARE_API_TOKEN="your_token_here"

# Auto-generated Master Crypto Secret used for HMAC API Key signing & cryptographic operations
AURADASH_MASTER_SECRET="your_custom_master_crypto_secret_here"

# Cloudflare Account ID (Required for email sending API requests & Workers bindings)
CF_ACCOUNT_ID="your_account_id_here"

# Public CDN URL for R2 bucket assets (e.g. https://pub-xxx.r2.dev)
R2_PUBLIC_URL="https://pub-xxxxxx.r2.dev"

# Comma-separated allowed origins for CORS & CSRF source validation
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"

# The verified email address or subdomain to send emails from
EMAIL_FROM_ADDRESS="noreply@yourdomain.com"

# Frontend app URL used in password reset links & email redirect links
APP_FRONTEND_URL="http://localhost:3000"
```

---

## 💰 Operating Costs & Enterprise Infrastructure ($5/mo)

AuraDash Backend relies on **Cloudflare Workers Paid Plan ($5/month)** to deliver high-performance enterprise capabilities at an ultra-low operational cost:

- 📧 **Cloudflare Email Routing (`EMAILER` Binding)**: Dispatches transactional emails (OTP, password resets, contact alerts) without requiring paid external email providers (SendGrid, Mailgun, Postmark).
- 🔒 **Native Edge Rate Limiting**: Hardware-accelerated rate limiters across all API routes (`AUTH`, `PUBLIC`, `DASHBOARD`, `FILES`, `HEALTH`).
- ⚡ **10 Million Edge Requests/Month**: Zero cold-start execution window across 300+ global edge locations.
- 🗄️ **Zero Egress Fee R2 Bucket**: Stream unlimited uploaded media assets with **$0 bandwidth egress costs**.
- 🚀 **30ms–50ms CPU Execution Limit**: Supports high-security PBKDF2 WebCrypto password hashing (100,000 iterations - max allowed) without CPU timeout errors.

---

Deploy the Hono API & Cloudflare D1 Database directly to Cloudflare Workers:

[![Deploy Backend to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/)

---

## 💻 Setup & Commands

The project uses `npm` (or `yarn`/`pnpm`) for script management.

| Command | Description |
|---|---|
| `npm run dev` | Starts local Wrangler dev server (`wrangler dev`) |
| `npm run deploy` | Deploys to Cloudflare edge (`wrangler deploy --minify`) |
| `npm run db:init` | Initializes database schemas (`npx tsx src/db/init_db.ts`) |
| `npm run cf-typegen` | Generates worker env types (`wrangler types --env-interface CloudflareBindings`) |

---

## 🧪 Testing

The backend includes a comprehensive 78-file test suite utilizing Vitest and Cloudflare's in-memory Miniflare bindings for D1, KV, and R2.

**Vitest Configuration (`vitest.config.ts`)**:
```typescript
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: { d1Databases: ['DB'], kvNamespaces: ['K1'], r2Buckets: ['STORAGE'] },
    }),
  ],
  test: {
    pool: '@cloudflare/vitest-pool-workers',
    coverage: { provider: 'istanbul', reporter: ['text', 'json', 'html'] },
  }
});
```

**Commands**:
- `npm run test` - Run full suite (78 files across all modules)
- `npm run test:watch` - Interactive watch mode
- `npm run test:controllers` - Run controller tests (`tests/controllers`)
- `npm run test:services` - Run service tests (`tests/services`)
- `npm run test:middleware` - Run middleware tests (`tests/middleware`)
- `npm run test:validators` - Run validator tests (`tests/validators`)
- `npm run test:utils` - Run utility tests (`tests/utils`)
- `npm run test:coverage` - Generate Istanbul coverage report

---

## 🔄 Background Jobs (Crons)

**Schedule**: `0 3 * * *` (Daily at 03:00 UTC)
- Cleans up expired OTP verification codes.
- Purges orphaned media files from R2 buckets and syncs D1 state.

---

## 💼 Custom Solutions & Enterprise Setup

Need custom backend controllers, custom Cloudflare Workers integration, or professional API deployment for your enterprise?

[🌐 Developer Website](https://ymzerotwo.com) &nbsp;|&nbsp; [📖 Project Documentation](https://auradash.ymzerotwo.com)

---

## 📄 License & Intellectual Property

AuraDash Backend is distributed under a **Source-Available & Dual-Licensing Model**.
- ✅ **Free for Client Builds**: Free for agencies & developers delivering projects to direct clients.
- 🚫 **Restricted Resale & SaaS**: Standalone reselling, white-labeling, or building SaaS platforms requires an official Commercial License.

Contact author for commercial licensing: [ymzerotwo.com](https://ymzerotwo.com)
