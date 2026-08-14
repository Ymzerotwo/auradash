import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InboxService } from '../../src/services/inbox.services';
import { EmailService } from '../../src/services/email.services';
import { NotificationService } from '../../src/services/notification.services';

describe('InboxService', () => {
  let mockDb: any;
  let mockKV: any;
  let sendAutoReplySpy: any;
  let publishEventSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    sendAutoReplySpy = vi.spyOn(EmailService, 'sendAutoReply').mockResolvedValue(true);
    publishEventSpy = vi.spyOn(NotificationService, 'publishEvent').mockResolvedValue(undefined);

    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      batch: vi.fn().mockResolvedValue([{ meta: { changes: 1 } }]),
      all: vi.fn().mockResolvedValue({ results: [] }),
      first: vi.fn().mockResolvedValue(null)
    };

    mockKV = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined)
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('submitInboxMessage', () => {
    it('should shadow-ban spam messages silently', async () => {
      mockKV.get.mockResolvedValue('1'); // Spam blocked

      const result = await InboxService.submitInboxMessage(mockDb as any, mockKV as any, 'api_key', {
        full_name: 'Spammer',
        phone: '123',
        email: 'spam@mail.com',
        inquiry_type: 'general',
        message: 'Spam text'
      });

      expect(result.id).toBeDefined();
      expect(mockDb.prepare).not.toHaveBeenCalled(); // DB is untouched
    });

    it('should submit valid inquiry and call automated email & notification', async () => {
      const result = await InboxService.submitInboxMessage(mockDb as any, mockKV as any, 'api_key', {
        full_name: 'Ahmed',
        phone: '123456789',
        email: 'ahmed@mail.com',
        inquiry_type: 'general',
        message: 'Hello'
      });

      expect(result.id).toBeDefined();
      expect(mockDb.prepare).toHaveBeenCalled();
      expect(sendAutoReplySpy).toHaveBeenCalledWith('api_key', 'ahmed@mail.com', 'Ahmed', expect.anything(), expect.anything());
      expect(publishEventSpy).toHaveBeenCalled();
    });

    it('should enforce financial contracts for service inquiries', async () => {
      mockDb.first.mockResolvedValue({
        meta_data: '[{"id":"name","data":"Service A"}]' // missing description & price
      });

      await expect(InboxService.submitInboxMessage(mockDb as any, mockKV as any, 'api_key', {
        full_name: 'Ahmed',
        phone: '123456789',
        inquiry_type: 'service',
        service_id: 's1'
      })).rejects.toThrow('MISSING_FINANCIAL_CONTRACT');
    });
  });

  describe('getMessages', () => {
    it('should query and return paginated inbox messages', async () => {
      mockDb.all.mockResolvedValue({
        results: [{ id: 'm1', full_name: 'Ahmed', status: 'unread', metadata: '{"price":10}' }]
      });
      mockDb.first.mockResolvedValue({ total: 1 });

      const result = await InboxService.getMessages(mockDb as any, { role: 'Admin' }, 1, 10, 'unread');

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].metadata).toEqual({ price: 10 });
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should throw OPTIMISTIC_LOCK_FAIL if no rows were updated', async () => {
      mockDb.first.mockResolvedValue({ status: 'unread', phone: '123' });
      mockDb.run.mockResolvedValue({ success: true, meta: { changes: 0 } });

      await expect(InboxService.markAsRead(mockDb as any, mockKV as any, 'm1', 'admin_1'))
        .rejects.toThrow('OPTIMISTIC_LOCK_FAIL');
    });

    it('should mark unread message as read successfully', async () => {
      mockDb.first.mockResolvedValue({ status: 'unread', phone: '123' });
      mockDb.run.mockResolvedValue({ success: true, meta: { changes: 1 } });
      mockDb.all.mockResolvedValue({ results: [] }); // users query

      const result = await InboxService.markAsRead(mockDb as any, mockKV as any, 'm1', 'admin_1');
      expect(result.success).toBe(true);
    });
  });

  describe('removeFromSpam', () => {
    it('should throw error if message status is not spam', async () => {
      mockDb.first.mockResolvedValue({ status: 'read' });

      await expect(InboxService.removeFromSpam(mockDb as any, mockKV as any, 'm1'))
        .rejects.toThrow('Message is not in spam');
    });
  });

  describe('markAsConverted', () => {
    it('should throw CANNOT_CONVERT_SPAM if message is in spam', async () => {
      mockDb.first.mockResolvedValue({ status: 'spam' });

      await expect(InboxService.markAsConverted(mockDb as any, mockKV as any, 'm1', 'admin_1'))
        .rejects.toThrow('CANNOT_CONVERT_SPAM');
    });

    it('should run transaction to create customer and booking', async () => {
      mockDb.first.mockResolvedValue({
        full_name: 'John',
        status: 'read',
        phone: '123',
        inquiry_type: 'service',
        metadata: '{"name":"Service A","price":100}'
      });
      // Check existing customer: returns 0 results
      mockDb.all.mockResolvedValueOnce({ results: [] }); // customer check query
      mockDb.all.mockResolvedValueOnce({ results: [] }); // users query inside bump
      mockDb.batch.mockResolvedValue([
        { meta: { changes: 1 } }, // insert customer
        { meta: { changes: 1 } }, // insert booking
        { meta: { changes: 1 } }  // update inbox status
      ]);

      const result = await InboxService.markAsConverted(mockDb as any, mockKV as any, 'm1', 'admin_1');
      expect(result.success).toBe(true);
      expect(mockDb.batch).toHaveBeenCalled();
    });
  });

  describe('markAsSpam', () => {
    it('should block contact and mark as spam in DB', async () => {
      mockDb.first.mockResolvedValue({ status: 'unread', phone: '123', email: 'spam@mail.com' });
      mockDb.all.mockResolvedValue({ results: [] }); // users query in bump

      const result = await InboxService.markAsSpam(mockDb as any, mockKV as any, 'm1', 'admin_1', 'Abuse');
      expect(result.success).toBe(true);
      expect(mockKV.put).toHaveBeenCalledWith('spam:phone:123', '1');
      expect(mockKV.put).toHaveBeenCalledWith('spam:email:spam@mail.com', '1');
    });
  });
});
