/**
 * ==========================================
 *        AuraDash Email Services
 * ==========================================
 * 
 * Business logic layer for managing Email operations.
 */

import { logger } from '../utils/logger';
import Cloudflare from 'cloudflare';

let cachedBusinessSettings: { businessName: string; logoUrl: string | null; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes memory cache

export const buildMimeMessage = ({ from, to, subject, html, text }: { from: string; to: string; subject: string; html: string; text: string }): string => {
  const boundary = '----=_Part_' + Math.random().toString(36).substring(2);
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    html,
    '',
    `--${boundary}--`
  ].join('\r\n');
};

export const EmailService = {
  /**
   * Sends an automated reply using native Cloudflare Workers EMAILER binding or Cloudflare Email Routing API.
   * 
   * @param apiToken - Optional API Token for REST fallback.
   * @param userEmail - Recipient email.
   * @param userName - Recipient name.
   * @param env - Workers Environment bindings (contains env.EMAILER, etc).
   * @param db - D1 Database instance.
   */
  sendAutoReply: async (apiToken: string | undefined, userEmail: string, userName: string, env?: any, db?: any) => {
    const fromAddress = env?.EMAIL_FROM_ADDRESS || 'noreply@yourdomain.com';
    const ticketRef = 'REF-' + Math.floor(100000 + Math.random() * 900000);
    const frontendUrl = env?.APP_FRONTEND_URL || '';
    const displayUrl = frontendUrl.replace(/^https?:\/\//, '');

    let businessName = 'Customer Support';
    let logoUrl: string | null = null;

    if (db) {
      const now = Date.now();
      if (cachedBusinessSettings && (now - cachedBusinessSettings.fetchedAt < CACHE_TTL_MS)) {
        businessName = cachedBusinessSettings.businessName;
        logoUrl = cachedBusinessSettings.logoUrl;
      } else {
        try {
          const settings = await db.prepare('SELECT business_name, logo_url FROM Business_Settings LIMIT 1').first();
          if (settings) {
            if (settings.business_name && settings.business_name.trim()) businessName = settings.business_name.trim();
            if (settings.logo_url && settings.logo_url.trim()) logoUrl = settings.logo_url.trim();
          }
          cachedBusinessSettings = { businessName, logoUrl, fetchedAt: now };
        } catch (e) {
          logger.warn('system', '[EMAIL SERVICE] Could not fetch Business_Settings for email template, using defaults.');
        }
      }
    }

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We Received Your Message</title>
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
              ${logoUrl ? `
                <img src="${logoUrl}" alt="${businessName}" style="max-height: 48px; max-width: 220px; display: inline-block; object-fit: contain;">
              ` : `
                <span style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">${businessName}</span>
              `}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <div style="display: inline-block; width: 44px; height: 44px; background-color: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 50%; line-height: 44px; color: #10b981; font-size: 20px; font-weight: 800; margin-bottom: 12px;">✓</div>
                <h2 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700; color: #f4f4f5;">We Received Your Request</h2>
                <div style="font-size: 12px; color: #818cf8; font-family: monospace; font-weight: 600;">Ref: ${ticketRef}</div>
              </div>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                Hello <strong style="color: #f4f4f5;">${userName || 'there'}</strong>,<br><br>
                Thank you for reaching out to <strong style="color: #f4f4f5;">${businessName}</strong>. This is an automated message to confirm that we have successfully received your inquiry.
              </p>

              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 18px 20px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size: 13px; color: #71717a; padding-bottom: 8px;">Ticket Status:</td>
                        <td style="font-size: 13px; color: #10b981; font-weight: 600; text-align: right; padding-bottom: 8px;">Received / In Queue</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #71717a;">Expected Response:</td>
                        <td style="font-size: 13px; color: #f4f4f5; font-weight: 500; text-align: right;">Within 24 Hours</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.5; color: #71717a;">
                Our team will review your request and get back to you as soon as possible.
              </p>

              <hr style="border: none; border-top: 1px solid #27272a; margin: 24px 0;">

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #71717a; text-align: center;">
                &copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.${displayUrl ? `<br><a href="${frontendUrl}" style="color: #6366f1; text-decoration: none; font-weight: 500;">${displayUrl}</a>` : ''}
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

    const textContent = `Hello ${userName || 'there'},\n\nThank you for reaching out to ${businessName}. This is an automated message to confirm that we have successfully received your inquiry.\n\nOur team will review your request and get back to you as soon as possible.\n\nReference: ${ticketRef}`;

    // 1. Primary: Native Cloudflare Workers Send Email Binding (EMAILER in wrangler.jsonc)
    // No API tokens or account IDs needed! Works out of the box when deployed.
    if (env?.EMAILER && typeof env.EMAILER.send === 'function') {
      try {
        const rawMime = buildMimeMessage({
          from: fromAddress,
          to: userEmail,
          subject: `${businessName} - We have received your request [${ticketRef}]`,
          html: emailHtml,
          text: textContent
        });

        const EmailMsgClass = (globalThis as any).EmailMessage || class {
          from: string; to: string; raw: string;
          constructor(f: string, t: string, r: string) { this.from = f; this.to = t; this.raw = r; }
        };

        const msg = new EmailMsgClass(fromAddress, userEmail, rawMime);
        await env.EMAILER.send(msg);
        logger.info('system', `[EMAIL SERVICE] Email dispatched natively via Workers EMAILER binding to ${userEmail}`);
        return true;
      } catch (e) {
        logger.warn('system', '[EMAIL SERVICE] Native EMAILER dispatch failed, trying REST API fallback...', e);
      }
    }

    // 2. Secondary Fallback: Cloudflare REST API Client (if tokens are configured)
    const accountId = env?.CF_ACCOUNT_ID;
    if (!apiToken || !accountId) {
      logger.warn('system', '[EMAIL SERVICE] Neither native EMAILER binding nor REST API tokens are available. Skipping email dispatch.');
      return false;
    }

    try {
      const client = new Cloudflare({ apiToken });
      const response = await client.emailSending.send({
        account_id: accountId,
        from: fromAddress,
        to: userEmail,
        subject: `${businessName} - We have received your request [${ticketRef}]`,
        html: emailHtml,
        text: textContent
      });
      
      logger.info('system', `[EMAIL SERVICE] Email delivered via REST API status: ${response.delivered}`);
      return true;
    } catch (e) {
      logger.error('system', '[EMAIL SERVICE] Failed to send email via Cloudflare REST API:', e);
      return false;
    }
  }
};
