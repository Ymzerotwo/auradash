/**
 * ==========================================
 *        AuraDash Inbox Controller
 * ==========================================
 * 
 * Handles HTTP requests for Inbox operations.
 */

import { logger } from '../utils/logger';
import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { InboxService } from '../services/inbox.services';
import { InboxSchema, UpdateInboxStatusSchema } from '../validators/inbox.validators';

// Controller handling API requests for the unified Inbox module.
// Manages public form submissions and admin interactions (read/unread/spam/convert).
export const InboxController = {
  
  /**
   * Accepts messages submitted from the public-facing contact forms.
   * 
   * @param c - The Hono HTTP context.
   */
  createInboxMessage: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    // Attempt to get KV namespace, usually c.env.K1 or K1 is bound
    const k1 = c.env.K1 || (c.env as any).auradash_kv || null;
    
    try {
      const body = await c.req.json();
      
      // Strict Zod validation guarantees that all required fields
      // exist and are well-formed before any database interaction occurs.
      const validation = InboxSchema.safeParse(body);
      
      if (!validation.success) {
        return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid data provided', validation.error.format());
      }

      const result = await InboxService.submitInboxMessage(db, k1, c.env.CLOUDFLARE_API_TOKEN, validation.data, c.executionCtx, c.env);
      
      // Tarpit. Artificial delay between 500ms and 1.5s to slow down
      // automated spam bots and prevent timing attacks or immediate feedback.
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 500));

      return sendResponse(c, 200, 'INBOX_MESSAGE_CREATED', 'Message sent successfully', result);
    } catch (error: any) {
      if (error.message.includes('MISSING_FINANCIAL_CONTRACT')) {
        return sendResponse(c, 400, 'MISSING_FINANCIAL_CONTRACT', error.message, null);
      }
      if (error.message.includes('Service not found or inactive')) {
        return sendResponse(c, 400, 'SERVICE_NOT_FOUND', 'The specified service does not exist or is inactive.');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to send message', null, error.message);
    }
  },

  /**
   * Fetches paginated inbox messages for the admin panel, supports status filtering.
   * 
   * @param c - The Hono HTTP context.
   */
  getMessages: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const user = c.get('user')!;
    try {
      const data = await InboxService.getMessages(db, user, c.req.query('page'), c.req.query('limit'), c.req.query('status'));
      return sendResponse(c, 200, 'MESSAGES_FETCHED', 'Messages retrieved successfully', data);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve messages', null, error.message);
    }
  },

  /**
   * Returns the total count of unread messages to display on the admin navigation badge.
   * 
   * @param c - The Hono HTTP context.
   */
  getUnreadCount: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const k1 = c.env.K1 || (c.env as any).auradash_kv || null;
    try {
      const count = await InboxService.getUnreadCount(db, k1);
      return sendResponse(c, 200, 'UNREAD_COUNT_FETCHED', 'Unread count retrieved successfully', { count });
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve unread count', null, error.message);
    }
  },

  /**
   * Updates the state of an inbox message (Read, Unread, Converted, Spam).
   * 
   * @param c - The Hono HTTP context.
   */
  updateStatus: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const user = c.get('user')!;
    const k1 = c.env.K1 || (c.env as any).auradash_kv || null;
    
    try {
      const body = await c.req.json();
      const validation = UpdateInboxStatusSchema.safeParse(body);
      
      if (!validation.success) {
        return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid status provided', validation.error.format());
      }

      const status = validation.data.status;
      const id = c.req.param('id') as string;

      // Business logic to prevent conflicting states (e.g. marking a spammed message as converted).
      if (status === 'read') {
        await InboxService.markAsRead(db, k1, id, user.id);
      } else if (status === 'unread') {
        const currentMessage = await InboxService.getMessageById(db, id);
        if (currentMessage?.status === 'spam') {
          await InboxService.removeFromSpam(db, k1, id);
        } else {
          await InboxService.markAsUnread(db, k1, id);
        }
      } else if (status === 'converted') {
        await InboxService.markAsConverted(db, k1, id, user.id);
      } else if (status === 'profile_created') {
        await InboxService.createProfileOnly(db, k1, id, user.id);
      } else if (status === 'spam') {
        await InboxService.markAsSpam(db, k1, id, user.id, validation.data.spam_reason);
      }

      return sendResponse(c, 200, 'STATUS_UPDATED', 'Message status updated successfully');
    } catch (error: any) {
      if (error.message === 'CANNOT_SPAM_CONVERTED') {
        return sendResponse(c, 400, 'CANNOT_SPAM_CONVERTED', 'Cannot mark a converted client as spam.');
      }
      if (error.message === 'CANNOT_CONVERT_SPAM') {
        return sendResponse(c, 400, 'CANNOT_CONVERT_SPAM', 'Cannot convert a message marked as spam. Please remove from spam first.');
      }
      if (error.message === 'Message is in spam') {
        return sendResponse(c, 400, 'MESSAGE_IS_SPAM', 'Cannot mark a spam message as unread. Please remove from spam first.');
      }
      if (error.message === 'CUSTOMER_IS_SPAMMED') {
        return sendResponse(c, 403, 'CUSTOMER_IS_SPAMMED', 'This customer is blocked in the CRM. Please unban them first.');
      }
      if (error.message === 'ONLY_GENERAL_CAN_BE_PROFILE') {
        return sendResponse(c, 400, 'ONLY_GENERAL_CAN_BE_PROFILE', 'Only general inquiries can be converted to profiles without bookings.');
      }
      if (error.message === 'OPTIMISTIC_LOCK_FAIL') {
        return sendResponse(c, 409, 'CONFLICT', 'This message was modified by another user just now. Please reload the page to see the latest changes.');
      }
      logger.error(c.get('requestId') || 'unknown', '[INBOX_STATUS_ERROR]', error);
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to update message status', null, error.message);
    }
  },

  /**
   * Deletes an inbox message permanently.
   * 
   * @param c - The Hono HTTP context.
   */
  deleteMessage: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const k1 = c.env.K1 || (c.env as any).auradash_kv || null;
    try {
      await InboxService.deleteMessage(db, k1, c.req.param('id') as string);
      return sendResponse(c, 200, 'MESSAGE_DELETED', 'Message deleted successfully');
    } catch (error: any) {
      if (error.message === 'OPTIMISTIC_LOCK_FAIL') {
        return sendResponse(c, 409, 'CONFLICT', 'This message was modified by another user just now. Please reload the page to see the latest changes.');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to delete message', null, error.message);
    }
  }
};
