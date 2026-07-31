import { describe, it, expect } from 'vitest';
import { CreateBookingSchema, UpdateBookingSchema, ChangeBookingStatusSchema, RecordPaymentSchema } from '../../src/validators/booking.validators';

describe('Booking Validators', () => {
  describe('CreateBookingSchema', () => {
    it('should validate valid booking data', () => {
      const validData = {
        customer_id: 'cust_123',
        services_data: [
          { service_id: 'srv_1' },
          { name: 'Custom Haircut', price: 50.0 }
        ],
        scheduled_from: '2026-07-10T15:00:00.000Z',
        scheduled_to: '2026-07-10T16:00:00.000Z',
        notes: 'Some notes'
      };

      const result = CreateBookingSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should fail if scheduled_to is before scheduled_from', () => {
      const invalidData = {
        customer_id: 'cust_123',
        services_data: [{ service_id: 'srv_1' }],
        scheduled_from: '2026-07-10T16:00:00.000Z',
        scheduled_to: '2026-07-10T15:00:00.000Z'
      };

      const result = CreateBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('scheduled_to_must_be_after_scheduled_from');
      }
    });

    it('should fail if service item does not have service_id or name/price', () => {
      const invalidData = {
        customer_id: 'cust_123',
        services_data: [{ name: 'Missing Price' }],
        scheduled_from: '2026-07-10T15:00:00.000Z',
        scheduled_to: '2026-07-10T16:00:00.000Z'
      };

      const result = CreateBookingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateBookingSchema', () => {
    it('should validate valid partial update', () => {
      const result = UpdateBookingSchema.safeParse({
        paid_status: 'paid',
        paid_amount: 100
      });
      expect(result.success).toBe(true);
    });
  });

  describe('ChangeBookingStatusSchema', () => {
    it('should validate status change', () => {
      const result = ChangeBookingStatusSchema.safeParse({
        status: 'completed'
      });
      expect(result.success).toBe(true);
    });

    it('should require cancellation reason if cancelled', () => {
      const invalidData = {
        status: 'cancelled',
        cancellation_reason: '   '
      };

      const result = ChangeBookingStatusSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('RecordPaymentSchema', () => {
    it('should fail if payment amount is negative', () => {
      const result = RecordPaymentSchema.safeParse({
        amount: -5
      });
      expect(result.success).toBe(false);
    });
  });
});
