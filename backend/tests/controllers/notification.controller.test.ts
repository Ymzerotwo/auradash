import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationController } from '../../src/controllers/notification.controller';
import { NotificationService } from '../../src/services/notification.services';

describe('NotificationController', () => {
  let mockContext: any;
  let getNotificationsSpy: any;
  let markAsReadSpy: any;
  let markAllAsReadSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    getNotificationsSpy = vi.spyOn(NotificationService, 'getNotifications');
    markAsReadSpy = vi.spyOn(NotificationService, 'markAsRead');
    markAllAsReadSpy = vi.spyOn(NotificationService, 'markAllAsRead');

    mockContext = {
      req: {
        url: 'http://localhost/api/notifications',
        query: vi.fn(),
        param: vi.fn()
      },
      env: {
        DB: {},
        K1: {}
      },
      get: vi.fn(),
      json: vi.fn((data, status) => ({ status, data }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAll', () => {
    it('should query notifications list for user', async () => {
      mockContext.get.mockReturnValue({ id: 'user_1' });
      getNotificationsSpy.mockResolvedValue({ notifications: [], pagination: {} });

      const response: any = await NotificationController.getAll(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('NOTIFICATIONS_FETCHED');
    });
  });

  describe('markAsRead', () => {
    it('should mark single notification read', async () => {
      mockContext.get.mockReturnValue({ id: 'user_1' });
      mockContext.req.param.mockReturnValue('notif_1');
      markAsReadSpy.mockResolvedValue({ success: true });

      const response: any = await NotificationController.markAsRead(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('NOTIFICATION_MARKED_READ');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications read', async () => {
      mockContext.get.mockReturnValue({ id: 'user_1' });
      markAllAsReadSpy.mockResolvedValue({ success: true });

      const response: any = await NotificationController.markAllAsRead(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('ALL_NOTIFICATIONS_MARKED_READ');
    });
  });
});
