/**
 * ==========================================
 *        AuraDash Inbox Services
 * ==========================================
 * 
 * Business logic layer for managing Inbox operations.
 */

import { logger } from '../utils/logger';
import { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { getPaginationOptions, paginateQuery } from '../utils/pagination';

const parseJsonColumn = <T>(raw: unknown, fallback: T): T => {
  if (!raw) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try { return JSON.parse(raw); } catch { return fallback; }
};

import { EmailService } from './email.services';
import { NotificationService } from './notification.services';
import { CustomerService } from './customer.services';

// Service layer handling Database (D1) and Key-Value (KV) interactions for the Inbox.
export const InboxService = {
  /**
   * Processes new public contact inquiries, verifies services, and handles shadow bans.
   * 
   * @param db - The D1 Database instance.
   */
  submitInboxMessage: async (db: D1Database, k1: KVNamespace, apiKey: string | undefined, data: any, ctx?: any) => {
    // 1. Shadow Ban Check (O(1) KV Lookup)
    // Instantly intercepts and fakes success for blocked spammers without hitting the D1 SQL database.
    const k1Ref = k1 || (db as any).env?.K1 || (db as any).K1;
    if (k1Ref) {
      const [isBlockedPhone, isBlockedEmail] = await Promise.all([
        data.phone ? k1Ref.get(`spam:phone:${data.phone}`) : Promise.resolve(null),
        data.email ? k1Ref.get(`spam:email:${data.email}`) : Promise.resolve(null)
      ]);
      
      if (isBlockedPhone || isBlockedEmail) {
        // Shadow Ban: Fake success response to fool the spammer
        logger.info('system', `[SHADOW BAN] Blocked message from phone:${data.phone} / email:${data.email}`);
        return { id: crypto.randomUUID() };
      }
    }

    let metadata: any = null;
    const targetServiceId = data.service_id || data.service;

    if ((data.inquiry_type === 'service' || targetServiceId) && targetServiceId) {
      const service = await db.prepare('SELECT meta_data FROM Services WHERE id = ? AND is_active = 1').bind(targetServiceId).first();
      if (!service) {
        throw new Error('Service not found or inactive');
      }

      const metaDataArr = parseJsonColumn<any[]>(service.meta_data, []);
      
      const getFieldValue = (field: any): string | null => {
        if (!field) return null;
        if (field.data && typeof field.data === 'object' && !Array.isArray(field.data)) {
          return field.data.text ?? field.data.value ?? field.data.url ?? null;
        }
        return field.value ?? field.data ?? null;
      };

      const nameField = metaDataArr.find((f: any) => 
        (f.label && f.label.toString().toLowerCase() === 'name') || 
        (f.id && f.id.toString().toLowerCase() === 'name')
      );
      const priceField = metaDataArr.find((f: any) => 
        (f.label && f.label.toString().toLowerCase() === 'price') || 
        (f.id && f.id.toString().toLowerCase() === 'price')
      );
      const discountField = metaDataArr.find((f: any) => 
        (f.label && f.label.toString().toLowerCase() === 'discount') || 
        (f.id && f.id.toString().toLowerCase() === 'discount')
      );

      const serviceName = getFieldValue(nameField);
      const priceText = getFieldValue(priceField);
      const servicePrice = priceText ? parseFloat(priceText) : undefined;
      const discountText = getFieldValue(discountField);
      const serviceDiscount = discountText ? parseFloat(discountText) : null;

      // Enforcement of financial contract as requested by the architect
      if (!serviceName || servicePrice === undefined || isNaN(servicePrice)) {
        throw new Error('MISSING_FINANCIAL_CONTRACT: Missing required service fields (Name, Price). Please review: auradash.ymzerotwo.com/docs');
      }

      metadata = {
        service_id: targetServiceId,
        name: serviceName,
        price: servicePrice,
        discount: serviceDiscount || null
      };
    }

    const id = crypto.randomUUID();
    
    await db.prepare(`
      INSERT INTO Inbox (id, full_name, phone, email, inquiry_type, message, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?, 'unread', ?)
    `).bind(
      id,
      data.full_name,
      data.phone,
      data.email,
      data.inquiry_type,
      data.message || null,
      metadata ? JSON.stringify(metadata) : null
    ).run();

    // Send actual automated confirmation email asynchronously to avoid blocking the response
    if (data.email) {
      const envRef = (db as any).env || {};
      const emailPromise = EmailService.sendAutoReply(apiKey, data.email, data.full_name, envRef)
        .catch(e => logger.error('system', 'Email sending failed:', e));
        
      if (ctx && ctx.waitUntil) {
        ctx.waitUntil(emailPromise);
      } else {
        await emailPromise;
      }
    }

    // Dispatch Notification to room:inbox
    try {
      const k1Ref = k1 || (db as any).env?.K1 || (db as any).K1; // robust KV fallback
      if (k1Ref) {
        await NotificationService.publishEvent(
          db,
          k1Ref,
          'NEW_INBOX_MESSAGE',
          id, // targetId
          'NEW_INBOX_MESSAGE', // Use event type as title for translation fallback
          { userName: data.full_name }, // message body variables
          '/inbox', // URL
          'inbox' // roomName
        );
      }
    } catch (e) {
      logger.error('system', 'Failed to dispatch inbox notification:', e);
    }

    return { id };
  },

  /**
   * Retrieves paginated inbox messages for admin review, applying secure field selection.
   * 
   * @param db - The D1 Database instance.
   */
  getMessages: async (db: D1Database, user: any, page: any, limit: any, status?: string) => {
    const paginationOptions = getPaginationOptions(page, limit, 20);
    
    // Secure Field Selection: Hide audit fields from standard users at the database level
    const isAdmin = user.role === 'Admin';
    let query = '';
    
    if (isAdmin) {
      query = `SELECT i.id, i.full_name, i.phone, i.email, i.inquiry_type, i.message, i.status, i.metadata, i.created_at,
                      i.read_at, i.converted_at, i.profile_created_at, i.add_to_spam_at, i.spam_reason,
                      u_read.full_name as read_by_name,
                      u_conv.full_name as converted_by_name,
                      u_spam.full_name as add_to_spam_by_name,
                      u_prof.full_name as profile_created_by_name
               FROM Inbox i
               LEFT JOIN Users u_read ON i.read_by = u_read.id
               LEFT JOIN Users u_conv ON i.converted_by = u_conv.id
               LEFT JOIN Users u_spam ON i.add_to_spam_by = u_spam.id
               LEFT JOIN Users u_prof ON i.profile_created_by = u_prof.id`;
    } else {
      query = `SELECT id, full_name, phone, email, inquiry_type, message, status, metadata, created_at FROM Inbox i`;
    }
    
    const params: any[] = [];
    
    if (status && status !== 'all') {
      query += ' WHERE i.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY i.created_at DESC';
    const countQuery = status && status !== 'all' 
      ? 'SELECT COUNT(*) as total FROM Inbox WHERE status = ?'
      : 'SELECT COUNT(*) as total FROM Inbox';
    
    const paginatedData = await paginateQuery(db, query, countQuery, params, paginationOptions);
    
    const messages = paginatedData.data.map((row: any) => {
      // Parse metadata
      if (row.metadata) {
        row.metadata = parseJsonColumn(row.metadata, null);
      }
      // Note: Data masking is now handled securely at the SQL SELECT level above.
      return row;
    });

    return { messages, pagination: paginatedData.pagination };
  },

  /**
   * Marks a message as read.
   * Implements Optimistic Locking (result.meta.changes === 0) to prevent race conditions
   * when multiple admins try to alter the same message simultaneously.
   * 
   * @param db - The D1 Database instance.
   */
  markAsRead: async (db: D1Database, k1: KVNamespace, id: string, userId: string) => {
    const current = await db.prepare('SELECT status, phone, email FROM Inbox WHERE id = ?').bind(id).first();
    if (!current) throw new Error('Message not found');
    if (current.status === 'read') return { success: true };

    const result = await db.prepare(`
      UPDATE Inbox 
      SET status = 'read', read_at = CURRENT_TIMESTAMP, read_by = ?, 
          converted_at = NULL, converted_by = NULL, 
          add_to_spam_at = NULL, add_to_spam_by = NULL, spam_reason = NULL 
      WHERE id = ? AND status = ?
    `).bind(userId, id, current.status).run();

    if (result.meta.changes === 0) {
      throw new Error('OPTIMISTIC_LOCK_FAIL');
    }

    if (current.status === 'spam') await InboxService._unblockContact(k1, current.phone as string, current.email as string);
    await InboxService._bumpInboxVersion(db, k1);
    return { success: true };
  },

  /**
   * Reverts a message back to unread status (e.g. for later review).
   * 
   * @param db - The D1 Database instance.
   */
  markAsUnread: async (db: D1Database, k1: KVNamespace, id: string) => {
    const current = await db.prepare('SELECT status FROM Inbox WHERE id = ?').bind(id).first();
    if (!current) throw new Error('Message not found');
    if (current.status === 'unread') return { success: true };
    if (current.status === 'spam') throw new Error('Message is in spam');

    const result = await db.prepare(`
      UPDATE Inbox 
      SET status = 'unread', read_at = NULL, read_by = NULL, 
          converted_at = NULL, converted_by = NULL, 
          add_to_spam_at = NULL, add_to_spam_by = NULL, spam_reason = NULL 
      WHERE id = ? AND status = ?
    `).bind(id, current.status).run();

    if (result.meta.changes === 0) {
      throw new Error('OPTIMISTIC_LOCK_FAIL');
    }

    await InboxService._bumpInboxVersion(db, k1);
    return { success: true };
  },

  /**
   * Removes a message from the spam folder and lifts the shadow ban from KV.
   * 
   * @param db - The D1 Database instance.
   */
  removeFromSpam: async (db: D1Database, k1: KVNamespace, id: string) => {
    const current = await db.prepare('SELECT status, phone, email FROM Inbox WHERE id = ?').bind(id).first();
    if (!current) throw new Error('Message not found');
    if (current.status !== 'spam') throw new Error('Message is not in spam');

    const statements = [];

    // 1. Update Inbox Message
    statements.push(db.prepare(`
      UPDATE Inbox 
      SET status = 'unread', read_at = NULL, read_by = NULL, 
          converted_at = NULL, converted_by = NULL, 
          add_to_spam_at = NULL, add_to_spam_by = NULL, spam_reason = NULL 
      WHERE id = ? AND status = ?
    `).bind(id, current.status));

    // 2. Unspam Customer Profile if exists
    let customerQuery = 'SELECT id, spam FROM Customers WHERE phone = ?';
    const customerParams: any[] = [current.phone];
    if (current.email) {
      customerQuery += ' OR email = ?';
      customerParams.push(current.email);
    }
    const existingCustomers = await db.prepare(customerQuery).bind(...customerParams).all();
    if (existingCustomers.results.length > 0) {
      const targetCustomer = existingCustomers.results.find((c: any) => c.phone === current.phone) || existingCustomers.results[0];
      if (targetCustomer.spam === 1) {
        statements.push(db.prepare(`
          UPDATE Customers 
          SET spam = 0, spam_reason = NULL, add_spam_by = NULL, add_spam_at = NULL, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).bind(targetCustomer.id));
      }
    }

    const results = await db.batch(statements);

    if (results[0].meta.changes === 0) {
      throw new Error('OPTIMISTIC_LOCK_FAIL');
    }

    await InboxService._unblockContact(k1, current.phone as string, current.email as string);
    await InboxService._bumpInboxVersion(db, k1);
    return { success: true };
  },

  /**
   * Converts an inquiry into a Customer and optionally creates a Booking.
   * Uses D1 atomic batching to ensure both Customer and Booking are created simultaneously or fail together.
   * 
   * @param db - The D1 Database instance.
   */
  markAsConverted: async (db: D1Database, k1: KVNamespace, id: string, userId: string) => {
    const current = await db.prepare('SELECT full_name, status, phone, email, inquiry_type, metadata FROM Inbox WHERE id = ?').bind(id).first();
    if (!current) throw new Error('Message not found');
    if (current.status === 'converted') return { success: true };
    if (current.status === 'spam') throw new Error('CANNOT_CONVERT_SPAM');

    // Prepare batch statements for atomicity
    const statements = [];
    let customerId = '';

    // 1. Check existing customer
    let customerQuery = 'SELECT id, spam FROM Customers WHERE phone = ?';
    const customerParams: any[] = [current.phone];
    if (current.email) {
      customerQuery += ' OR email = ?';
      customerParams.push(current.email);
    }
    const existingCustomers = await db.prepare(customerQuery).bind(...customerParams).all();

    if (existingCustomers.results.length === 0) {
      customerId = crypto.randomUUID();
      statements.push(db.prepare(`
        INSERT INTO Customers (id, full_name, phone, email, acquisition_source, spam) 
        VALUES (?, ?, ?, ?, 'inbox', 0)
      `).bind(customerId, current.full_name as string, current.phone as string, (current.email as string) || null));
    } else {
      const targetCustomer = existingCustomers.results.find((c: any) => c.phone === current.phone) || existingCustomers.results[0];
      if (targetCustomer.spam === 1) throw new Error('CUSTOMER_IS_SPAMMED');
      
      customerId = targetCustomer.id as string;
    // SECURITY: Removed the UPDATE statement here to prevent data overwrite vulnerability.
    // Unauthenticated users could spoof emails to overwrite existing verified customer profiles.
    }

    // 2. Create Booking if type is service
    if (current.inquiry_type === 'service' && current.metadata) {
      const metadata = typeof current.metadata === 'string' ? JSON.parse(current.metadata) : current.metadata;
      if (metadata && metadata.name && metadata.price) {
        const bookingId = crypto.randomUUID();
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let bookingNumber = 'BK-';
        for (let i = 0; i < 6; i++) {
          bookingNumber += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const totalCost = Math.round(((metadata.price || 0) - (metadata.discount || 0) + Number.EPSILON) * 100) / 100;
        const servicesData = JSON.stringify([{
          service_id: metadata.service_id,
          name: metadata.name,
          price: metadata.price,
          description: metadata.description || '',
          discount: metadata.discount || 0
        }]);

        statements.push(db.prepare(`
          INSERT INTO Bookings (id, booking_number, customer_id, services_data, status, created_by, total_paid)
          VALUES (?, ?, ?, ?, 'pending', ?, ?)
        `).bind(bookingId, bookingNumber, customerId, servicesData, userId, totalCost));
      }
    }

    // 3. Update Inbox Message
    statements.push(db.prepare(`
      UPDATE Inbox 
      SET status = 'converted', converted_at = CURRENT_TIMESTAMP, converted_by = ?, 
          add_to_spam_at = NULL, add_to_spam_by = NULL, spam_reason = NULL 
      WHERE id = ? AND status = ?
    `).bind(userId, id, current.status));

    // Execute Transaction
    const results = await db.batch(statements);
    
    // The Inbox update is the last statement
    if (results[results.length - 1].meta.changes === 0) {
      throw new Error('OPTIMISTIC_LOCK_FAIL');
    }

    if (current.status === 'spam') await InboxService._unblockContact(k1, current.phone as string, current.email as string);
    await InboxService._bumpInboxVersion(db, k1);
    return { success: true };
  },

  /**
   * Creates a Customer profile without a booking, used for general inquiries.
   * 
   * @param db - The D1 Database instance.
   */
  createProfileOnly: async (db: D1Database, k1: KVNamespace, id: string, userId: string) => {
    const current = await db.prepare('SELECT full_name, status, phone, email, inquiry_type FROM Inbox WHERE id = ?').bind(id).first();
    if (!current) throw new Error('Message not found');
    if (current.status === 'profile_created') return { success: true };
    if (current.status === 'spam') throw new Error('CANNOT_CONVERT_SPAM');
    if (current.inquiry_type !== 'general') throw new Error('ONLY_GENERAL_CAN_BE_PROFILE');

    const statements = [];

    // 1. Check existing customer
    let customerQuery = 'SELECT id, spam FROM Customers WHERE phone = ?';
    const customerParams: any[] = [current.phone];
    if (current.email) {
      customerQuery += ' OR email = ?';
      customerParams.push(current.email);
    }
    const existingCustomers = await db.prepare(customerQuery).bind(...customerParams).all();

    if (existingCustomers.results.length === 0) {
      const customerId = crypto.randomUUID();
      statements.push(db.prepare(`
        INSERT INTO Customers (id, full_name, phone, email, acquisition_source, spam) 
        VALUES (?, ?, ?, ?, 'inbox', 0)
      `).bind(customerId, current.full_name as string, current.phone as string, (current.email as string) || null));
    } else {
      const targetCustomer = existingCustomers.results.find((c: any) => c.phone === current.phone) || existingCustomers.results[0];
      if (targetCustomer.spam === 1) throw new Error('CUSTOMER_IS_SPAMMED');
    }

    // 2. Update Inbox Message
    statements.push(db.prepare(`
      UPDATE Inbox 
      SET status = 'profile_created', profile_created_at = CURRENT_TIMESTAMP, profile_created_by = ?, 
          add_to_spam_at = NULL, add_to_spam_by = NULL, spam_reason = NULL 
      WHERE id = ? AND status = ?
    `).bind(userId, id, current.status));

    const results = await db.batch(statements);
    
    if (results[results.length - 1].meta.changes === 0) {
      throw new Error('OPTIMISTIC_LOCK_FAIL');
    }

    if (current.status === 'spam') await InboxService._unblockContact(k1, current.phone as string, current.email as string);
    await InboxService._bumpInboxVersion(db, k1);
    return { success: true };
  },

  /**
   * Marks a message as spam, adds the contact to the shadow ban list in KV.
   * 
   * @param db - The D1 Database instance.
   */
  markAsSpam: async (db: D1Database, k1: KVNamespace, id: string, userId: string, spamReason?: string) => {
    const current = await db.prepare('SELECT status, phone, email, full_name FROM Inbox WHERE id = ?').bind(id).first();
    if (!current) throw new Error('Message not found');
    if (current.status === 'spam') return { success: true };
    if (current.status === 'converted') throw new Error('CANNOT_SPAM_CONVERTED');

    // 1. Check if customer profile exists for this phone or email
    let customerQuery = 'SELECT id FROM Customers WHERE phone = ?';
    const customerParams: any[] = [current.phone];
    if (current.email) {
      customerQuery += ' OR email = ?';
      customerParams.push(current.email);
    }
    const existingCustomers = await db.prepare(customerQuery).bind(...customerParams).all();

    const statements = [];

    // 2. Update Inbox Message
    statements.push(db.prepare(`
      UPDATE Inbox 
      SET status = 'spam', add_to_spam_at = CURRENT_TIMESTAMP, add_to_spam_by = ?, 
          converted_at = NULL, converted_by = NULL, spam_reason = ? 
      WHERE id = ? AND status = ?
    `).bind(userId, spamReason || null, id, current.status));

    // 3. Create or update Customer Profile to spam status
    if (existingCustomers.results.length === 0) {
      const customerId = crypto.randomUUID();
      statements.push(db.prepare(`
        INSERT INTO Customers (
          id, full_name, phone, email, acquisition_source, spam, spam_reason, add_spam_by, add_spam_at
        ) VALUES (?, ?, ?, ?, 'inbox', 1, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        customerId, 
        current.full_name as string, 
        current.phone as string, 
        (current.email as string) || null,
        spamReason || null,
        userId
      ));
    } else {
      const targetCustomer = existingCustomers.results.find((c: any) => c.phone === current.phone) || existingCustomers.results[0];
      statements.push(db.prepare(`
        UPDATE Customers 
        SET spam = 1, spam_reason = ?, add_spam_by = ?, add_spam_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).bind(spamReason || null, userId, targetCustomer.id));
    }

    // Execute batch transaction
    const results = await db.batch(statements);

    if (results[0].meta.changes === 0) {
      throw new Error('OPTIMISTIC_LOCK_FAIL');
    }

    await InboxService._blockContact(k1, current.phone as string, current.email as string);
    await InboxService._bumpInboxVersion(db, k1);
    return { success: true };
  },

  /**
   * Permanently deletes a message from the database.
   * 
   * @param db - The D1 Database instance.
   */
  deleteMessage: async (db: D1Database, k1: KVNamespace, id: string) => {
    const current = await db.prepare('SELECT status FROM Inbox WHERE id = ?').bind(id).first();
    if (current) {
      const result = await db.prepare('DELETE FROM Inbox WHERE id = ? AND status = ?').bind(id, current.status).run();
      if (result.meta.changes === 0) {
        throw new Error('OPTIMISTIC_LOCK_FAIL');
      }
      await InboxService._bumpInboxVersion(db, k1);
    }
    return { success: true };
  },

  /**
   * Gets the total number of unread messages for admin badges.
   * 
   * @param db - The D1 Database instance.
   */
  getUnreadCount: async (db: D1Database, k1: KVNamespace) => {
    const result = await db.prepare("SELECT COUNT(*) as total FROM Inbox WHERE status = 'unread'").first();
    return (result?.total as number) || 0;
  },

  /**
   * Performs the _block Contact operation.
   * 
   * @param db - The D1 Database instance.
   */
  _blockContact: async (k1: KVNamespace, phone?: string, email?: string) => {
    const k1Ref = k1 || (globalThis as any).auradash_kv;
    if (!k1Ref) return;
    const [isBlockedPhone, isBlockedEmail] = await Promise.all([
      phone ? k1Ref.get(`spam:phone:${phone}`) : Promise.resolve(null),
      email ? k1Ref.get(`spam:email:${email}`) : Promise.resolve(null)
    ]);
    const promises = [];
    if (phone && !isBlockedPhone) promises.push(k1Ref.put(`spam:phone:${phone}`, '1'));
    if (email && !isBlockedEmail) promises.push(k1Ref.put(`spam:email:${email}`, '1'));
    if (promises.length > 0) await Promise.all(promises);
  },

  /**
   * Performs the _unblock Contact operation.
   * 
   * @param db - The D1 Database instance.
   */
  _unblockContact: async (k1: KVNamespace, phone?: string, email?: string) => {
    const k1Ref = k1 || (globalThis as any).auradash_kv;
    if (!k1Ref) return;
    const [isBlockedPhone, isBlockedEmail] = await Promise.all([
      phone ? k1Ref.get(`spam:phone:${phone}`) : Promise.resolve(null),
      email ? k1Ref.get(`spam:email:${email}`) : Promise.resolve(null)
    ]);
    const promises = [];
    if (phone && isBlockedPhone) promises.push(k1Ref.delete(`spam:phone:${phone}`));
    if (email && isBlockedEmail) promises.push(k1Ref.delete(`spam:email:${email}`));
    if (promises.length > 0) await Promise.all(promises);
  },

  /**
   * Internal helper to trigger a frontend badge refresh by updating the meta-cache state.
   * 
   * @param db - The D1 Database instance.
   */
  _bumpInboxVersion: async (db: D1Database, k1: KVNamespace) => {
    const k1Ref = k1 || (globalThis as any).auradash_kv;
    if (!k1Ref) return;
    try {
      const users = await db.prepare("SELECT id, role, permissions FROM Users WHERE is_banned = 0").all();
      const userIds: string[] = [];
      for (const u of users.results) {
        if (u.role === 'Admin') {
          userIds.push(u.id as string);
        } else if (u.permissions) {
          try {
            const perms = JSON.parse(u.permissions as string);
            if (perms.inbox === true || (perms.cms && perms.cms.inbox === true)) {
              userIds.push(u.id as string);
            }
          } catch {}
        }
      }
      
      const updatePromises = userIds.map(async (uid: string) => {
        const stateKey = `state_version:${uid}`;
        let state: any = {};
        const existingState = await k1Ref.get(stateKey);
        if (existingState) {
          try { state = JSON.parse(existingState); } catch {}
        }
        state.notifications_version = 'v' + crypto.randomUUID().slice(0, 8);
        await k1Ref.put(stateKey, JSON.stringify(state));
      });
      await Promise.all(updatePromises);
    } catch (e) {
      logger.error('system', 'Failed to bump state versions for inbox:', e);
    }
  },

  /**
   * Performs the Get Message By Id operation.
   * 
   * @param db - The D1 Database instance.
   */
  getMessageById: async (db: D1Database, id: string) => {
    return db.prepare('SELECT status, phone, email, full_name, inquiry_type, metadata FROM Inbox WHERE id = ?').bind(id).first() as Promise<{ status: string; phone?: string; email?: string } | null>;
  }
};
