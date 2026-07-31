import { describe, it, expect } from 'vitest';
import { CreateCustomerSchema, UpdateCustomerSchema, SpamCustomerSchema } from '../../src/validators/customer.validators';

describe('Customer Validators', () => {
  describe('CreateCustomerSchema', () => {
    it('should validate valid customer data', () => {
      const validData = {
        full_name: 'Jane Doe',
        phone: '+1234567890',
        email: 'jane@example.com',
        gender: 'female',
        date_of_birth: '1995-10-15',
        city: 'New York',
        acquisition_source: 'Referral',
        tags: ['vip', 'regular'],
        notes: 'Pre-existing notes'
      };

      const result = CreateCustomerSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone).toBe('+1234567890');
      }
    });

    it('should format phone number by stripping spaces and dashes', () => {
      const validData = {
        full_name: 'Jane Doe',
        phone: '+1 234-567-890',
        email: 'jane@example.com'
      };

      const result = CreateCustomerSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone).toBe('+1234567890');
      }
    });

    it('should fail if phone format is invalid', () => {
      const invalidData = {
        full_name: 'Jane Doe',
        phone: '1234567890', // Missing + prefix
        email: 'jane@example.com'
      };

      const result = CreateCustomerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should fail if email is invalid', () => {
      const invalidData = {
        full_name: 'Jane Doe',
        phone: '+1234567890',
        email: 'not-an-email'
      };

      const result = CreateCustomerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateCustomerSchema', () => {
    it('should validate partial updates', () => {
      const result = UpdateCustomerSchema.safeParse({
        city: 'Boston'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('SpamCustomerSchema', () => {
    it('should validate spam reason length', () => {
      const result = SpamCustomerSchema.safeParse({
        reason: 'Ab'
      });
      expect(result.success).toBe(false);
    });
  });
});
