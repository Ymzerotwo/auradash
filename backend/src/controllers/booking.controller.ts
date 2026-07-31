/**
 * ==========================================
 *        AuraDash Booking Controller
 * ==========================================
 * 
 * Handles HTTP requests for Booking operations.
 */

import { Context } from 'hono';
import { sendResponse } from '../utils/response';
import { AppContext } from '../types';
import { BookingService } from '../services/booking.services';
import { CreateBookingSchema, UpdateBookingSchema, ChangeBookingStatusSchema, RecordPaymentSchema } from '../validators/booking.validators';

export const BookingController = {
  /**
   * Handles the Get Bookings operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getBookings: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const page = Number(c.req.query('page')) || 1;
    const limit = Number(c.req.query('limit')) || 10;
    const status = c.req.query('status') || undefined;
    const search = c.req.query('search') || undefined;

    try {
      const result = await BookingService.getBookings(db, page, limit, status, search);
      return sendResponse(c, 200, 'BOOKINGS_FETCHED', 'Bookings retrieved successfully', result);
    } catch (error: any) {
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve bookings', null, error.message);
    }
  },

  /**
   * Handles the Get Booking By Id operation.
   * 
   * @param c - The Hono HTTP context.
   */
  getBookingById: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const id = c.req.param('id') as string;
    
    try {
      const booking = await BookingService.getBookingById(db, id);
      return sendResponse(c, 200, 'BOOKING_FETCHED', 'Booking retrieved successfully', booking);
    } catch (error: any) {
      if (error.message === 'BOOKING_NOT_FOUND') {
        return sendResponse(c, 404, 'BOOKING_NOT_FOUND', 'Booking not found');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve booking', null, error.message);
    }
  },

  /**
   * Handles the Create Booking operation.
   * 
   * @param c - The Hono HTTP context.
   */
  createBooking: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const user = c.get('user')!;

    try {
      const body = await c.req.json();
      const validation = CreateBookingSchema.safeParse(body);
      
      if (!validation.success) {
        return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid data provided', validation.error.format());
      }

      const result = await BookingService.createBooking(db, validation.data, user.id);
      return sendResponse(c, 201, 'BOOKING_CREATED', 'Booking created successfully', result);
    } catch (error: any) {
      if (error.message === 'CUSTOMER_NOT_FOUND') {
        return sendResponse(c, 404, 'CUSTOMER_NOT_FOUND', 'The specified customer does not exist');
      }
      if (error.message === 'CUSTOMER_IS_SPAMMED') {
        return sendResponse(c, 403, 'CUSTOMER_IS_SPAMMED', 'Cannot create a booking for a banned customer');
      }
      if (error.message === 'SERVICE_NOT_FOUND') {
        return sendResponse(c, 404, 'SERVICE_NOT_FOUND', 'One or more selected services do not exist or are inactive');
      }
      if (error.message === 'SERVICE_MISSING_DATA') {
        return sendResponse(c, 400, 'SERVICE_MISSING_DATA', 'A selected service is missing required data (name, price)');
      }
      if (error.message === 'PAID_AMOUNT_NEGATIVE') {
        return sendResponse(c, 400, 'PAID_AMOUNT_NEGATIVE', 'Paid amount cannot be negative');
      }
      if (error.message === 'PAID_AMOUNT_EXCEEDS_TOTAL') {
        return sendResponse(c, 400, 'PAID_AMOUNT_EXCEEDS_TOTAL', 'Paid amount cannot exceed the total cost of the booking');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to create booking', null, error.message);
    }
  },

  /**
   * Handles the Update Booking operation.
   * 
   * @param c - The Hono HTTP context.
   */
  updateBooking: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const id = c.req.param('id') as string;
    const user = c.get('user')!;
    
    try {
      const body = await c.req.json();
      const validation = UpdateBookingSchema.safeParse(body);
      
      if (!validation.success) {
        return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid data provided', validation.error.format());
      }

      await BookingService.updateBooking(db, id, validation.data, user.id, user.role);
      return sendResponse(c, 200, 'BOOKING_UPDATED', 'Booking updated successfully');
    } catch (error: any) {
      if (error.message === 'BOOKING_NOT_FOUND') {
        return sendResponse(c, 404, 'BOOKING_NOT_FOUND', 'Booking not found');
      }
      if (error.message === 'BOOKING_LOCKED') {
        return sendResponse(c, 403, 'BOOKING_LOCKED', 'Completed, cancelled, or in-progress bookings cannot be modified');
      }
      if (error.message === 'SERVICE_NOT_FOUND') {
        return sendResponse(c, 404, 'SERVICE_NOT_FOUND', 'One or more selected services do not exist or are inactive');
      }
      if (error.message === 'SERVICE_MISSING_DATA') {
        return sendResponse(c, 400, 'SERVICE_MISSING_DATA', 'A selected service is missing required data (name, price)');
      }
      if (error.message === 'PAID_AMOUNT_NEGATIVE') {
        return sendResponse(c, 400, 'PAID_AMOUNT_NEGATIVE', 'Paid amount cannot be negative');
      }
      if (error.message === 'PAID_AMOUNT_EXCEEDS_TOTAL') {
        return sendResponse(c, 400, 'PAID_AMOUNT_EXCEEDS_TOTAL', 'Paid amount cannot exceed the total cost of the booking');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to update booking', null, error.message);
    }
  },

  /**
   * Handles the Change Status operation.
   * 
   * @param c - The Hono HTTP context.
   */
  changeStatus: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const id = c.req.param('id') as string;
    const user = c.get('user')!;

    try {
      const body = await c.req.json();
      const validation = ChangeBookingStatusSchema.safeParse(body);
      
      if (!validation.success) {
        return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid data provided', validation.error.format());
      }

      await BookingService.changeStatus(db, id, validation.data, user.id, user.role);
      return sendResponse(c, 200, 'BOOKING_STATUS_CHANGED', 'Booking status updated successfully');
    } catch (error: any) {
      if (error.message === 'BOOKING_NOT_FOUND') {
        return sendResponse(c, 404, 'BOOKING_NOT_FOUND', 'Booking not found');
      }
      if (error.message === 'BOOKING_LOCKED') {
        return sendResponse(c, 403, 'BOOKING_LOCKED', 'Completed or cancelled bookings cannot be modified');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to change booking status', null, error.message);
    }
  },

  /**
   * Handles the Record Payment operation.
   * 
   * @param c - The Hono HTTP context.
   */
  recordPayment: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const id = c.req.param('id') as string;
    const user = c.get('user')!;

    try {
      const body = await c.req.json();
      const validation = RecordPaymentSchema.safeParse(body);

      if (!validation.success) {
        return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid data provided', validation.error.format());
      }

      const result = await BookingService.recordPayment(db, id, validation.data, user.id);
      return sendResponse(c, 200, 'PAYMENT_RECORDED', 'Payment recorded successfully', result);
    } catch (error: any) {
      if (error.message === 'BOOKING_NOT_FOUND') {
        return sendResponse(c, 404, 'BOOKING_NOT_FOUND', 'Booking not found');
      }
      if (error.message === 'PAID_AMOUNT_NEGATIVE') {
        return sendResponse(c, 400, 'PAID_AMOUNT_NEGATIVE', 'Paid amount must be positive');
      }
      if (error.message === 'PAID_AMOUNT_EXCEEDS_TOTAL') {
        return sendResponse(c, 400, 'PAID_AMOUNT_EXCEEDS_TOTAL', 'Paid amount cannot exceed the remaining booking balance');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to record payment', null, error.message);
    }
  },

  /**
   * Handles the Delete Booking operation.
   * 
   * @param c - The Hono HTTP context.
   */
  deleteBooking: async (c: Context<AppContext>) => {
    const db = c.env.DB;
    const id = c.req.param('id') as string;
    const user = c.get('user')!;

    if (user.role !== 'Admin') {
      return sendResponse(c, 403, 'FORBIDDEN', 'Only administrators can delete bookings');
    }
    
    try {
      await BookingService.deleteBooking(db, id);
      return sendResponse(c, 200, 'BOOKING_DELETED', 'Booking deleted successfully');
    } catch (error: any) {
      if (error.message === 'BOOKING_NOT_FOUND') {
        return sendResponse(c, 404, 'BOOKING_NOT_FOUND', 'Booking not found');
      }
      if (error.message === 'ONLY_CANCELLED_BOOKINGS_CAN_BE_DELETED') {
        return sendResponse(c, 400, 'ONLY_CANCELLED_BOOKINGS_CAN_BE_DELETED', 'Only cancelled bookings can be deleted');
      }
      return sendResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'Failed to delete booking', null, error.message);
    }
  }
};
