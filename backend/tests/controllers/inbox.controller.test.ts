import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InboxController } from '../../src/controllers/inbox.controller';
import { InboxService } from '../../src/services/inbox.services';

describe('InboxController', () => {
  let mockContext: any;
  let submitInboxMessageSpy: any;
  let getMessagesSpy: any;
  let getUnreadCountSpy: any;
  let markAsReadSpy: any;
  let removeFromSpamSpy: any;
  let markAsConvertedSpy: any;
  let markAsSpamSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    submitInboxMessageSpy = vi.spyOn(InboxService, 'submitInboxMessage');
    getMessagesSpy = vi.spyOn(InboxService, 'getMessages');
    getUnreadCountSpy = vi.spyOn(InboxService, 'getUnreadCount');
    markAsReadSpy = vi.spyOn(InboxService, 'markAsRead');
    removeFromSpamSpy = vi.spyOn(InboxService, 'removeFromSpam');
    markAsConvertedSpy = vi.spyOn(InboxService, 'markAsConverted');
    markAsSpamSpy = vi.spyOn(InboxService, 'markAsSpam');

    mockContext = {
      req: {
        url: 'http://localhost/api/inbox',
        query: vi.fn(),
        param: vi.fn(),
        json: vi.fn()
      },
      env: {
        DB: {},
        K1: {},
        CLOUDFLARE_API_TOKEN: 'token'
      },
      executionCtx: {},
      get: vi.fn(),
      json: vi.fn((data, status) => ({ status, data }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createInboxMessage', () => {
    it('should validate and create inbox message', async () => {
      mockContext.req.json.mockResolvedValue({
        full_name: 'Ahmad',
        phone: '12345678',
        email: 'ahmad@example.com',
        inquiry_type: 'general',
        message: 'Hello'
      });
      submitInboxMessageSpy.mockResolvedValue({ id: 'msg_1' });

      const response: any = await InboxController.createInboxMessage(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('INBOX_MESSAGE_CREATED');
    });

    it('should handle financial contract failure with 400', async () => {
      mockContext.req.json.mockResolvedValue({
        full_name: 'Ahmad',
        phone: '12345678',
        email: 'ahmad@example.com',
        inquiry_type: 'service',
        message: 'Hello',
        service_id: 's1'
      });
      submitInboxMessageSpy.mockRejectedValue(new Error('MISSING_FINANCIAL_CONTRACT'));

      const response: any = await InboxController.createInboxMessage(mockContext);
      expect(response.status).toBe(400);
      expect(response.data.slug).toBe('MISSING_FINANCIAL_CONTRACT');
      expect(submitInboxMessageSpy).toHaveBeenCalled();
    });
  });

  describe('getUnreadCount', () => {
    it('should retrieve unread count successfully', async () => {
      getUnreadCountSpy.mockResolvedValue(5);

      const response: any = await InboxController.getUnreadCount(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.data.count).toBe(5);
    });
  });

  describe('updateStatus', () => {
    it('should handle optimistic locking conflict', async () => {
      mockContext.get.mockReturnValue({ id: 'admin_1' });
      mockContext.req.param.mockReturnValue('msg_1');
      mockContext.req.json.mockResolvedValue({ status: 'read' });
      markAsReadSpy.mockRejectedValue(new Error('OPTIMISTIC_LOCK_FAIL'));

      const response: any = await InboxController.updateStatus(mockContext);
      expect(response.status).toBe(409);
      expect(response.data.slug).toBe('CONFLICT');
    });
  });
});
