import { Hono, Context, Next } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { requestId } from 'hono/request-id'
import { bodyLimit } from 'hono/body-limit'
import { AppContext, Bindings } from './types'
import { logger } from './utils/logger'
import { sendResponse } from './utils/response'
import { csrfProtection } from './middleware/csrf'
import { apiKeyAuth } from './middleware/apiKey.middleware'
import { sessionMiddleware } from './middleware/session'
import { programmaticCache } from './middleware/cache.middleware'
import { rateLimiter } from './middleware/rateLimit.middleware'
import { removeMedia } from './utils/media-upload'
import authRoutes from './routes/auth.routes'
import workspaceRoutes from './routes/general-settings.routes'
import teamRoutes from './routes/team.routes'
import mediaRoutes from './routes/media.routes'
import serviceCategoryRoutes from './routes/service-category.routes'
import serviceRoutes from './routes/service.routes'
import commentsRoutes from './routes/comments.routes'
import articleRoutes from './routes/article.routes'
import articleCategoryRoutes from './routes/article-category.routes'
import stateRoutes from './routes/state.routes'
import notificationRoutes from './routes/notification.routes'
import inboxRoutes from './routes/inbox.routes'
import publicInboxRoutes from './routes/public-inbox.routes'
import customerRoutes from './routes/customer.routes'
import bookingRoutes from './routes/booking.routes'
import filesRoutes from './routes/files.routes'
import profileRoutes from './routes/profile.routes'
import uploadRoutes from './routes/upload.routes'
import checkSlugRoutes from './routes/check-slug.routes'
import dashboardRoutes from './routes/dashboard.routes'
import apikeyRoutes from './routes/apikey.routes'

// Mount individual public routes
import publicServicesRoutes from './routes/public-services.routes'
import publicArticlesRoutes from './routes/public-articles.routes'
import publicCommentsRoutes from './routes/public-comments.routes'
import publicSettingsRoutes from './routes/public-settings.routes'

const app = new Hono<AppContext>()

// 1. Generate a unique Request ID for every request to facilitate log tracking.
app.use('*', requestId())

// 2. Log request details, response time, status, and origin.
app.use('*', async (c, next) => {
  const reqId = c.get('requestId') || 'unknown'
  const method = c.req.method
  const url = c.req.url
  const origin = c.req.header('origin') || c.req.header('referer') || 'Unknown Origin'
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  const status = c.res.status
  logger.info(reqId, `${method} ${url} - ${status} (${ms}ms) [from: ${origin}]`)
})

// 3. Configure CORS policies
// Open CORS for Public API to allow requests from any origin (no credentials).
app.use('/api/public/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'HEAD', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'x-api-key'],
  maxAge: 86400,
  credentials: false,
}))

// Open CORS for uploaded files
// [INACTIVE / DISABLED] Note: The /files/* endpoint is currently INACTIVE. Files are served directly via Cloudflare R2 Public URL.
app.use('/files/*', cors({
  origin: '*',
  allowMethods: ['GET', 'HEAD', 'OPTIONS'],
  maxAge: 86400,
  credentials: false,
}))

// Restrict CORS for Dashboard API based on ALLOWED_ORIGINS.
const dashboardCors = async (c: Context<any>, next: Next) => {
  const corsMiddleware = cors({
    origin: (origin) => {
      const allowedOriginsStr = (c.env && c.env.ALLOWED_ORIGINS) ? c.env.ALLOWED_ORIGINS : 'http://localhost:3000,http://localhost:3001'
      const allowedOrigins = allowedOriginsStr.split(',').map((o: string) => o.trim())
      if (!origin || allowedOrigins.includes(origin)) {
        return origin || allowedOrigins[0]
      }
      return null
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'x-csrf-token', 'x-api-key'],
    exposeHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-CSRF-Token'],
    maxAge: 86400,
    credentials: true,
  })

  return corsMiddleware(c, next)
}

// Apply dashboard CORS to all /api/* routes except /api/public
app.use('/api/*', async (c, next) => {
  if (c.req.path.startsWith('/api/public')) {
    return await next()
  }
  return dashboardCors(c, next)
})

// Strict Origin/Referer Validation Middleware for Protected & Auth APIs
// Ensures that no request can reach Auth or Dashboard APIs without a valid Origin/Referer header matching allowed domains.
const strictOriginValidation = async (c: Context, next: Next) => {
  const isVitest = c.env && (c.env as any).IS_VITEST === true
  if (isVitest) {
    return await next()
  }

  const path = c.req.path
  // Bypass public, files, and health endpoints
  if (path.startsWith('/api/public') || path.startsWith('/files') || path === '/health') {
    return await next()
  }

  const reqId = c.get('requestId') || 'unknown'
  const origin = c.req.header('origin')
  const referer = c.req.header('referer')
  const source = origin ?? referer

  if (!source) {
    logger.warn(reqId, `Block request to '${path}': Missing Origin/Referer header`)
    return sendResponse(c, 403, 'MISSING_SOURCE_HEADER', 'Requests to protected endpoints must include a valid Origin or Referer header.')
  }

  try {
    const sourceOrigin = new URL(source).origin
    const allowedOriginsStr = c.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001'
    const allowedOrigins = allowedOriginsStr.split(',').map((o: string) => o.trim()).filter(Boolean)

    if (!allowedOrigins.includes(sourceOrigin)) {
      logger.warn(reqId, `Block request to '${path}': Origin '${sourceOrigin}' is not allowed`)
      return sendResponse(c, 403, 'ORIGIN_NOT_ALLOWED', 'Cross-Origin Request Blocked')
    }
  } catch {
    logger.warn(reqId, `Block request to '${path}': Invalid Origin/Referer format: '${source}'`)
    return sendResponse(c, 403, 'INVALID_SOURCE_HEADER', 'Invalid Origin/Referer Header Format')
  }

  return await next()
}

// Enforce strict Origin/Referer checks globally
app.use('*', strictOriginValidation)


// 4. Inject Security Headers to prevent XSS, Clickjacking, and other common attacks.
app.use('*', secureHeaders({
  xXssProtection: '1; mode=block',
  xFrameOptions: 'DENY',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  contentSecurityPolicy: {
    defaultSrc: ["'none'"],
    baseUri: ["'none'"],
    formAction: ["'none'"],
    frameAncestors: ["'none'"],
    // Allow frontend to read JSON API responses
    connectSrc: ["'self'"],
  }
}))

// 5. Protect the server from resource exhaustion and Denial of Service (DoS) via massive payloads.
// Apply a tight 2MB limit for standard JSON/REST APIs, while allowing up to 100MB specifically for file uploads.
app.use('/api/*', async (c, next) => {
  if (c.req.path.startsWith('/api/upload') || c.req.path.startsWith('/api/media')) {
    return await next()
  }
  const limitMiddleware = bodyLimit({
    maxSize: 2 * 1024 * 1024, // 2MB limit for standard JSON/REST APIs
    onError: (c) => sendResponse(c, 413, 'PAYLOAD_TOO_LARGE', 'Payload too large (Max: 2MB)')
  })
  return limitMiddleware(c, next)
})

app.use('/api/media/*', bodyLimit({
  maxSize: 100 * 1024 * 1024, // 100MB limit for file uploads
  onError: (c) => sendResponse(c, 413, 'PAYLOAD_TOO_LARGE', 'Payload too large (Max: 100MB)')
}))

app.use('/api/upload/*', bodyLimit({
  maxSize: 100 * 1024 * 1024, // 100MB limit for file uploads
  onError: (c) => sendResponse(c, 413, 'PAYLOAD_TOO_LARGE', 'Payload too large (Max: 100MB)')
}))

// 6. CSRF Protection for Authentication routes. 
// Public APIs are skipped because they don't rely on Session Cookies and are immune to CSRF.
app.use('/api/auth/*', csrfProtection)

// Server Health Check Endpoint with rate limiting
app.get('/health', rateLimiter('HEALTH_LIMITER'), (c) => sendResponse(c, 200, 'SERVER_HEALTHY', 'AuraDash Backend is secure and running 🚀', { env: 'production' }))

// Authentication Routes
app.route('/api/auth', authRoutes)

// 8. Public API Configuration: API Key auth, caching, and rate limiting.
app.use('/api/public/*', apiKeyAuth)

// Global protection against unsupported search queries
app.use('/api/public/*', async (c, next) => {
  if (c.req.query('search') !== undefined) {
    return c.json({
      status: 400,
      slug: 'SEARCH_NOT_SUPPORTED',
      message: 'The system does not support search functions currently.'
    }, 400);
  }
  await next();
});

// Apply programmatic cache ONLY to read-only public routes.
// The cache middleware internally ensures that ONLY 'GET' requests are cached, 
// so mutations like POST/PUT/DELETE will safely bypass it automatically.
app.use('/api/public/*', async (c, next) => {
  const path = c.req.path;
  if (path.startsWith('/api/public/inbox')) {
    return next();
  }
  return programmaticCache(3600)(c, next);
})

// Exclude /inbox and /comments from the general public limiter since they have their own strict limiters to prevent spam.
app.use('/api/public/*', rateLimiter('PUBLIC_LIMITER', ['/api/public/inbox', '/api/public/comments']))

app.route('/api/public/inbox', publicInboxRoutes)
app.route('/api/public', publicServicesRoutes)
app.route('/api/public/settings', publicSettingsRoutes)
app.route('/api/public', publicArticlesRoutes)
app.route('/api/public/comments', publicCommentsRoutes)
// [INACTIVE / DISABLED] Note: Serving files via /files/* backend route is currently INACTIVE. 
// Uploaded files are served directly via Cloudflare R2 Public URL (R2_PUBLIC_URL).
app.use('/files/*', rateLimiter('FILES_LIMITER'))
app.route('/files', filesRoutes)

// ==========================================
// Protected Routes (Dashboard API)
// ==========================================
const protectedRoutes = new Hono<AppContext>()

// 9. Session Middleware must run FIRST.
// This populates `c.get('user')`, allowing the Rate Limiter to use a composite key (IP + User ID)
// to prevent users in shared offices (NAT) from blocking each other.
protectedRoutes.use('*', sessionMiddleware)

// Apply CSRF Protection to Dashboard Routes
// CSRF relies on Double Submit Cookie (stateless), so it runs independently of session validity.
protectedRoutes.use('*', csrfProtection)

// 10. Apply dedicated rate limiters for highly-polled endpoints.
protectedRoutes.use('/state/*', rateLimiter('STATE_LIMITER'))
protectedRoutes.use('/notifications/*', rateLimiter('NOTIFICATIONS_LIMITER'))

// 11. Apply the general Dashboard Rate Limiter to all remaining dashboard paths.
protectedRoutes.use('*', rateLimiter('DASHBOARD_LIMITER', ['/api/state', '/api/notifications']))

protectedRoutes.route('/profile', profileRoutes)
protectedRoutes.route('/upload', uploadRoutes)
protectedRoutes.route('/workspace', workspaceRoutes)
protectedRoutes.route('/general-settings', workspaceRoutes)
protectedRoutes.route('/team', teamRoutes)
protectedRoutes.route('/media', mediaRoutes)
protectedRoutes.route('/service-categories', serviceCategoryRoutes)
protectedRoutes.route('/services', serviceRoutes)
protectedRoutes.route('/comments', commentsRoutes)
protectedRoutes.route('/article-categories', articleCategoryRoutes)
protectedRoutes.route('/articles', articleRoutes)
protectedRoutes.route('/state', stateRoutes)
protectedRoutes.route('/notifications', notificationRoutes)
protectedRoutes.route('/inbox', inboxRoutes)
protectedRoutes.route('/customers', customerRoutes)
protectedRoutes.route('/bookings', bookingRoutes)
protectedRoutes.route('/check-slug', checkSlugRoutes)
protectedRoutes.route('/dashboard', dashboardRoutes)
protectedRoutes.route('/apikey', apikeyRoutes)
app.route('/api', protectedRoutes)

// Fallback Route for 404 Not Found
app.notFound((c) => sendResponse(c, 404, 'ROUTE_NOT_FOUND', 'Route not found or method not allowed'))

// 12. Global Error Handler to prevent server crashes on unhandled exceptions.
app.onError((err, c) => {
  const reqId = c.get('requestId') || 'unknown'
  logger.error(reqId, 'Unhandled Exception', err)
  return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error', null, err)
})

export { app }

export default {
  fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    const requiredEnv = [
      'DB',
      'K1',
      'STORAGE',
      'AURADASH_MASTER_SECRET',
      'R2_PUBLIC_URL',
      'CLOUDFLARE_API_TOKEN',
      'CF_ACCOUNT_ID'
    ];
    const missing = requiredEnv.filter(key => !env[key as keyof Bindings]);
    if (missing.length > 0) {
      throw new Error(`CRITICAL_ENVIRONMENT_ERROR: Environment variables missing: ${missing.join(', ')}`);
    }

    const extendedEnv = {
      ...env,
      EMAIL_FROM_ADDRESS: env.EMAIL_FROM_ADDRESS,
      APP_FRONTEND_URL: env.APP_FRONTEND_URL,
      ALLOWED_ORIGINS: env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001',
    };

    return app.fetch(request, extendedEnv as Bindings, ctx);
  },

  // 13. Cron Job scheduled to run daily at 3:00 AM UTC to clean up expired verification codes.
  // Note: Sessions are completely managed in Edge KV which has automatic TTL eviction,
  // so we do not need to manually delete sessions from D1 anymore.
  async scheduled(_event: ScheduledEvent, env: Bindings, _ctx: ExecutionContext) {
    const db = env.DB
    const bucket = env.STORAGE
    const r2PublicUrl = env.R2_PUBLIC_URL

    // 1. Clean up expired verification codes
    try {
      const expired = await db.prepare(
        "DELETE FROM VerificationCodes WHERE expires_at < datetime('now')"
      ).run()
      logger.info('system', `[CRON] Cleaned up ${expired.meta.changes} expired OTP codes`)
    } catch (err) {
      logger.error('system', '[CRON] OTP cleanup failed:', err)
    }

    // 2. Clean up orphaned media files
    try {
      const orphaned = await db.prepare(`
        SELECT id, file_url FROM Media 
        WHERE created_at < datetime('now', '-1 hour')
          AND NOT EXISTS (SELECT 1 FROM Users WHERE photo_url = Media.file_url)
          AND NOT EXISTS (SELECT 1 FROM Business_Settings WHERE logo_url = Media.file_url)
          AND NOT EXISTS (SELECT 1 FROM service_category WHERE (meta_data LIKE '%' || Media.file_url || '%') OR (seo_data LIKE '%' || Media.file_url || '%'))
          AND NOT EXISTS (SELECT 1 FROM Services WHERE (meta_data LIKE '%' || Media.file_url || '%') OR (seo_data LIKE '%' || Media.file_url || '%'))
          AND NOT EXISTS (SELECT 1 FROM Article_Categories WHERE (preview_image_url = Media.file_url) OR (meta_data LIKE '%' || Media.file_url || '%') OR (seo_data LIKE '%' || Media.file_url || '%'))
          AND NOT EXISTS (SELECT 1 FROM Articles WHERE (preview_image_url = Media.file_url) OR (meta_data LIKE '%' || Media.file_url || '%') OR (seo_data LIKE '%' || Media.file_url || '%'))
      `).all() as any;
      if (orphaned.results && orphaned.results.length > 0) {
        let deletedCount = 0;
        for (const media of orphaned.results) {
          const success = await removeMedia(media.id, db, bucket, r2PublicUrl);
          if (success) deletedCount++;
        }
        logger.info('system', `[CRON] Cleaned up ${deletedCount} orphaned media files`);
      }
    } catch (err) {
      logger.error('system', '[CRON] Orphaned media cleanup failed:', err);
    }
  }
}
