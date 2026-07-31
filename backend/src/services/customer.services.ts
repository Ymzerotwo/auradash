/**
 * ==========================================
 *        AuraDash Customer Services
 * ==========================================
 * 
 * Business logic layer for managing Customer operations.
 */

import { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { CreateCustomerDTO, UpdateCustomerDTO } from '../validators/customer.validators';
import { escapeLikePattern } from '../utils/sanitize';

export const CustomerService = {
  /**
   * Performs the Get Customers operation.
   * 
   * @param db - The D1 Database instance.
   */
  getCustomers: async (db: D1Database, userRole: string, page: number = 1, limit: number = 10, search?: string, isSpam: boolean = false) => {
    const offset = (page - 1) * limit;
    
    let whereClauses = ' WHERE c.spam = ?';
    const params: any[] = [isSpam ? 1 : 0];

    if (search) {
      whereClauses += ` AND (c.full_name LIKE ? ESCAPE '\\' OR c.phone LIKE ? ESCAPE '\\' OR c.email LIKE ? ESCAPE '\\')`;
      const searchParam = `%${escapeLikePattern(search)}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM Customers c
      ${whereClauses}
    `;

    const query = `
      SELECT 
        c.id, c.full_name, c.phone, c.email, c.gender, c.date_of_birth, c.city, 
        c.acquisition_source, c.tags, c.notes, c.spam, c.spam_reason, c.add_spam_at,
        c.created_at, c.updated_at, c.last_visit_at,
        u_spam.full_name as add_spam_by_name,
        u_creator.full_name as created_by_name,
        u_updater.full_name as updated_by_name
      FROM Customers c
      LEFT JOIN Users u_spam ON c.add_spam_by = u_spam.id
      LEFT JOIN Users u_creator ON c.created_by = u_creator.id
      LEFT JOIN Users u_updater ON c.updated_by = u_updater.id
      ${whereClauses}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countParams = [...params];
    const queryParams = [...params, limit, offset];
    
    const [data, countResult] = await Promise.all([
      db.prepare(query).bind(...queryParams).all(),
      db.prepare(countQuery).bind(...countParams).first()
    ]);

    const total = (countResult as any)?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.results.map((row: any) => {
        const customer = {
          ...row,
          spam: Boolean(row.spam),
          tags: row.tags ? JSON.parse(row.tags as string) : []
        };
        if (userRole !== 'Admin') {
          delete customer.spam_reason;
          delete customer.add_spam_by_name;
          delete customer.add_spam_at;
        }
        return customer;
      }),
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  },

  /**
   * Performs the Get Customer Stats operation.
   * 
   * @param db - The D1 Database instance.
   */
  getCustomerStats: async (db: D1Database) => {
    const result = await db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN spam = 1 THEN 1 ELSE 0 END) as spammed,
        SUM(CASE WHEN spam = 0 THEN 1 ELSE 0 END) as active
      FROM Customers
    `).first() as any;
    
    return {
      total: Number(result?.total || 0),
      spammed: Number(result?.spammed || 0),
      active: Number(result?.active || 0)
    };
  },

  /**
   * Performs the Get Customer By Id operation.
   * 
   * @param db - The D1 Database instance.
   */
  getCustomerById: async (db: D1Database, id: string, userRole: string) => {
    const customer = await db.prepare(`
      SELECT 
        c.id, c.full_name, c.phone, c.email, c.gender, c.date_of_birth, c.city, 
        c.acquisition_source, c.tags, c.notes, c.spam, c.spam_reason, c.add_spam_at,
        c.created_at, c.updated_at, c.last_visit_at,
        u_spam.full_name as add_spam_by_name,
        u_creator.full_name as created_by_name,
        u_updater.full_name as updated_by_name
      FROM Customers c
      LEFT JOIN Users u_spam ON c.add_spam_by = u_spam.id
      LEFT JOIN Users u_creator ON c.created_by = u_creator.id
      LEFT JOIN Users u_updater ON c.updated_by = u_updater.id
      WHERE c.id = ?
    `).bind(id).first() as any;
    if (!customer) throw new Error('CUSTOMER_NOT_FOUND');
    
    const result = {
      ...customer,
      spam: Boolean(customer.spam),
      tags: customer.tags ? JSON.parse(customer.tags as string) : []
    };

    if (userRole !== 'Admin') {
      delete (result as any).spam_reason;
      delete (result as any).add_spam_by_name;
      delete (result as any).add_spam_at;
    }

    // Fetch customer bookings (with services details)
    const bookingsResult = await db.prepare(`
      SELECT 
        b.id, b.booking_number, b.scheduled_from, b.scheduled_to, b.services_data, b.status, 
        b.paid_status, b.paid_amount, b.total_paid, b.created_at
      FROM Bookings b
      WHERE b.customer_id = ?
      ORDER BY b.created_at DESC
    `).bind(id).all();
    
    const bookings = bookingsResult.results.map((row: any) => ({
      ...row,
      services_data: row.services_data ? JSON.parse(row.services_data as string) : []
    }));

    // Fetch customer comments by email if email is present
    let comments: any[] = [];
    if (customer.email) {
      const commentsResult = await db.prepare(`
        SELECT 
          c.id, c.article_id, c.content, c.status, c.created_at,
          a.title as article_title
        FROM Article_Comments c
        JOIN Articles a ON c.article_id = a.id
        WHERE c.user_email = ?
        ORDER BY c.created_at DESC
      `).bind(customer.email).all();
      comments = commentsResult.results;
    }

    return {
      ...result,
      bookings,
      comments
    };
  },

  /**
   * Performs the Create Customer operation.
   * 
   * @param db - The D1 Database instance.
   * @param data - The CreateCustomerDTO instance.
   * @param userId - Optional ID of the user performing the creation.
   */
  createCustomer: async (db: D1Database, data: CreateCustomerDTO, userId?: string) => {
    const id = crypto.randomUUID();
    const tagsJson = data.tags ? JSON.stringify(data.tags) : null;

    try {
      await db.prepare(`
        INSERT INTO Customers (
          id, full_name, phone, email, gender, date_of_birth, city, 
          acquisition_source, tags, notes, spam, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).bind(
        id, data.full_name, data.phone, data.email || null, data.gender || null,
        data.date_of_birth || null, data.city || null, data.acquisition_source || null,
        tagsJson, data.notes || null, userId || null, userId || null
      ).run();

      return { id };
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed: Customers.phone')) {
        throw new Error('PHONE_ALREADY_EXISTS');
      }
      if (error.message.includes('UNIQUE constraint failed: Customers.email')) {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
      throw error;
    }
  },

  /**
   * Performs the Update Customer operation.
   * 
   * @param db - The D1 Database instance.
   * @param id - The customer ID.
   * @param data - The UpdateCustomerDTO instance.
   * @param userId - Optional ID of the user performing the update.
   */
  updateCustomer: async (db: D1Database, id: string, data: UpdateCustomerDTO, userId?: string) => {
    const customer = await db.prepare('SELECT id FROM Customers WHERE id = ?').bind(id).first();
    if (!customer) throw new Error('CUSTOMER_NOT_FOUND');

    const updates: string[] = [];
    const params: any[] = [];

    const fields = ['full_name', 'phone', 'email', 'gender', 'date_of_birth', 'city', 'acquisition_source', 'notes'];
    fields.forEach(field => {
      if ((data as any)[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push((data as any)[field] || null);
      }
    });

    if (data.tags !== undefined) {
      updates.push('tags = ?');
      params.push(data.tags ? JSON.stringify(data.tags) : null);
    }

    if (userId) {
      updates.push('updated_by = ?');
      params.push(userId);
    }

    if (updates.length === 0) return { success: true };

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    try {
      await db.prepare(`UPDATE Customers SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
      return { success: true };
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed: Customers.phone')) {
        throw new Error('PHONE_ALREADY_EXISTS');
      }
      if (error.message.includes('UNIQUE constraint failed: Customers.email')) {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
      throw error;
    }
  },

  /**
   * Performs the Delete Customer operation.
   * 
   * @param db - The D1 Database instance.
   */
  deleteCustomer: async (db: D1Database, id: string) => {
    const result = await db.prepare('DELETE FROM Customers WHERE id = ?').bind(id).run();
    if (result.meta.changes === 0) throw new Error('CUSTOMER_NOT_FOUND');
    return { success: true };
  },

  /**
   * Performs the Mark As Spam operation.
   * 
   * @param db - The D1 Database instance.
   */
  markAsSpam: async (db: D1Database, k1: KVNamespace, id: string, userId: string, reason: string) => {
    const customer = await db.prepare('SELECT phone, email, spam FROM Customers WHERE id = ?').bind(id).first();
    if (!customer) throw new Error('CUSTOMER_NOT_FOUND');

    if (customer.spam !== 1) {
      const statements = [];
      statements.push(db.prepare(`
        UPDATE Customers 
        SET spam = 1, spam_reason = ?, add_spam_by = ?, add_spam_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).bind(reason, userId, id));

      const results = await db.batch(statements);
      if (results[0].meta.changes === 0) {
        throw new Error('CUSTOMER_NOT_FOUND');
      }
    }
    
    const k1Ref = k1 || (globalThis as any).auradash_kv;
    if (k1Ref) {
      const [isBlockedPhone, isBlockedEmail] = await Promise.all([
        customer.phone ? k1Ref.get(`spam:phone:${customer.phone}`) : Promise.resolve(null),
        customer.email ? k1Ref.get(`spam:email:${customer.email}`) : Promise.resolve(null)
      ]);

      const promises = [];
      if (customer.phone && !isBlockedPhone) promises.push(k1Ref.put(`spam:phone:${customer.phone}`, '1'));
      if (customer.email && !isBlockedEmail) promises.push(k1Ref.put(`spam:email:${customer.email}`, '1'));
      if (promises.length > 0) await Promise.all(promises);
    }

    return { success: true };
  },

  /**
   * Performs the Remove From Spam operation.
   * 
   * @param db - The D1 Database instance.
   */
  removeFromSpam: async (db: D1Database, k1: KVNamespace, id: string) => {
    const customer = await db.prepare('SELECT phone, email, spam FROM Customers WHERE id = ?').bind(id).first();
    if (!customer) throw new Error('CUSTOMER_NOT_FOUND');

    if (customer.spam === 1) {
      const statements = [];
      statements.push(db.prepare(`
        UPDATE Customers 
        SET spam = 0, spam_reason = NULL, add_spam_by = NULL, add_spam_at = NULL, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).bind(id));

      const results = await db.batch(statements);
      if (results[0].meta.changes === 0) {
        throw new Error('CUSTOMER_NOT_FOUND');
      }
    }

    const k1Ref = k1 || (globalThis as any).auradash_kv;
    if (k1Ref) {
      const [isBlockedPhone, isBlockedEmail] = await Promise.all([
        customer.phone ? k1Ref.get(`spam:phone:${customer.phone}`) : Promise.resolve(null),
        customer.email ? k1Ref.get(`spam:email:${customer.email}`) : Promise.resolve(null)
      ]);

      const promises = [];
      if (customer.phone && isBlockedPhone) promises.push(k1Ref.delete(`spam:phone:${customer.phone}`));
      if (customer.email && isBlockedEmail) promises.push(k1Ref.delete(`spam:email:${customer.email}`));
      if (promises.length > 0) await Promise.all(promises);
    }

    return { success: true };
  },

  /**
   * Performs the Upsert Customer From Inbox operation.
   * 
   * @param db - The D1 Database instance.
   */
  upsertCustomerFromInbox: async (db: D1Database, data: { full_name: string; phone: string; email?: string }) => {
    let query = 'SELECT id, phone, email, spam FROM Customers WHERE phone = ?';
    const params: any[] = [data.phone];
    
    if (data.email) {
      query += ' OR email = ?';
      params.push(data.email);
    }
    
    const existing = await db.prepare(query).bind(...params).all();
    
    if (existing.results.length === 0) {
      const id = crypto.randomUUID();
      try {
        await db.prepare(`
          INSERT INTO Customers (
            id, full_name, phone, email, acquisition_source, spam
          ) VALUES (?, ?, ?, ?, 'inbox', 0)
        `).bind(id, data.full_name, data.phone, data.email || null).run();
        return { id };
      } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed: Customers.email')) throw new Error('EMAIL_ALREADY_EXISTS');
        if (error.message.includes('UNIQUE constraint failed: Customers.phone')) throw new Error('PHONE_ALREADY_EXISTS');
        throw error;
      }
    }

    const targetCustomer = existing.results.find((c: any) => c.phone === data.phone) || existing.results[0];
    
    if (targetCustomer.spam === 1) {
      throw new Error('CUSTOMER_IS_SPAMMED');
    }
    
    try {
      await db.prepare(`
        UPDATE Customers 
        SET full_name = ?, phone = ?, email = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(data.full_name, data.phone, data.email || null, targetCustomer.id).run();
      
      return { id: targetCustomer.id as string };
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed: Customers.email')) throw new Error('EMAIL_ALREADY_EXISTS');
      if (error.message.includes('UNIQUE constraint failed: Customers.phone')) throw new Error('PHONE_ALREADY_EXISTS');
      throw error;
    }
  }
};
