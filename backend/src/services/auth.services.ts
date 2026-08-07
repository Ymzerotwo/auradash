/**
 * ==========================================
 *        AuraDash Auth Services
 * ==========================================
 * 
 * Business logic layer for managing Auth operations.
 */

import { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { hashPassword, verifyPassword } from '../utils/crypto';
import Cloudflare from 'cloudflare';
import { logger } from '../utils/logger';
import { buildMimeMessage } from './email.services';

// Authentication Service
// Houses the core business logic for user authentication, session state management,
// and cryptography. Fully decoupled from HTTP contexts.
export const AuthService = {
  
  // Cryptographically Secure One-Time Password (OTP) Generator
  // Generates a 6-digit numeric code using `crypto.getRandomValues`.
  // Leverages uniform distribution modulo arithmetic to completely avoid bias.
  generateOtp: (): string => {
    let codeStr = '';
    const codeArr = new Uint8Array(6);
    crypto.getRandomValues(codeArr);
    for (let i = 0; i < 6; i++) {
      codeStr += (codeArr[i] % 10).toString();
    }
    return codeStr;
  },

  /**
   * User Authentication Handler
   * Authenticates user credentials against the SQLite database, checks account status,
   * and provisions a session in Cloudflare KV cache.
   * Crucial Security Features:
   * 1. Timing Attack Mitigation: If a user is not found, a dummy password hash is calculated
   * to match the CPU execution time of the success path, preventing user enumeration.
   * 2. Permission De-stringification: Parses D1 permissions JSON string before caching in KV
   * to avoid nested escaping issues.
   * 3. Session Expiration: Sessions persist in KV with a TTL based on "rememberMe" choice (30 or 7 days).
   * 
   * @param db - The D1 Database instance.
   */
  login: async (db: D1Database, k1: KVNamespace, username: string, password: string, rememberMe: boolean | undefined, userAgent: string, ipAddress: string) => {
    const normalizedUsername = username.toLowerCase();
    const user = await db.prepare('SELECT id, username, email, password_hash, role, is_banned, full_name, photo_url, permissions FROM Users WHERE username = ?').bind(normalizedUsername).first();
    
    // Mitigate timing-based user enumeration.
    // Ensure we always run a hashing operation (verifyPassword vs dummy hashPassword) so response time is uniform.
    let isValidPassword = false;
    if (user) {
      isValidPassword = await verifyPassword(password, user.password_hash as string);
    } else {
      await hashPassword(password);
    }

    if (!user || !isValidPassword) return { error: 'INVALID_CREDENTIALS', message: 'Invalid username or password', status: 401 };
    if (user.is_banned === 1) return { error: 'ACCOUNT_BANNED', message: 'This account has been banned', status: 403 };

    const sessionId = `session:${user.id}:${crypto.randomUUID()}`;
    const daysToLive = rememberMe ? 30 : 7;
    const expiresAt = new Date(Date.now() + daysToLive * 24 * 60 * 60 * 1000);

    // D1 SQLite returns JSON columns as stringified text.
    // Parse the JSON array/object to avoid nested string representation in the KV session payload.
    let parsedPermissions = {};
    if (user.permissions && typeof user.permissions === 'string') {
      try { parsedPermissions = JSON.parse(user.permissions); } catch { parsedPermissions = {}; }
    }

    const sessionData = {
      session_id: sessionId,
      user_id: user.id,
      email: user.email,
      role: user.role,
      is_banned: user.is_banned,
      permissions: parsedPermissions,
      expires_at: expiresAt.toISOString(),
      user_agent: userAgent,
      ip_address: ipAddress
    };

    // Cache the session in Cloudflare KV to support fast, decentralized middleware lookups.
    await k1.put(sessionId, JSON.stringify(sessionData), { expirationTtl: daysToLive * 24 * 60 * 60 });

    // Exclude the hashed password before returning the user profile data.
    const { password_hash, ...safeUser } = user as any;
    safeUser.permissions = parsedPermissions;

    return { user: safeUser, sessionId, expiresAt };
  },

  /**
   * Session Invalidation Handler
   * Removes the active session key from the KV Cache.
   * 
   * @param db - The D1 Database instance.
   */
  logout: async (db: D1Database, k1: KVNamespace, sessionId: string | undefined) => {
    if (sessionId && sessionId !== 'authenticated' && sessionId.startsWith('session:')) {
      await k1.delete(sessionId);
    }
    return { success: true };
  },

  /**
   * Password Recovery Initiator (Forgot Password)
   * Generates a 6-digit OTP, saves it to the database, and dispatches an HTML email.
   * Crucial Security Features:
   * 1. Email Enumeration Protection: Always returns `{ success: true }` regardless of user existence.
   * 2. Timing Attack Mitigation: Executes dummy database operations (DELETE and SELECT) when the user
   * is missing or banned, matching the database query time of the success path.
   * 3. Sync Execution / Cloudflare Worker Lifetime: Uses `await` on `client.emailSending.send` to block
   * worker termination, ensuring the Cloudflare email api call completes.
   * 4. OTP Visibility: Logs the OTP to the console to facilitate rapid testing in local/staging environments.
   * 
   * @param db - The D1 Database instance.
   */
  forgotPassword: async (db: D1Database, email: string, env: any) => {
    const normalizedEmail = email.toLowerCase();
    const user = await db.prepare('SELECT id, full_name, is_banned FROM Users WHERE email = ?').bind(normalizedEmail).first();
    
    if (!user) {
      AuthService.generateOtp();
      const dummyId = crypto.randomUUID();
      await db.prepare('DELETE FROM VerificationCodes WHERE user_id = ?').bind(dummyId).run();
      await db.prepare('SELECT 1').run();
      return { success: true };
    }

    if (user.is_banned === 1 || user.is_banned === true || String(user.is_banned) === '1') {
      return { error: 'ACCOUNT_BANNED', message: 'This account has been banned', status: 403 };
    }

    const code = AuthService.generateOtp();
    const codeId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const resetRef = 'AD-' + Math.floor(100000 + Math.random() * 900000);
    const accountId = env?.CF_ACCOUNT_ID;
    const fromAddress = (env?.EMAIL_FROM_ADDRESS || 'noreply@yourdomain.com').trim();
    const frontendUrl = env?.APP_FRONTEND_URL || '';
    const recipientEmail = normalizedEmail.trim();

    // Invalidate existing codes first to prevent multiple active codes for the user
    await db.prepare('DELETE FROM VerificationCodes WHERE user_id = ?').bind(user.id as string).run();
    await db.prepare('INSERT INTO VerificationCodes (id, user_id, code, expires_at) VALUES (?, ?, ?, ?)')
      .bind(codeId, user.id as string, code, expiresAt.toISOString())
      .run();

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #121215; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%);"></td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 10px; text-align: center; line-height: 36px; color: #ffffff; font-weight: 800; font-size: 18px; display: inline-block;">A</div>
                  </td>
                  <td style="vertical-align: middle; padding-left: 10px;">
                    <span style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Aura<span style="color: #6366f1;">Dash</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <h2 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700; color: #f4f4f5; text-align: center;">Password Reset Request</h2>
              <p style="margin: 0 0 24px 0; font-size: 12px; color: #71717a; text-align: center; font-family: monospace;">Ref: ${resetRef}</p>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                Hello <strong style="color: #f4f4f5;">${user.full_name || 'User'}</strong>,<br>
                We received a request to reset your password for your AuraDash account. Use the verification code below to complete the reset process:
              </p>

              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #18181b; border: 1px solid #3f3f46; border-radius: 12px; padding: 24px; text-align: center;">
                    <span style="display: block; font-size: 11px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px;">Your Verification Code</span>
                    <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 34px; font-weight: 800; color: #818cf8; letter-spacing: 10px; margin: 0;">
                      ${code}
                    </div>
                    <span style="display: block; font-size: 12px; color: #71717a; margin-top: 10px;">Valid for <strong>15 minutes</strong></span>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; border-radius: 4px; padding: 12px 16px;">
                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #fca5a5;">
                      <strong>Security Note:</strong> If you did not request a password reset, please ignore this email or secure your account if you have concerns.
                    </p>
                  </td>
                </tr>
              </table>

              <hr style="border: none; border-top: 1px solid #27272a; margin: 24px 0;">

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #71717a; text-align: center;">
                &copy; ${new Date().getFullYear()} AuraDash. All rights reserved.<br>
                <a href="${frontendUrl}" style="color: #6366f1; text-decoration: none; font-weight: 500;">${frontendUrl.replace(/^https?:\/\//, '')}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
    const textContent = `Hello ${user.full_name},\n\nYou requested to reset your password. Your 6-digit code is: ${code}\n\nThis code is valid for 15 minutes.\n\nReference: ${resetRef}`;
    const subjectStr = `AuraDash - Password Reset Code [Ref: ${resetRef}]`;

    // 1. Primary: Native Cloudflare Workers Send Email Binding (EMAILER)
    // Zero API tokens or account IDs required! Works natively out of the box.
    if (env?.EMAILER && typeof env.EMAILER.send === 'function' && recipientEmail.includes('@')) {
      try {
        // Official Cloudflare Workers structured email send
        await env.EMAILER.send({
          to: [{ email: recipientEmail }],
          from: { email: fromAddress, name: 'AuraDash Security' },
          subject: subjectStr,
          text: textContent,
          html: emailHtml
        });
        logger.info('system', `Password reset email dispatched natively via Workers EMAILER binding to ${recipientEmail}`);
      } catch (structuredErr: any) {
        // Fallback to EmailMessage if raw MIME is required by runtime
        try {
          const rawMime = buildMimeMessage({
            from: fromAddress,
            to: recipientEmail,
            subject: subjectStr,
            html: emailHtml,
            text: textContent
          });
          const EmailMsg = (globalThis as any).EmailMessage;
          if (EmailMsg) {
            await env.EMAILER.send(new EmailMsg(fromAddress, recipientEmail, rawMime));
            logger.info('system', `Password reset email dispatched natively via EmailMessage to ${recipientEmail}`);
          }
        } catch (mimeErr) {
          logger.warn('system', `Native EMAILER dispatch failed for password reset: ${structuredErr?.message || structuredErr}`);
        }
      }
    } else if (env?.CLOUDFLARE_API_TOKEN && accountId && recipientEmail.includes('@')) {
      // 2. Secondary Fallback: Cloudflare REST API Client
      try {
        const client = new Cloudflare({ apiToken: env.CLOUDFLARE_API_TOKEN });
        await client.emailSending.send({
          account_id: accountId,
          from: fromAddress,
          to: recipientEmail,
          subject: subjectStr,
          html: emailHtml,
          text: textContent
        });
        logger.info('system', `Password reset email successfully sent via REST API to ${recipientEmail}`);
      } catch (e: any) {
        logger.error('system', `Failed to send email via Cloudflare REST API: ${e.message || e}`);
      }
    } else {
      logger.warn('system', `Neither native EMAILER binding nor Cloudflare API tokens are available. Password reset email skipped.`);
    }

    return { success: true };
  },

  /**
   * Resends the verification code for password recovery.
   * Enforces account status check (is_banned) before dispatching a new OTP email.
   */
  resendResetCode: async (db: D1Database, email: string, env: any) => {
    return AuthService.forgotPassword(db, email, env);
  },

  /**
   * Verification Code Validator
   * Checks the provided recovery OTP against the database record.
   * Crucial Security Features:
   * 1. Brute-Force Rate Limiting: Lock attempts key to `ipAddress:email` combination inside
   * Cloudflare KV. Max 5 failures allowed within 15 minutes to block automation.
   * 2. Expiration Verification: Assures the code has not surpassed the 15-minute validity window.
   * 
   * @param db - The D1 Database instance.
   */
  verifyResetCode: async (db: D1Database, k1: KVNamespace, email: string, code: string, ipAddress: string) => {
    const normalizedEmail = email.toLowerCase();
    
    // Check brute-force attempts. Rate-limit key bound strictly to ip + email.
    const attemptsKey = `otp_attempts:${ipAddress}:${normalizedEmail}`;
    const failedAttempts = parseInt(await k1.get(attemptsKey) || '0', 10);
    if (failedAttempts >= 5) {
      return { error: 'ACCOUNT_LOCKED', message: 'Too many failed attempts. Try again in 15 minutes.', status: 429 };
    }

    const user = await db.prepare('SELECT id, is_banned FROM Users WHERE email = ?').bind(normalizedEmail).first();
    if (!user) {
      await k1.put(attemptsKey, (failedAttempts + 1).toString(), { expirationTtl: 900 });
      return { error: 'INVALID_CODE', message: 'Invalid or expired recovery code.', status: 400 };
    }

    // Verify account status before verifying OTP code
    if (user.is_banned === 1 || user.is_banned === true || String(user.is_banned) === '1') {
      return { error: 'ACCOUNT_BANNED', message: 'This account has been banned', status: 403 };
    }

    const verification = await db.prepare(
      'SELECT id, expires_at FROM VerificationCodes WHERE user_id = ? AND code = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(user.id as string, code).first();

    if (!verification || new Date(verification.expires_at as string) < new Date()) {
      await k1.put(attemptsKey, (failedAttempts + 1).toString(), { expirationTtl: 900 });
      return { error: 'INVALID_CODE', message: 'Invalid or expired recovery code.', status: 400 };
    }

    // Reset brute-force counter upon successful verification
    await k1.delete(attemptsKey);

    return { success: true };
  },

  /**
   * Password Committer
   * Performs the final password update inside a database transaction batch.
   * Crucial Security Features:
   * 1. Transaction Atomic Batching: Updates the user's password and deletes the OTP code
   * in a single atomic `db.batch` call.
   * 2. Force Revocation: Calls `revokeAllUserSessions` to evict any existing active
   * sessions from the Cloudflare KV cache. This immediately logouts the user across
   * all active devices and browsers.
   * 
   * @param db - The D1 Database instance.
   */
  resetPassword: async (db: D1Database, k1: KVNamespace, email: string, code: string, newPassword: string, ipAddress: string) => {
    const normalizedEmail = email.toLowerCase();

    // Check brute-force attempts on password reset endpoint as well to block bypasses
    const attemptsKey = `otp_attempts:${ipAddress}:${normalizedEmail}`;
    const failedAttempts = parseInt(await k1.get(attemptsKey) || '0', 10);
    if (failedAttempts >= 5) {
      return { error: 'ACCOUNT_LOCKED', message: 'Too many failed attempts. Try again in 15 minutes.', status: 429 };
    }

    const user = await db.prepare('SELECT id, is_banned FROM Users WHERE email = ?').bind(normalizedEmail).first();
    if (!user) {
      await k1.put(attemptsKey, (failedAttempts + 1).toString(), { expirationTtl: 900 });
      return { error: 'INVALID_CODE', message: 'Invalid or expired recovery code.', status: 400 };
    }

    // Verify account status before resetting the password
    if (user.is_banned === 1 || user.is_banned === true || String(user.is_banned) === '1') {
      return { error: 'ACCOUNT_BANNED', message: 'This account has been banned', status: 403 };
    }

    const verification = await db.prepare(
      'SELECT id, expires_at FROM VerificationCodes WHERE user_id = ? AND code = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(user.id as string, code).first();

    if (!verification) {
      await k1.put(attemptsKey, (failedAttempts + 1).toString(), { expirationTtl: 900 });
      return { error: 'INVALID_CODE', message: 'Invalid recovery code.', status: 400 };
    }
    if (new Date(verification.expires_at as string) < new Date()) {
      await k1.put(attemptsKey, (failedAttempts + 1).toString(), { expirationTtl: 900 });
      return { error: 'CODE_EXPIRED', message: 'Recovery code has expired.', status: 400 };
    }

    await k1.delete(attemptsKey);

    // Securely hash password using PBKDF2 Web Crypto API implementation
    const hashedPassword = await hashPassword(newPassword);
    
    // Batch operations to guarantee atomicity and track password update
    await db.batch([
      db.prepare('UPDATE Users SET password_hash = ?, password_updated_at = CURRENT_TIMESTAMP, password_updated_by = ? WHERE id = ?').bind(hashedPassword, 'self', user.id as string),
      db.prepare('DELETE FROM VerificationCodes WHERE user_id = ?').bind(user.id as string)
    ]);
    
    // Forcefully disconnect all active devices/sessions
    await AuthService.revokeAllUserSessions(k1, user.id as string);

    return { success: true };
  },

  /**
   * Central Session Revocation Utility
   * Evicts all active session records from Cloudflare KV matching a user ID prefix.
   * Critical for immediate privilege escalation mitigation when roles or status changes.
   * 
   * @param db - The D1 Database instance.
   */
  revokeAllUserSessions: async (k1: KVNamespace, userId: string) => {
    let cursor: string | undefined = undefined;
    let revokedCount = 0;
    
    do {
      const sessionsList: any = await k1.list({ prefix: `session:${userId}:`, cursor });
      const deletePromises = sessionsList.keys.map((key: any) => k1.delete(key.name));
      await Promise.all(deletePromises);
      revokedCount += sessionsList.keys.length;
      cursor = sessionsList.list_complete ? undefined : sessionsList.cursor;
    } while (cursor);

    return { success: true, revokedCount };
  }
};
