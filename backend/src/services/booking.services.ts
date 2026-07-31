/**
 * ==========================================
 *        AuraDash Booking Services
 * ==========================================
 * 
 * Business logic layer for managing Booking operations.
 */

import { D1Database } from '@cloudflare/workers-types';
import { CreateBookingDTO, UpdateBookingDTO, ChangeBookingStatusDTO } from '../validators/booking.validators';
import { escapeLikePattern } from '../utils/sanitize';

export const BookingService = {
  /**
   * Performs the Get Bookings operation.
   * 
   * @param db - The D1 Database instance.
   */
  getBookings: async (db: D1Database, page: number = 1, limit: number = 10, status?: string, search?: string) => {
    const offset = (page - 1) * limit;
    
    let whereClauses = ' WHERE 1=1';
    const params: any[] = [];

    if (status) {
      whereClauses += ` AND b.status = ?`;
      params.push(status);
    }

    if (search) {
      whereClauses += ` AND (c.full_name LIKE ? ESCAPE '\\' OR c.phone LIKE ? ESCAPE '\\' OR c.email LIKE ? ESCAPE '\\' OR b.booking_number LIKE ? ESCAPE '\\')`;
      const searchParam = `%${escapeLikePattern(search)}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM Bookings b
      LEFT JOIN Customers c ON b.customer_id = c.id
      ${whereClauses}
    `;

    const query = `
      SELECT 
        b.id, b.booking_number, b.customer_id, b.created_by, b.scheduled_from, b.scheduled_to, b.services_data, b.status, b.notes, 
        b.paid_status, b.paid_amount, b.total_paid, b.payment_history, b.created_at, b.updated_at, b.completed_at, b.cancelled_at, b.cancellation_reason,
        c.full_name as customer_name, c.phone as customer_phone, c.email as customer_email,
        u_creator.full_name as created_by_name,
        u_updater.full_name as updated_by_name,
        u_completer.full_name as completed_by_name,
        u_canceller.full_name as cancelled_by_name
      FROM Bookings b
      LEFT JOIN Customers c ON b.customer_id = c.id
      LEFT JOIN Users u_creator ON b.created_by = u_creator.id
      LEFT JOIN Users u_updater ON b.updated_by = u_updater.id
      LEFT JOIN Users u_completer ON b.completed_by = u_completer.id
      LEFT JOIN Users u_canceller ON b.cancelled_by = u_canceller.id
      ${whereClauses}
      ORDER BY b.created_at DESC
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
      data: data.results.map((row: any) => ({
        ...row,
        booking_number: row.booking_number || `BK-${row.id.substring(0, 6).toUpperCase()}`,
        services_data: row.services_data ? JSON.parse(row.services_data as string) : [],
        payment_history: row.payment_history ? JSON.parse(row.payment_history as string) : []
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  },

  /**
   * Performs the Get Booking By Id operation.
   * 
   * @param db - The D1 Database instance.
   */
  getBookingById: async (db: D1Database, id: string) => {
    const booking = await db.prepare(`
      SELECT 
        b.id, b.booking_number, b.customer_id, b.created_by, b.scheduled_from, b.scheduled_to, b.services_data, b.status, b.notes, 
        b.paid_status, b.paid_amount, b.total_paid, b.payment_history, b.created_at, b.updated_at, b.completed_at, b.cancelled_at, b.cancellation_reason,
        c.full_name as customer_name, c.phone as customer_phone, c.email as customer_email,
        u_creator.full_name as created_by_name,
        u_updater.full_name as updated_by_name,
        u_completer.full_name as completed_by_name,
        u_canceller.full_name as cancelled_by_name
      FROM Bookings b
      LEFT JOIN Customers c ON b.customer_id = c.id
      LEFT JOIN Users u_creator ON b.created_by = u_creator.id
      LEFT JOIN Users u_updater ON b.updated_by = u_updater.id
      LEFT JOIN Users u_completer ON b.completed_by = u_completer.id
      LEFT JOIN Users u_canceller ON b.cancelled_by = u_canceller.id
      WHERE b.id = ?
    `).bind(id).first() as any;

    if (!booking) throw new Error('BOOKING_NOT_FOUND');

    const paymentHistory = booking.payment_history ? JSON.parse(booking.payment_history) : [];
    
    if (paymentHistory.length > 0) {
      const userIds = [...new Set(paymentHistory.map((x: any) => x.added_by).filter(Boolean))];
      if (userIds.length > 0) {
        const placeholders = userIds.map(() => '?').join(',');
        const users = await db.prepare(`SELECT id, full_name FROM Users WHERE id IN (${placeholders})`).bind(...userIds).all();
        const userMap = new Map(users.results.map((u: any) => [u.id, u.full_name]));
        paymentHistory.forEach((item: any) => {
          item.added_by_name = userMap.get(item.added_by) || 'System';
        });
      }
    }

    return {
      ...booking,
      booking_number: booking.booking_number || `BK-${(booking.id as string).substring(0, 6).toUpperCase()}`,
      services_data: booking.services_data ? JSON.parse(booking.services_data) : [],
      payment_history: paymentHistory
    };
  },

  /**
   * Performs the Create Booking operation.
   * 
   * @param db - The D1 Database instance.
   */
  createBooking: async (db: D1Database, data: CreateBookingDTO, createdBy: string) => {
    // 1. Check if customer exists and is not banned
    const customer = await db.prepare('SELECT spam FROM Customers WHERE id = ?').bind(data.customer_id).first() as any;
    if (!customer) throw new Error('CUSTOMER_NOT_FOUND');
    if (customer.spam === 1) throw new Error('CUSTOMER_IS_SPAMMED');

    // 2. Resolve services data
    const resolvedServices = [];
    const serviceIds = [...new Set(data.services_data.map(s => s.service_id).filter(Boolean))] as string[];
    const servicesMap = new Map<string, any>();
    if (serviceIds.length > 0) {
      const placeholders = serviceIds.map(() => '?').join(',');
      const { results } = await db.prepare(`SELECT id, meta_data FROM Services WHERE id IN (${placeholders}) AND is_active = 1`)
        .bind(...serviceIds)
        .all();
      if (results) {
        for (const row of results as any[]) {
          servicesMap.set(row.id, row.meta_data);
        }
      }
    }

    for (const srv of data.services_data) {
      if (srv.service_id) {
        const serviceMetaData = servicesMap.get(srv.service_id);
        if (serviceMetaData === undefined) throw new Error('SERVICE_NOT_FOUND');

        const metaDataArr = serviceMetaData ? (typeof serviceMetaData === 'string' ? JSON.parse(serviceMetaData) : serviceMetaData) : [];
        
        const getFieldValue = (field: any): string | null => {
          if (!field) return null;
          if (field.data && typeof field.data === 'object' && !Array.isArray(field.data)) {
            return field.data.text ?? field.data.value ?? field.data.url ?? null;
          }
          return field.value ?? field.data ?? null;
        };

        const nameField = metaDataArr.find((f: any) => f.label === 'name' || f.id === 'name');
        const priceField = metaDataArr.find((f: any) => f.label === 'price' || f.id === 'price');
        const discountField = metaDataArr.find((f: any) => f.label === 'discount' || f.id === 'discount');

        const name = getFieldValue(nameField);
        const price = getFieldValue(priceField);
        const discount = getFieldValue(discountField);

        if (!name || price === undefined || price === null || price === "") {
          throw new Error('SERVICE_MISSING_DATA');
        }

        resolvedServices.push({
          name,
          price: Math.round((Number(price) + Number.EPSILON) * 100) / 100,
          discount: discount ? Math.round((Number(discount) + Number.EPSILON) * 100) / 100 : 0
        });
      } else {
        resolvedServices.push({
          name: srv.name,
          price: srv.price ? Math.round((Number(srv.price) + Number.EPSILON) * 100) / 100 : 0,
          discount: srv.discount ? Math.round((Number(srv.discount) + Number.EPSILON) * 100) / 100 : 0
        });
      }
    }

    const generateBookingNumber = () => {
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let code = 'BK-';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    const bookingNumber = generateBookingNumber();

    const id = crypto.randomUUID();
    const servicesJson = JSON.stringify(resolvedServices);

    const totalCost = Math.round((resolvedServices.reduce((acc, srv) => acc + ((srv.price || 0) - (srv.discount || 0)), 0) + Number.EPSILON) * 100) / 100;
    try {
      await db.prepare(`
        INSERT INTO Bookings (
          id, booking_number, customer_id, scheduled_from, scheduled_to, services_data, status, notes, created_by, total_paid
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
      `).bind(
        id, bookingNumber, data.customer_id, data.scheduled_from, data.scheduled_to, servicesJson, data.notes || null, createdBy, totalCost
      ).run();

      return await BookingService.getBookingById(db, id);
    } catch (error: any) {
      if (error.message && error.message.includes('FOREIGN KEY')) {
        throw new Error('CUSTOMER_NOT_FOUND');
      }
      throw error;
    }
  },

  /**
   * Performs the Update Booking operation.
   * 
   * @param db - The D1 Database instance.
   */
  updateBooking: async (db: D1Database, id: string, data: UpdateBookingDTO, updatedBy: string, userRole: string) => {
    const booking = await db.prepare('SELECT status, total_paid, paid_amount, payment_history FROM Bookings WHERE id = ?').bind(id).first() as any;
    if (!booking) throw new Error('BOOKING_NOT_FOUND');

    // Lock check: Completed, cancelled, or in-progress bookings cannot be modified
    if (booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'in_progress') {
      throw new Error('BOOKING_LOCKED');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (data.services_data !== undefined) {
      const resolvedServices = [];
      const serviceIds = [...new Set(data.services_data.map(s => s.service_id).filter(Boolean))] as string[];
      const servicesMap = new Map<string, any>();
      if (serviceIds.length > 0) {
        const placeholders = serviceIds.map(() => '?').join(',');
        const { results } = await db.prepare(`SELECT id, meta_data FROM Services WHERE id IN (${placeholders}) AND is_active = 1`)
          .bind(...serviceIds)
          .all();
        if (results) {
          for (const row of results as any[]) {
            servicesMap.set(row.id, row.meta_data);
          }
        }
      }

      for (const srv of data.services_data) {
        if (srv.service_id) {
          const serviceMetaData = servicesMap.get(srv.service_id);
          if (serviceMetaData === undefined) throw new Error('SERVICE_NOT_FOUND');

          const metaDataArr = serviceMetaData ? (typeof serviceMetaData === 'string' ? JSON.parse(serviceMetaData) : serviceMetaData) : [];
          
          const getFieldValue = (field: any): string | null => {
            if (!field) return null;
            if (field.data && typeof field.data === 'object' && !Array.isArray(field.data)) {
              return field.data.text ?? field.data.value ?? field.data.url ?? null;
            }
            return field.value ?? field.data ?? null;
          };

          const nameField = metaDataArr.find((f: any) => f.label === 'name' || f.id === 'name');
          const priceField = metaDataArr.find((f: any) => f.label === 'price' || f.id === 'price');
          const discountField = metaDataArr.find((f: any) => f.label === 'discount' || f.id === 'discount');

          const name = getFieldValue(nameField);
          const price = getFieldValue(priceField);
          const discount = getFieldValue(discountField);

          if (!name || price === undefined || price === null || price === "") {
            throw new Error('SERVICE_MISSING_DATA');
          }

          resolvedServices.push({
            name,
            price: Math.round((Number(price) + Number.EPSILON) * 100) / 100,
            discount: discount ? Math.round((Number(discount) + Number.EPSILON) * 100) / 100 : 0
          });
        } else {
          resolvedServices.push({
            name: srv.name,
            price: srv.price ? Math.round((Number(srv.price) + Number.EPSILON) * 100) / 100 : 0,
            discount: srv.discount ? Math.round((Number(srv.discount) + Number.EPSILON) * 100) / 100 : 0
          });
        }
      }

      updates.push('services_data = ?');
      params.push(JSON.stringify(resolvedServices));

      const totalCost = Math.round((resolvedServices.reduce((acc, srv) => acc + ((srv.price || 0) - (srv.discount || 0)), 0) + Number.EPSILON) * 100) / 100;
      updates.push('total_paid = ?');
      params.push(totalCost);
      booking.total_paid = totalCost; // Update local reference for later validation
    }
    
    if (data.scheduled_from !== undefined) {
      updates.push('scheduled_from = ?');
      params.push(data.scheduled_from);
    }
    if (data.scheduled_to !== undefined) {
      updates.push('scheduled_to = ?');
      params.push(data.scheduled_to);
    }

    // Determine paid_amount & total_paid to use for status check
    const currentPaidAmount = data.paid_amount !== undefined ? Math.round((data.paid_amount + Number.EPSILON) * 100) / 100 : (booking.paid_amount || 0);
    
    // Validate if paid_amount exceeds total_paid
    if (currentPaidAmount > booking.total_paid) {
      throw new Error('PAID_AMOUNT_EXCEEDS_TOTAL');
    }

    if (data.paid_amount !== undefined) {
      const roundedPaid = currentPaidAmount;
      if (roundedPaid < 0) throw new Error('PAID_AMOUNT_NEGATIVE');
      
      updates.push('paid_amount = ?');
      params.push(roundedPaid);

      if (roundedPaid !== (booking.paid_amount || 0)) {
        const diff = Math.round((roundedPaid - (booking.paid_amount || 0) + Number.EPSILON) * 100) / 100;
        const history = booking.payment_history ? JSON.parse(booking.payment_history) : [];
        history.push({
          date: new Date().toISOString(),
          amount: diff,
          added_by: updatedBy,
          notes: 'Adjustment via Edit Booking'
        });
        updates.push('payment_history = ?');
        params.push(JSON.stringify(history));
      }
    }

    let calculatedPaidStatus = data.paid_status;
    if (calculatedPaidStatus === undefined) {
      // If either paid_amount or services_data (total_paid) changed, recalculate paid_status
      if (data.paid_amount !== undefined || data.services_data !== undefined) {
        if (currentPaidAmount === booking.total_paid) {
          calculatedPaidStatus = 'paid';
        } else if (currentPaidAmount > 0) {
          calculatedPaidStatus = 'partial';
        } else {
          calculatedPaidStatus = 'unpaid';
        }
      }
    }

    if (calculatedPaidStatus !== undefined) {
      updates.push('paid_status = ?');
      params.push(calculatedPaidStatus);
    }

    if (data.notes !== undefined) {
      updates.push('notes = ?');
      params.push(data.notes);
    }

    if (updates.length === 0) return;

    updates.push('updated_by = ?');
    params.push(updatedBy);

    updates.push("updated_at = CURRENT_TIMESTAMP");

    const query = `UPDATE Bookings SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    await db.prepare(query).bind(...params).run();
  },

  /**
   * Performs the Change Status operation.
   * 
   * @param db - The D1 Database instance.
   */
  changeStatus: async (db: D1Database, id: string, data: ChangeBookingStatusDTO, userId: string, userRole: string) => {
    const booking = await db.prepare('SELECT status FROM Bookings WHERE id = ?').bind(id).first() as any;
    if (!booking) throw new Error('BOOKING_NOT_FOUND');

    // Lock check: Completed or Cancelled bookings cannot be modified
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      throw new Error('BOOKING_LOCKED');
    }

    const newStatus = data.status;
    let query = '';
    const params: any[] = [];

    if (newStatus === 'completed') {
      query = `UPDATE Bookings SET status = 'completed', completed_by = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?`;
      params.push(userId, id);
    } else if (newStatus === 'cancelled') {
      query = `UPDATE Bookings SET status = 'cancelled', cancelled_by = ?, cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = ? WHERE id = ?`;
      params.push(userId, data.cancellation_reason, id);
    } else {
      query = `UPDATE Bookings SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      params.push(newStatus, userId, id);
    }

    await db.prepare(query).bind(...params).run();
  },

  /**
   * Performs the Record Payment operation.
   * 
   * @param db - The D1 Database instance.
   */
  recordPayment: async (db: D1Database, id: string, data: { amount: number; notes?: string }, userId: string) => {
    const booking = await db.prepare(`
      SELECT paid_amount, total_paid, payment_history, status FROM Bookings WHERE id = ?
    `).bind(id).first() as any;

    if (!booking) throw new Error('BOOKING_NOT_FOUND');

    const amount = Math.round((data.amount + Number.EPSILON) * 100) / 100;
    if (amount <= 0) throw new Error('PAID_AMOUNT_NEGATIVE');
    
    const newPaidAmount = Math.round((booking.paid_amount + amount + Number.EPSILON) * 100) / 100;
    if (newPaidAmount > booking.total_paid) {
      throw new Error('PAID_AMOUNT_EXCEEDS_TOTAL');
    }

    const paymentHistory = booking.payment_history ? JSON.parse(booking.payment_history) : [];
    paymentHistory.push({
      date: new Date().toISOString(),
      amount: amount,
      added_by: userId,
      notes: data.notes || ''
    });

    let paidStatus = 'unpaid';
    if (newPaidAmount === booking.total_paid) {
      paidStatus = 'paid';
    } else if (newPaidAmount > 0) {
      paidStatus = 'partial';
    }

    await db.prepare(`
      UPDATE Bookings 
      SET paid_amount = ?, paid_status = ?, payment_history = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(newPaidAmount, paidStatus, JSON.stringify(paymentHistory), userId, id).run();

    return {
      paid_amount: newPaidAmount,
      paid_status: paidStatus,
      payment_history: paymentHistory
    };
  },

  /**
   * Performs the Delete Booking operation.
   * 
   * @param db - The D1 Database instance.
   */
  deleteBooking: async (db: D1Database, id: string) => {
    const booking = await db.prepare('SELECT status FROM Bookings WHERE id = ?').bind(id).first() as any;
    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }
    if (booking.status !== 'cancelled') {
      throw new Error('ONLY_CANCELLED_BOOKINGS_CAN_BE_DELETED');
    }
    await db.prepare('DELETE FROM Bookings WHERE id = ?').bind(id).run();
  }
};
