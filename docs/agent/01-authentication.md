# 01 · Authentication & API Keys

AuraDash Public API utilizes **stateless HMAC-SHA256 API Keys**. There are no sessions, no OAuth redirects, and no cookies. Every request is mathematically verified at the edge in sub-milliseconds without performing database queries in the authentication layer.

---

## Step 1 — Obtaining your API Key

API keys are created and managed exclusively from the **AuraDash Admin Dashboard**.

### Admin Path

```
Admin Dashboard → Settings → API Keys → New API Key
```

### Detailed Steps:

1. **Log in** to your AuraDash Admin Dashboard with an account holding `settings.api_key` permissions.
2. Navigate to **Settings** from the sidebar menu.
3. Click on the **API Keys** tab.
4. Click **"New API Key"** (top right/left button).
5. A modal dialog will prompt you for:
   - **Name** — A descriptive identifier (e.g., `"Marketing Website"`, `"Mobile App"`, `"Postman Tests"`)
   - **Type** — Select **Production** or **Test**
   - **Domain** — *(Production keys only)* Your website domain (e.g. `example.com`)
   - **Expires In** — Expiration window in hours (1 to 24 hours)
6. Click **"Create"**.
7. **Copy the key immediately** — it is displayed **only once** and cannot be retrieved again.

> ⚠️ **Important:** Raw key strings are never stored on the server. If lost, the key must be deleted and re-issued.

---

## Step 2 — Key Types: Production vs Test Keys

### 🔵 Production Key (`auradash_pk_*`)

Use Production keys for **live websites and client apps** in production environments.

| Feature | Details |
|---------|---------|
| **Key Prefix** | Starts with `auradash_pk_` (Production Key) |
| **Domain Binding** | ✅ Mandatory — Cryptographically bound to your live domain (e.g. `example.com`) |
| **Allowed Origins** | Exact domain match or subdomains (e.g. `example.com` allows `blog.example.com`) |
| **Origin Header** | ✅ Required — Sent automatically by web browsers; manual header required for Server-to-Server |
| **TTL / Expiration** | ♾️ **Never Expire** — Permanent until manually revoked from Admin Dashboard |
| **Best Used For** | Live client websites, public client-side JavaScript apps |

**How It Works:**  
When a client browser issues a fetch request, the browser automatically attaches `Origin: https://example.com`. The server verifies this origin against the domain baked into the HMAC signature. If mismatched → returns `403 DOMAIN_MISMATCH`.

```
Browser (example.com) ──► API + x-api-key (auradash_pk_*) + Origin: https://example.com
                                   │
                          ┌────────▼─────────┐
                          │  HMAC verified ✅ │
                          │  Domain matched ✅ │
                          └──────────────────┘
                                   │
                            Return Data
```

---

### 🟡 Test Key (`auradash_ts_*`)

Use Test keys for **Local Development**, **Mobile Simulators**, **Postman**, **CI/CD Pipelines**, or **Server-to-Server (SSR)** environments.

| Feature | Details |
|---------|---------|
| **Key Prefix** | Starts with `auradash_ts_` (Test Key) |
| **Domain Binding** | ❌ None — Works from any origin, `localhost:3000`, `127.0.0.1`, mobile emulators, or cURL |
| **Allowed Origins** | Any origin (or missing `Origin` header entirely) |
| **Origin Header** | ❌ Not required — Bypasses Origin header validation checks |
| **TTL / Expiration** | ⏳ **1 to 24 Hours Max** — Configurable at creation (automatically expires) |
| **Best Used For** | Local dev (`localhost`), Postman, Flutter/React Native emulators, automated CI tests, SSR |

### 🛠️ How to Use Test Keys in Local Development:
1. Log into **Admin Dashboard → Settings → API Keys → New API Key**.
2. Select Type: **Test**.
3. Copy the generated key string (e.g., `auradash_ts_eyJ...`).
4. Paste it into your client application's local environment file (`.env.local`):
   ```env
   NEXT_PUBLIC_AURADASH_BASE_URL=http://localhost:8787/api/public
   NEXT_PUBLIC_AURADASH_API_KEY=auradash_ts_your_test_key_here
   ```
5. All requests sent from `localhost` or HTTP tools will authenticate successfully without domain mismatch errors.

> ⚠️ **CRITICAL SECURITY NOTICE**:  
> **Never deploy a Test Key (`auradash_ts_*`) to a live production website.** Because Test Keys bypass domain-binding validation, anyone who inspects the key in client-side code can reuse it from any domain or tool.

---

## Step 3 — Sending API Keys in Requests

### Option A — `x-api-key` Header (Recommended)

```http
GET /api/public/articles HTTP/1.1
Host: api.yourdomain.com
x-api-key: <YOUR_API_KEY>
Origin: https://example.com
```

### Option B — `Authorization: Bearer` Header

```http
GET /api/public/articles HTTP/1.1
Host: api.yourdomain.com
Authorization: Bearer <YOUR_API_KEY>
Origin: https://example.com
```

If both headers are present, `x-api-key` takes precedence.

---

## HMAC Validation Architecture

When a **Key is Minted**:

```
payload = { domain: "example.com", expiresAt: 1700000000 }
signature = HMAC-SHA256(payload, AURADASH_MASTER_SECRET)
token = base64(payload) + "." + base64(signature)
```

When a **Request Arrives**:

```
1. Extract Token from header
2. Decode payload → extract domain and expiration timestamp
3. Re-calculate HMAC(payload, AURADASH_MASTER_SECRET)
4. Compare calculated vs token signature → if invalid: 401 INVALID_API_KEY
5. Check expiration → if expired: 401 INVALID_API_KEY
6. Compare Origin header vs payload.domain → if mismatch: 403 DOMAIN_MISMATCH
7. ✅ Request proceeds
```

Zero database or KV cache lookups are performed during validation.

---

## Key Validation & Revocation Architecture (100% Pure Stateless Verification)

API key validation in AuraDash is **100% mathematical and stateless**. It performs **ZERO D1 database queries and ZERO KV cache lookups** during request authentication:

1. **Pure HMAC-SHA256 Edge Verification**: Every incoming key is verified at the edge by calculating its cryptographic signature against `AURADASH_MASTER_SECRET` and checking domain binding & expiration timestamps embedded inside the token payload.
2. **Instant Global Revocation via Secret Rotation**: Updating or rotating `AURADASH_MASTER_SECRET` in environment variables mathematically invalidates all previously generated API keys across the entire Cloudflare edge network in 0 milliseconds, without touching any database or cache.

---

## Error Codes Reference

| HTTP Status | Code | Meaning | Action / Fix |
|-------------|------|---------|--------------|
| `401` | `API_KEY_MISSING` | No API key header provided | Add `x-api-key: <key>` to request |
| `401` | `INVALID_API_KEY` | Signature invalid, expired, or deleted | Generate a new key from Admin Dashboard |
| `403` | `ORIGIN_REQUIRED` | Production key used without `Origin` header | Ensure browser attaches `Origin` or send manually |
| `403` | `DOMAIN_MISMATCH` | Request origin does not match bound domain | Re-issue key with correct domain |
| `500` | `INTERNAL_SERVER_ERROR` | Server missing `AURADASH_MASTER_SECRET` | Check environment variable configuration |

---

## Security Best Practices

1. **Store keys in Environment Variables** (`.env.local`) — never hardcode in source code.
2. **Rotate keys periodically**.
3. **Use one key per domain** (`example.com`, `app.example.com`, `staging.example.com`).
4. **Use Production keys on live sites** for domain-binding protection.
5. **Revoke compromised keys immediately** via Admin Dashboard → Settings → API Keys → Delete.
