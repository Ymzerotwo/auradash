<p align="center">
  <img src="../docs/images/logo.png" alt="AuraDash Logo" width="100" />
</p>
<h1 align="center">AuraDash Frontend</h1>

![Next.js](https://img.shields.io/badge/Next.js-15.5.23-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.0.0-blue?style=for-the-badge&logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)

<br/><br/>

[![Watch Installation Guide on YouTube](https://img.shields.io/badge/YouTube-Watch_Video_Guide-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/@Ym_zerotwo)

AuraDash Frontend is a modern, responsive, and highly customizable admin dashboard application. Built with Next.js 15 App Router, React 19, and Tailwind CSS v4, it provides a robust foundation for managing resources, handling complex forms, and presenting data beautifully.

**Documentation**: [auradash.ymzerotwo.com](https://auradash.ymzerotwo.com)
**Version**: `0.1.0` (Private)

<br/>

![AuraDash Enterprise Dashboard Preview](../docs/images/dashboard-preview.png)

---

## 📋 Table of Contents

- [🚀 Tech Stack](#-tech-stack)
- [📦 Getting Started](#-getting-started)
- [🚀 One-Click Deployment](#-one-click-deployment)
- [🏗️ Project Structure](#%EF%B8%8F-project-structure)
- [🔀 Frontend Data Flow & State Lifecycle](#-frontend-data-flow--state-lifecycle)
- [🧠 Core Architecture Patterns](#-core-architecture-patterns)
- [📄 Key Configurations](#-key-configurations)
- [💼 Custom Solutions & Enterprise Setup](#-custom-solutions--enterprise-setup)
- [📄 License & Intellectual Property](#-license--intellectual-property)

---

## 🚀 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) `15.5.23` (App Router)
- **UI Library**: [React](https://react.dev/) `19.0.0`
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) `^4` & [Tailwind Merge](https://github.com/dcastil/tailwind-merge) `^3.5.0`
- **Components**: [Shadcn UI](https://ui.shadcn.com/) `^4.5.0` (`base-nova` style) & [@base-ui/react](https://base-ui.com/) `^1.4.1`
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) `^5.0.12`
- **Data Fetching**: [TanStack React Query](https://tanstack.com/query/latest) `^5.100.8`
- **Form Validation**: [Zod](https://zod.dev/) `^4.4.1`
- **Icons**: [Lucide React](https://lucide.dev/) `^1.11.0` & [React Icons](https://react-icons.github.io/react-icons/) `^5.6.0`
- **Animations**: `tw-animate-css` `^1.4.0` & View Transitions API

## 📦 Getting Started

### Prerequisites
- Node.js `^20`

### Installation & Execution

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Build for production
npm run build

# Start the production server
npm run start
```

> 🚨 **SECURITY WARNING — DEFAULT CREDENTIALS**:  
> Upon initial database setup, a default admin account is seeded:  
> • **Username**: `admin` &nbsp;|&nbsp; • **Default Password**: `AuraDash@2026`  
> You **MUST CHANGE THIS PASSWORD IMMEDIATELY** after your first login via **Profile Settings** to secure your dashboard.

### Available Scripts
- `npm run dev`: Starts the Next.js development server (`next dev`)
- `npm run build`: Builds the application for production using webpack (`next build --webpack`)
- `npm run start`: Starts the Next.js production server (`next start`)
- `npm run lint`: Runs ESLint to check for code issues (`eslint`)

## 🚀 One-Click Deployment

Deploy the Next.js frontend instantly on Vercel or Cloudflare Pages:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
&nbsp;&nbsp;
[![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deploy_to-Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://dash.cloudflare.com/)

## 🏗️ Project Structure

The project follows a feature-driven Next.js App Router structure:

```text
auradash/frontend/
├── app/                  # Next.js App Router pages, layouts, and route groups
│   ├── articles/         # Article management feature
│   ├── bookings/         # Bookings feature
│   ├── customers/        # Customer management
│   ├── services/         # Services catalog
│   ├── settings/         # System and workspace settings
│   └── components/       # App-specific wrapper components (Providers, Toggles)
├── components/           # Reusable UI and Layout components
│   ├── layout/           # DashboardLayout, Sidebar, Topbar, PermissionGuard
│   └── ui/               # Shadcn UI base components
├── lang/                 # i18n dictionary files (ar, en)
├── lib/                  # Core application logic and utilities
│   ├── api/              # API client and response handling
│   ├── hooks/            # Custom React hooks (React Query integrations)
│   ├── i18n/             # Language context and dictionary loaders
│   ├── providers/        # Global context providers (React Query)
│   ├── services/         # API abstraction layer
│   ├── stores/           # Zustand state stores
│   ├── utils/            # Helper functions
│   └── validations/      # Zod schemas for forms and API validation
├── middleware.ts         # Next.js Edge Middleware for routing & auth
├── next.config.mjs       # Next.js configuration
├── components.json       # Shadcn UI configuration
└── package.json          # Dependencies and scripts
```

## 🔀 Frontend Data Flow & State Lifecycle

```
                               ┌──────────────────────────┐
                               │   Server HTML Request    │
                               └────────────┬─────────────┘
                                            │
                                  Reads Cookies on SSR:
                                  • NEXT_LOCALE (ar/en)
                                  • NEXT_SIDEBAR_COLLAPSED
                                            │
                               ┌────────────▼─────────────┐
                               │     app/layout.tsx       │
                               │  (Server Component)      │
                               └────────────┬─────────────┘
                                            │ Loads Dictionary JSON (ar/en)
                                            │ Sets dir="rtl" or "ltr"
                                            │ Injects Fonts (Cairo, Inter)
                                            │
┌───────────────────────────────────────────▼───────────────────────────────────────────┐
│ Provider Cascade                                                                      │
│                                                                                       │
│ QueryProvider (React Query v5)                                                        │
│ └── LanguageProvider (Dictionary context)                                             │
│     └── ThemeProvider (Dark/Light CSS vars)                                           │
│         └── LayoutProvider (Sidebar collapsed state)                                  │
│             └── TooltipProvider + Sonner Toaster                                      │
│                 └── Page Content ({children})                                         │
└───────────────────────────────────────────┬───────────────────────────────────────────┘
                                            │
                               ┌────────────▼─────────────┐
                               │   Dashboard Layout       │
                               │   PermissionGuard Check  │
                               └────────────┬─────────────┘
                                            │
                 ┌──────────────────────────┼──────────────────────────┐
                 │                          │                          │
                 ▼                          ▼                          ▼
       ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
       │   Zustand Store  │       │ React Query Hook │       │    API Client    │
       │   (Client State) │       │  (Server State)  │       │ (lib/api/client) │
       ├──────────────────┤       ├──────────────────┤       ├──────────────────┤
       │ • auth.store     │       │ • useBookings()  │       │ • Base URL       │
       │ • app.store      │       │ • useCustomers() │       │ • CSRF token     │
       │ • state.store    │       │ • useArticles()  │       │   auto-injection │
       └──────────────────┘       └─────────┬────────┘       │ • 401 Expiry     │
                                            │                │   auto-redirect  │
                                            │                │ • Localized error│
                                            ▼                │   translation    │
                                  ┌──────────────────┐       └──────────────────┘
                                  │ Hono API Backend │
                                  │  (localhost:8787)│
                                  └──────────────────┘
```

## 🧠 Core Architecture Patterns

### Routing & Middleware Security
The application uses Next.js Middleware (`middleware.ts`) to intercept requests and enforce authentication at the edge. 
- Protects all routes except `['/login', '/forgot-password', '/banned']`.
- Redirects unauthenticated users to `/login`.
- Redirects authenticated users away from public routes.

### API Client (`lib/api/client.ts`)
A robust, centralized fetch wrapper designed for security and reliability:
- **Base URL**: Targets `http://localhost:8787/api` (or `NEXT_PUBLIC_API_URL`).
- **CSRF Protection**: Automatically handles `x-csrf-token` injection on mutating requests (POST, PUT, DELETE, PATCH). Gracefully handles `403 CSRF_TOKEN_MISMATCH` by transparently re-fetching the token and retrying the request.
- **Error Handling**: Custom `ApiError` class processes structured backend validation errors mapping to Zod and localized dictionary messages.
- **Session Management**: Automatically redirects on `401 SESSION_EXPIRED` or `403 ACCOUNT_BANNED`.

### Authentication & Authorization (`lib/stores/auth.store.ts`)
Role-based access control (RBAC) managed via Zustand:
- `AuthUser` interface supports `Admin` and `User` roles.
- `hasPermission(key)` method safely traverses permissions JSON with prototype pollution protection.
- UI components wrap restricted areas in `<PermissionGuard>`.

### Root Layout & Providers (`app/layout.tsx`)
The root layout establishes the core provider hierarchy and loads application fonts:
```tsx
<html lang={locale} dir={dir} className={cn(inter.variable, cairo.variable, jetbrainsMono.variable, "scrollbar-none")}>
  <body className="h-screen overflow-hidden bg-surface-base antialiased">
    <QueryProvider>
      <LanguageProvider initialLocale={locale} initialDictionary={dictionary}>
        <ThemeProvider>
          <LayoutProvider initialSidebarCollapsed={sidebarCollapsedCookie}>
            <TooltipProvider>
              {children}
              <Toaster position="bottom-right" richColors closeButton />
            </TooltipProvider>
          </LayoutProvider>
        </ThemeProvider>
      </LanguageProvider>
    </QueryProvider>
  </body>
</html>
```

### Internationalization (i18n)
Full support for English (LTR) and Arabic (RTL):
- 19 modular JSON dictionaries per locale (e.g., `articles.json`, `sidebar.json`).
- Dynamic imports in `lib/i18n/dictionaries.ts` to minimize bundle size.
- `LanguageProvider` handles switching via cookies (`NEXT_LOCALE`) and forces a full browser reload to safely transition layout directions.

### Styling & Theming
Advanced theming powered by Tailwind v4 and CSS variables (`app/globals.css`):
- Custom dark variant utilizing `@custom-variant dark (&:is([data-theme="dark"] *));`.
- View Transitions API integration for smooth theme toggling ripple effects (`::view-transition-old(root)`, `::view-transition-new(root)`).
- Animations supported via `tw-animate-css` (e.g., `slideDown`, `popIn`).

### State Management
- **Client State**: Handled by Zustand (`lib/stores/app.store.ts` for UI state like sidebar toggles with localStorage persistence, `auth.store.ts` for auth).
- **Server State**: Managed by `@tanstack/react-query` (`lib/providers/QueryProvider.tsx`) for caching, pagination, and invalidation.

## 📄 Key Configurations

**`next.config.mjs`**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '8787', pathname: '/**' },
      { protocol: 'https', hostname: '**' }
    ],
  },
  webpack: (config, { dev, isServer }) => { return config; }
};
export default nextConfig;
```

**`components.json` (Shadcn UI)**
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": { "config": "", "css": "app/globals.css", "baseColor": "neutral", "cssVariables": true, "prefix": "" },
  "iconLibrary": "lucide",
  "rtl": false,
  "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" }
```

---

## 💼 Custom Solutions & Enterprise Setup

Need custom UI development, tailored features, or professional deployment for your business?

[🌐 Developer Website](https://ymzerotwo.com) &nbsp;|&nbsp; [📖 Project Documentation](https://auradash.ymzerotwo.com)

---

## 📄 License & Intellectual Property

AuraDash Frontend is distributed under a **Source-Available & Dual-Licensing Model**.
- ✅ **Free for Agencies & Freelancers**: Free to build websites and client applications for direct clients.
- 🚫 **Restricted Commercial Use**: Reselling, white-labeling, or building SaaS platforms requires a Commercial License.

Contact author for commercial licensing: [ymzerotwo.com](https://ymzerotwo.com)
