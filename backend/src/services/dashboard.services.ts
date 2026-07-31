/**
 * ==========================================
 *        AuraDash Dashboard Services
 * ==========================================
 * 
 * Business logic layer for managing Dashboard operations.
 */

import { D1Database } from '@cloudflare/workers-types';

export interface DashboardStats {
  bookingsCount: number;
  bookingsDiffPercent: number;
  newCommentsCount: number;
  newCommentsDiffPercent: number;
  newInboxMessagesCount: number;
  newInboxMessagesDiffPercent: number;
  totalRevenue: number;
  revenueDiffPercent: number;
  newCustomersCount: number;
  newCustomersDiffPercent: number;
  totalCustomers: number;
}

export interface TimelineEvent {
  id: string;
  type: 'NEW_BOOKING' | 'BOOKING_CONFIRMED' | 'BOOKING_COMPLETED' | 'BOOKING_CANCELLED' | 'NEW_COMMENT' | 'NEW_INBOX_MESSAGE';
  timestamp: string;
  title: string;
  status: string;
}

export const DashboardService = {
  /**
   * Performs the Get Stats operation.
   * 
   * @param db - The D1 Database instance.
   */
  getStats: async (db: D1Database, startDate?: string, endDate?: string): Promise<DashboardStats> => {
    let effectiveStartDate = startDate;
    let effectiveEndDate = endDate;
    
    // Default to today if no date filter is selected
    if (!effectiveStartDate && !effectiveEndDate) {
      effectiveStartDate = new Date().toISOString().substring(0, 10);
      effectiveEndDate = effectiveStartDate;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (effectiveStartDate && !dateRegex.test(effectiveStartDate)) {
      effectiveStartDate = new Date().toISOString().substring(0, 10);
    }
    if (effectiveEndDate && !dateRegex.test(effectiveEndDate)) {
      effectiveEndDate = effectiveStartDate;
    }

    // Current period filter date bounds
    const startDateStr = effectiveStartDate!;
    const endDateStr = effectiveEndDate!;

    const queries: any[] = []; 

    // 1. Current period queries (Indices 0 to 4)
    queries.push(
      db.prepare(`SELECT COUNT(*) as count FROM Bookings WHERE date(created_at) >= ? AND date(created_at) <= ?`).bind(startDateStr, endDateStr),
      db.prepare(`SELECT COUNT(*) as count FROM Article_Comments WHERE date(created_at) >= ? AND date(created_at) <= ?`).bind(startDateStr, endDateStr),
      db.prepare(`SELECT COUNT(*) as count FROM Inbox WHERE date(created_at) >= ? AND date(created_at) <= ?`).bind(startDateStr, endDateStr),
      db.prepare(`SELECT SUM(total_paid) as total FROM Bookings WHERE status != 'cancelled' AND date(created_at) >= ? AND date(created_at) <= ?`).bind(startDateStr, endDateStr),
      db.prepare(`SELECT COUNT(*) as count FROM Customers WHERE date(created_at) >= ? AND date(created_at) <= ?`).bind(startDateStr, endDateStr)
    );

    // 2. Previous period queries (Indices 5 to 9, if applicable)
    let hasPrevPeriod = false;
    let prevStartStr = '';
    let prevEndStr = '';

    if (effectiveStartDate && effectiveEndDate) {
      hasPrevPeriod = true;
      const currentStart = new Date(effectiveStartDate);
      const currentEnd = new Date(effectiveEndDate);
      const diffTime = Math.abs(currentEnd.getTime() - currentStart.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const prevStart = new Date(currentStart);
      prevStart.setDate(prevStart.getDate() - diffDays);
      const prevEnd = new Date(currentEnd);
      prevEnd.setDate(prevEnd.getDate() - diffDays);

      prevStartStr = prevStart.toISOString().substring(0, 10);
      prevEndStr = prevEnd.toISOString().substring(0, 10);

      queries.push(
        db.prepare(`SELECT COUNT(*) as count FROM Bookings WHERE date(created_at) >= ? AND date(created_at) <= ?`).bind(prevStartStr, prevEndStr),
        db.prepare(`SELECT COUNT(*) as count FROM Article_Comments WHERE date(created_at) >= ? AND date(created_at) <= ?`).bind(prevStartStr, prevEndStr),
        db.prepare(`SELECT COUNT(*) as count FROM Inbox WHERE date(created_at) >= ? AND date(created_at) <= ?`).bind(prevStartStr, prevEndStr),
        db.prepare(`SELECT SUM(total_paid) as total FROM Bookings WHERE status != 'cancelled' AND date(created_at) >= ? AND date(created_at) <= ?`).bind(prevStartStr, prevEndStr),
        db.prepare(`SELECT COUNT(*) as count FROM Customers WHERE date(created_at) >= ? AND date(created_at) <= ?`).bind(prevStartStr, prevEndStr)
      );
    }

    // 3. Total overall customers query (Last index)
    queries.push(
      db.prepare(`SELECT COUNT(*) as count FROM Customers`)
    );

    // Execute all queries in a single atomic batch roundtrip
    const results = await db.batch(queries);

    let idx = 0;
    
    // Unpack current stats
    const currentBookings = (results[idx++].results?.[0] as any)?.count || 0;
    const currentComments = (results[idx++].results?.[0] as any)?.count || 0;
    const currentInbox = (results[idx++].results?.[0] as any)?.count || 0;
    const currentRevenue = (results[idx++].results?.[0] as any)?.total || 0;
    const currentNewCustomers = (results[idx++].results?.[0] as any)?.count || 0;

    // Unpack previous stats
    let prevBookings = 0;
    let prevComments = 0;
    let prevInbox = 0;
    let prevRevenue = 0;
    let prevNewCustomers = 0;

    if (hasPrevPeriod) {
      prevBookings = (results[idx++].results?.[0] as any)?.count || 0;
      prevComments = (results[idx++].results?.[0] as any)?.count || 0;
      prevInbox = (results[idx++].results?.[0] as any)?.count || 0;
      prevRevenue = (results[idx++].results?.[0] as any)?.total || 0;
      prevNewCustomers = (results[idx++].results?.[0] as any)?.count || 0;
    }

    // Unpack total customers
    const totalCustomersRes = results[idx++].results?.[0] as any;
    const totalCustomers = totalCustomersRes?.count || 0;

    const getPercentageChange = (curr: number, prev: number): number => {
      if (prev === 0) {
        if (curr > 0) return 100;
        return 0;
      }
      return parseFloat((((curr - prev) / prev) * 100).toFixed(1));
    };

    return {
      bookingsCount: currentBookings,
      bookingsDiffPercent: getPercentageChange(currentBookings, prevBookings),
      newCommentsCount: currentComments,
      newCommentsDiffPercent: getPercentageChange(currentComments, prevComments),
      newInboxMessagesCount: currentInbox,
      newInboxMessagesDiffPercent: getPercentageChange(currentInbox, prevInbox),
      totalRevenue: currentRevenue,
      revenueDiffPercent: getPercentageChange(currentRevenue, prevRevenue),
      newCustomersCount: currentNewCustomers,
      newCustomersDiffPercent: getPercentageChange(currentNewCustomers, prevNewCustomers),
      totalCustomers: totalCustomers
    };
  },

  /**
   * Performs the Get Timeline operation.
   * 
   * @param db - The D1 Database instance.
   */
  getTimeline: async (
    db: D1Database, 
    startDate?: string, 
    endDate?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ timeline: TimelineEvent[]; hasMore: boolean }> => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    let effectiveStartDate = startDate;
    let effectiveEndDate = endDate;
    
    // Default to today if no date filter is selected
    if (!effectiveStartDate && !effectiveEndDate) {
      effectiveStartDate = new Date().toISOString().substring(0, 10);
      effectiveEndDate = effectiveStartDate;
    }

    if (effectiveStartDate && !dateRegex.test(effectiveStartDate)) {
      effectiveStartDate = new Date().toISOString().substring(0, 10);
    }
    if (effectiveEndDate && !dateRegex.test(effectiveEndDate)) {
      effectiveEndDate = effectiveStartDate!;
    }

    const startDateStr = effectiveStartDate!;
    const endDateStr = effectiveEndDate!;

    // D1 has a hard limit of 5 terms in a compound SELECT (UNION ALL).
    // We have 6 tables/events, which makes 6 terms.
    // To bypass this and still let the database do the sorting and slicing,
    // we split the 6 queries into two Common Table Expressions (CTEs), each with 3 terms,
    // and then UNION ALL the CTEs in the main query.
    const query = `
      WITH 
      Group1 AS (
        SELECT id, 'NEW_BOOKING' as type, created_at as timestamp, 'New Booking Created' as title, status FROM Bookings WHERE date(created_at) >= ? AND date(created_at) <= ?
        UNION ALL
        SELECT id, 'BOOKING_CONFIRMED' as type, updated_at as timestamp, 'Booking Confirmed' as title, status FROM Bookings WHERE status = 'in_progress' AND date(updated_at) >= ? AND date(updated_at) <= ?
        UNION ALL
        SELECT id, 'BOOKING_COMPLETED' as type, completed_at as timestamp, 'Booking Completed' as title, status FROM Bookings WHERE date(completed_at) >= ? AND date(completed_at) <= ?
      ),
      Group2 AS (
        SELECT id, 'BOOKING_CANCELLED' as type, cancelled_at as timestamp, 'Booking Cancelled' as title, status FROM Bookings WHERE date(cancelled_at) >= ? AND date(cancelled_at) <= ?
        UNION ALL
        SELECT id, 'NEW_COMMENT' as type, created_at as timestamp, 'New Comment Added' as title, status FROM Article_Comments WHERE date(created_at) >= ? AND date(created_at) <= ?
        UNION ALL
        SELECT id, 'NEW_INBOX_MESSAGE' as type, created_at as timestamp, 'New Inbox Message' as title, status FROM Inbox WHERE date(created_at) >= ? AND date(created_at) <= ?
      )
      SELECT id, type, timestamp, title, status FROM Group1
      UNION ALL
      SELECT id, type, timestamp, title, status FROM Group2
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams: any[] = [];
    // Bind date ranges for each subquery
    for (let i = 0; i < 6; i++) {
      queryParams.push(startDateStr, endDateStr);
    }

    const offset = (page - 1) * limit;
    const fetchLimit = limit + 1; // Fetch limit + 1 to detect next page availability
    queryParams.push(fetchLimit, offset);

    const { results } = await db.prepare(query).bind(...queryParams).all<TimelineEvent>();
    
    const hasMore = results.length > limit;
    const timeline = hasMore ? results.slice(0, limit) : results;

    return {
      timeline,
      hasMore
    };
  }
};
