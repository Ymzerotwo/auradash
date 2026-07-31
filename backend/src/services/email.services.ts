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
  sendAutoReply: async (apiToken: string | undefined, userEmail: string, userName: string) => {
    if (!apiToken) {
      logger.warn('system', '[EMAIL SERVICE] CLOUDFLARE_API_TOKEN is not configured. Skipping email dispatch.');
      return false;
    }

    const ticketRef = 'AD-' + Math.floor(100000 + Math.random() * 900000);

    const emailHtml = `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f9fafb;">
        <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0f172a; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Aura<span style="color: #6366f1;">Dash</span></h1>
          </div>
          
          <h2 style="color: #1e293b; font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 8px;">We received your request</h2>
          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 20px; font-family: monospace;">Ref: ${ticketRef}</div>
          
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
            Hello <strong style="color: #0f172a;">${userName || 'there'}</strong>,<br><br>
            Thank you for reaching out to us. This is an automated message to confirm that we have successfully received your inquiry.
          </p>
          
          <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin-bottom: 30px;">
            Our team will review your request and get back to you as soon as possible.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 20px;">
          
          <div style="text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">
              &copy; ${new Date().getFullYear()} AuraDash. All rights reserved.<br>
              <a href="https://auradash.ymzerotwo.com" style="color: #3b82f6; text-decoration: none;">auradash.ymzerotwo.com</a>
            </p>
          </div>
        </div>
      </div>
    `;

    try {
      const client = new Cloudflare({ apiToken });
      const response = await client.emailSending.send({
        account_id: "453201237115cc94a6d2855b7089a701",
        from: "noreply@auradash.ymzerotwo.com",
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
