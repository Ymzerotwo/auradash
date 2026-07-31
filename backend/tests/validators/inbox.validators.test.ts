import { describe, it, expect } from 'vitest';
import { InboxSchema, UpdateInboxStatusSchema } from '../../src/validators/inbox.validators';

describe('Inbox Validators', () => {
  describe('InboxSchema', () => {
    it('should validate correctly with valid data', () => {
      const validData = {
        full_name: 'John Doe',
        phone: '123456789',
        email: 'test@example.com',
        inquiry_type: 'general',
        message: 'This is a test message'
      };
      
      const result = InboxSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should transform empty service_id string to undefined', () => {
      const validData = {
        full_name: 'John Doe',
        phone: '123456789',
        email: 'test@example.com',
        inquiry_type: 'general',
        message: 'This is a test message',
        service_id: '' // Empty string
      };
      
      const result = InboxSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.service_id).toBeUndefined();
      }
    });

    it('should fail if email is invalid', () => {
      const invalidData = {
        full_name: 'John Doe',
        phone: '123456789',
        email: 'invalid-email',
        inquiry_type: 'general',
        message: 'This is a test message'
      };
      
      const result = InboxSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateInboxStatusSchema', () => {
    it('should validate valid status update', () => {
      const result = UpdateInboxStatusSchema.safeParse({ status: 'read' });
      expect(result.success).toBe(true);
    });

    it('should transform empty spam_reason string to undefined', () => {
      const result = UpdateInboxStatusSchema.safeParse({ status: 'spam', spam_reason: '' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.spam_reason).toBeUndefined();
      }
    });

    it('should fail with invalid status', () => {
      const result = UpdateInboxStatusSchema.safeParse({ status: 'invalid_status' });
      expect(result.success).toBe(false);
    });
  });
});
