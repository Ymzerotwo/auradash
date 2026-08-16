/**
 * ==========================================
 *        AuraDash Booking Routes
 * ==========================================
 * 
 * Defines the routing endpoints for Booking operations.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { AppContext } from '../types';
import { BookingController } from '../controllers/booking.controller';
import { requirePermission } from '../middleware/permission';
import { paginationSchema } from '../validators/pagination.validators';
import { CreateBookingSchema, UpdateBookingSchema, ChangeBookingStatusSchema, RecordPaymentSchema } from '../validators/booking.validators';
import { sendResponse } from '../utils/response';

const bookingRoutes = new Hono<AppContext>();

// Require 'bookings' or 'bookings.view' permission for all routes within this file
bookingRoutes.use('*', requirePermission(['bookings', 'bookings.view']));

const getBookingsQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
});

/**
 * GET /api/bookings
 * Lists all bookings with pagination and filters.
 */
bookingRoutes.get(
  '/',
  zValidator('query', getBookingsQuerySchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid query parameters', null, result.error.issues);
    }
  }),
  BookingController.getBookings
);

/**
 * GET /api/bookings/:id
 * Retrieves details of a specific booking.
 */
bookingRoutes.get('/:id', BookingController.getBookingById);
  
/**
 * POST /api/bookings
 * Creates a new booking.
 */
bookingRoutes.post(
  '/',
  zValidator('json', CreateBookingSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  BookingController.createBooking
);

/**
 * PUT /api/bookings/:id
 * Updates an existing booking.
 */
bookingRoutes.put(
  '/:id',
  zValidator('json', UpdateBookingSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  BookingController.updateBooking
);

/**
 * PATCH /api/bookings/:id/status
 * Updates the status of a specific booking.
 */
bookingRoutes.patch(
  '/:id/status',
  zValidator('json', ChangeBookingStatusSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  BookingController.changeStatus
);

/**
 * POST /api/bookings/:id/payments
 * Records a new payment transaction for a booking.
 */
bookingRoutes.post(
  '/:id/payments',
  zValidator('json', RecordPaymentSchema, (result, c) => {
    if (!result.success) {
      return sendResponse(c, 400, 'VALIDATION_ERROR', 'Invalid input data', null, result.error.issues);
    }
  }),
  BookingController.recordPayment
);

/**
 * DELETE /api/bookings/:id
 * Deletes a specific booking.
 */
bookingRoutes.delete('/:id', BookingController.deleteBooking);

export default bookingRoutes;
