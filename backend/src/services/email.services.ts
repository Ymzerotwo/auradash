/**
 * ==========================================
 *        AuraDash Email Services
 * ==========================================
 * 
 * Business logic layer for managing Email operations.
 */

import { logger } from '../utils/logger';
import Cloudflare from 'cloudflare';

export const EmailService = {
  /**
   * Sends an automated reply using Cloudflare Email Routing API.
   * Matches the existing method used in Auth Services.
   * 
   * @param db - The D1 Database instance.
   */
  sendAutoReply: async (apiToken: string | undefined, userEmail: string, userName: string, env?: any) => {
    if (!apiToken) {
      logger.warn('system', '[EMAIL SERVICE] CLOUDFLARE_API_TOKEN is not configured. Skipping email dispatch.');
      return false;
    }

    const accountId = env?.CF_ACCOUNT_ID;
    const fromAddress = env?.EMAIL_FROM_ADDRESS;
    const ticketRef = 'AD-' + Math.floor(100000 + Math.random() * 900000);
    const frontendUrl = env?.APP_FRONTEND_URL;
    const displayUrl = frontendUrl.replace(/^https?:\/\//, '');

    if (!accountId || !fromAddress) {
      logger.warn('system', '[EMAIL SERVICE] CF_ACCOUNT_ID or EMAIL_FROM_ADDRESS is not configured. Skipping email dispatch.');
      return false;
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
              <div style="text-align: center; margin-bottom: 20px;">
                <div style="display: inline-block; width: 44px; height: 44px; background-color: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 50%; line-height: 44px; color: #10b981; font-size: 20px; font-weight: 800; margin-bottom: 12px;">✓</div>
                <h2 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700; color: #f4f4f5;">We Received Your Request</h2>
                <div style="font-size: 12px; color: #818cf8; font-family: monospace; font-weight: 600;">Ref: ${ticketRef}</div>
              </div>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                Hello <strong style="color: #f4f4f5;">${userName || 'there'}</strong>,<br><br>
                Thank you for reaching out to us. This is an automated message to confirm that we have successfully received your inquiry.
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
                &copy; ${new Date().getFullYear()} AuraDash. All rights reserved.<br>
                <a href="${frontendUrl}" style="color: #6366f1; text-decoration: none; font-weight: 500;">${displayUrl}</a>
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

    try {
      const client = new Cloudflare({ apiToken });
      const response = await client.emailSending.send({
        account_id: accountId,
        from: fromAddress,
        to: userEmail,
        subject: `AuraDash - We have received your request [${ticketRef}]`,
        html: emailHtml,
        text: `Hello ${userName || 'there'},\n\nThank you for reaching out to us. This is an automated message to confirm that we have successfully received your inquiry.\n\nOur team will review your request and get back to you as soon as possible.\n\nReference: ${ticketRef}`
      });
      
      logger.info('system', `[EMAIL SERVICE] Email delivered status: ${response.delivered}`);
      return true;
    } catch (e) {
      logger.error('system', '[EMAIL SERVICE] Failed to send email via Cloudflare Email Routing API:', e);
      return false;
    }
  }
};
