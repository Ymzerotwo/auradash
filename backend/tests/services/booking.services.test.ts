import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingService } from '../../src/services/booking.services';

describe('BookingService', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      all: vi.fn().mockResolvedValue({ results: [] }),
      first: vi.fn().mockResolvedValue({ total: 0 })
    };
  });

  describe('getBookings', () => {
    it('should paginate and retrieve bookings successfully', async () => {
      mockDb.all.mockResolvedValue({
        results: [{ id: 'b1', services_data: '[]', customer_name: 'Ahmed' }]
      });
      mockDb.first.mockResolvedValue({ total: 1 });

      const result = await BookingService.getBookings(mockDb as any, 1, 10, 'pending', 'Ahmed');

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getBookingById', () => {
    it('should throw BOOKING_NOT_FOUND if not exists', async () => {
      mockDb.first.mockResolvedValue(null);

      await expect(BookingService.getBookingById(mockDb as any, 'invalid_id'))
        .rejects.toThrow('BOOKING_NOT_FOUND');
    });

    it('should return parsed booking details', async () => {
      mockDb.first.mockResolvedValue({
        id: 'b1',
        services_data: '[{"service_id": "s1", "price": 100}]'
      });

      const result = await BookingService.getBookingById(mockDb as any, 'b1');
      expect(result.services_data).toEqual([{ service_id: 's1', price: 100 }]);
    });
  });

  describe('createBooking', () => {
    it('should create booking and fetch the newly created booking details', async () => {
      mockDb.first.mockResolvedValue({
        id: 'new_id',
        services_data: '[]'
      });

      const result = await BookingService.createBooking(mockDb as any, {
        customer_id: 'c1',
        services_data: [],
        scheduled_from: '2026-06-20T10:00:00.000Z',
        scheduled_to: '2026-06-20T11:00:00.000Z',
        notes: 'notes'
      }, 'user_123');

      expect(result).toBeDefined();
      expect(mockDb.run).toHaveBeenCalled();
    });

    it('should throw CUSTOMER_NOT_FOUND on foreign key constraints', async () => {
      mockDb.run.mockRejectedValue(new Error('FOREIGN KEY constraint failed'));

      await expect(BookingService.createBooking(mockDb as any, {
        customer_id: 'c_invalid',
        scheduled_from: '2026-06-20T10:00:00.000Z',
        scheduled_to: '2026-06-20T11:00:00.000Z',
        services_data: []
      }, 'user_123')).rejects.toThrow('CUSTOMER_NOT_FOUND');
    });
  });

  describe('updateBooking', () => {
    it('should throw BOOKING_LOCKED if completed', async () => {
      mockDb.first.mockResolvedValue({ status: 'completed' });

      await expect(BookingService.updateBooking(mockDb as any, 'b1', { notes: 'updated notes' }, 'user_1', 'Staff'))
        .rejects.toThrow('BOOKING_LOCKED');
    });

    it('should update booking properties when allowed', async () => {
      mockDb.first.mockResolvedValue({ status: 'pending' });

      await expect(BookingService.updateBooking(mockDb as any, 'b1', { notes: 'updated notes' }, 'user_1', 'Staff'))
        .resolves.not.toThrow();
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('changeStatus', () => {
    it('should lock status updates if already completed', async () => {
      mockDb.first.mockResolvedValue({ status: 'completed' });

      await expect(BookingService.changeStatus(mockDb as any, 'b1', { status: 'cancelled' }, 'user_1', 'Staff'))
        .rejects.toThrow('BOOKING_LOCKED');
    });
  });

  describe('deleteBooking', () => {
    it('should delete existing cancelled booking', async () => {
      mockDb.first.mockResolvedValue({ status: 'cancelled' });
      mockDb.run.mockResolvedValue({ success: true, meta: { changes: 1 } });
      await expect(BookingService.deleteBooking(mockDb as any, 'b1')).resolves.not.toThrow();
    });

    it('should throw ONLY_CANCELLED_BOOKINGS_CAN_BE_DELETED if status is not cancelled', async () => {
      mockDb.first.mockResolvedValue({ status: 'pending' });
      await expect(BookingService.deleteBooking(mockDb as any, 'b1')).rejects.toThrow('ONLY_CANCELLED_BOOKINGS_CAN_BE_DELETED');
    });

    it('should throw BOOKING_NOT_FOUND if booking does not exist', async () => {
      mockDb.first.mockResolvedValue(null);
      await expect(BookingService.deleteBooking(mockDb as any, 'b1')).rejects.toThrow('BOOKING_NOT_FOUND');
    });
  });
});
