import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BookingController } from '../../src/controllers/booking.controller';
import { BookingService } from '../../src/services/booking.services';

describe('BookingController', () => {
  let mockContext: any;
  let getBookingsSpy: any;
  let getBookingByIdSpy: any;
  let createBookingSpy: any;
  let updateBookingSpy: any;
  let changeStatusSpy: any;
  let deleteBookingSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    getBookingsSpy = vi.spyOn(BookingService, 'getBookings');
    getBookingByIdSpy = vi.spyOn(BookingService, 'getBookingById');
    createBookingSpy = vi.spyOn(BookingService, 'createBooking');
    updateBookingSpy = vi.spyOn(BookingService, 'updateBooking');
    changeStatusSpy = vi.spyOn(BookingService, 'changeStatus');
    deleteBookingSpy = vi.spyOn(BookingService, 'deleteBooking');

    mockContext = {
      req: {
        url: 'http://localhost/api/bookings',
        query: vi.fn(),
        param: vi.fn(),
        json: vi.fn()
      },
      env: {
        ENVIRONMENT: 'development',
        DB: {}
      },
      get: vi.fn(),
      json: vi.fn((data, status) => ({ status, data }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getBookings', () => {
    it('should return paginated bookings', async () => {
      mockContext.req.query.mockImplementation((key: string) => {
        if (key === 'page') return '1';
        if (key === 'limit') return '10';
        return '';
      });
      getBookingsSpy.mockResolvedValue({
        data: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
      });

      const response: any = await BookingController.getBookings(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('BOOKINGS_FETCHED');
    });
  });

  describe('getBookingById', () => {
    it('should return 404 if booking is not found', async () => {
      mockContext.req.param.mockReturnValue('b1');
      getBookingByIdSpy.mockRejectedValue(new Error('BOOKING_NOT_FOUND'));

      const response: any = await BookingController.getBookingById(mockContext);
      expect(response.status).toBe(404);
      expect(response.data.slug).toBe('BOOKING_NOT_FOUND');
    });
  });

  describe('createBooking', () => {
    it('should validate and create a booking', async () => {
      mockContext.get.mockReturnValue({ id: 'user_1' });
      mockContext.req.json.mockResolvedValue({
        customer_id: 'cust_123',
        services_data: [{ name: 'Service Name', price: 10 }],
        scheduled_from: '2026-07-10T15:00:00.000Z',
        scheduled_to: '2026-07-10T16:00:00.000Z'
      });
      createBookingSpy.mockResolvedValue({ id: 'b1' } as any);

      const response: any = await BookingController.createBooking(mockContext);
      expect(response.status).toBe(201);
      expect(response.data.slug).toBe('BOOKING_CREATED');
    });

    it('should return 400 on validation failure', async () => {
      mockContext.req.json.mockResolvedValue({
        customer_id: '', // invalid
        services_data: []
      });

      const response: any = await BookingController.createBooking(mockContext);
      expect(response.status).toBe(400);
      expect(response.data.slug).toBe('VALIDATION_ERROR');
    });
  });

  describe('updateBooking', () => {
    it('should return 403 on financial lock', async () => {
      mockContext.req.param.mockReturnValue('b1');
      mockContext.get.mockReturnValue({ id: 'user_1', role: 'Staff' });
      mockContext.req.json.mockResolvedValue({ notes: 'updated' });
      updateBookingSpy.mockRejectedValue(new Error('BOOKING_LOCKED'));

      const response: any = await BookingController.updateBooking(mockContext);
      expect(response.status).toBe(403);
      expect(response.data.slug).toBe('BOOKING_LOCKED');
    });
  });

  describe('deleteBooking', () => {
    it('should block non-admins from deleting bookings', async () => {
      mockContext.get.mockReturnValue({ role: 'Staff' });

      const response: any = await BookingController.deleteBooking(mockContext);
      expect(response.status).toBe(403);
      expect(response.data.slug).toBe('FORBIDDEN');
    });

    it('should allow admins to delete bookings', async () => {
      mockContext.req.param.mockReturnValue('b1');
      mockContext.get.mockReturnValue({ role: 'Admin' });
      deleteBookingSpy.mockResolvedValue(undefined);

      const response: any = await BookingController.deleteBooking(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('BOOKING_DELETED');
    });
  });
});
