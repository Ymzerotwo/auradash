import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../../src/services/notification.services';

describe('NotificationService', () => {
  let mockDb: any;
  let mockKV: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      batch: vi.fn().mockResolvedValue([]),
      all: vi.fn().mockResolvedValue({ results: [] }),
      first: vi.fn().mockResolvedValue(null)
    };

    mockKV = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined)
    };
  });

  describe('publishEvent', () => {
    it('should query active users in room inbox and submit batch notifications', async () => {
      mockDb.all.mockResolvedValue({
        results: [
          { id: 'admin_1', role: 'Admin' },
          { id: 'staff_1', role: 'Staff', permissions: '{"inbox":true}' }
        ]
      });

      await NotificationService.publishEvent(
        mockDb as any,
        mockKV as any,
        'ALERT',
        'target_id',
        'Title Key',
        { text: 'Body' },
        '/url',
        'inbox'
      );

      expect(mockDb.batch).toHaveBeenCalled();
      expect(mockKV.put).toHaveBeenCalledTimes(2); // Two users state_version updated
    });

    it('should query room users list from KV if room is not inbox', async () => {
      mockKV.get.mockResolvedValue('["user_100", "user_200"]');
      mockDb.all.mockResolvedValue({
        results: [{ id: 'user_100' }, { id: 'user_200' }]
      });

      await NotificationService.publishEvent(
        mockDb as any,
        mockKV as any,
        'ALERT',
        'target_id',
        'Title Key',
        { text: 'Body' },
        '/url',
        'custom_room'
      );

      expect(mockDb.batch).toHaveBeenCalled();
      expect(mockKV.put).toHaveBeenCalledTimes(2);
    });
  });

  describe('getNotifications', () => {
    it('should list user notifications with parsed message body', async () => {
      mockDb.all.mockResolvedValue({
        results: [{ id: 'notif_1', user_id: 'user_1', message_body: '{"alert":true}' }]
      });
      mockDb.first.mockResolvedValue({ total: 1 });

      const result = await NotificationService.getNotifications(mockDb as any, 'user_1', '1', '10');

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].message_body).toEqual({ alert: true });
    });
  });

  describe('markAsRead', () => {
    it('should mark single notification as read and bump hash', async () => {
      mockDb.run.mockResolvedValue({ success: true, meta: { changes: 1 } });
      const spy = vi.spyOn(NotificationService, 'bumpNotificationHash').mockResolvedValue(undefined);

      const result = await NotificationService.markAsRead(mockDb as any, mockKV as any, 'user_1', 'notif_1');
      expect(result.success).toBe(true);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
