import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateService } from '../../src/services/state.services';

describe('StateService', () => {
  let mockDb: any;
  let mockKv: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      first: vi.fn()
    };

    mockKv = {
      get: vi.fn(),
      put: vi.fn()
    };
  });

  describe('getStateHash', () => {
    it('should return parsed state from KV if it exists', async () => {
      const mockState = {
        notifications_version: 'v123',
        inbox_version: 'v456',
        comments_version: 'v0',
        bookings_version: 'v0'
      };
      mockKv.get.mockResolvedValue(JSON.stringify(mockState));

      const result = await StateService.getStateHash(mockKv, 'user-1');
      expect(result).toEqual(mockState);
      expect(mockKv.get).toHaveBeenCalledWith('state_version:user-1');
      expect(mockKv.put).not.toHaveBeenCalled();
    });

    it('should initialize and return default state if KV is empty', async () => {
      mockKv.get.mockResolvedValue(null);

      const result = await StateService.getStateHash(mockKv, 'user-1');
      expect(result).toEqual({
        notifications_version: 'v0',
        inbox_version: 'v0',
        comments_version: 'v0',
        bookings_version: 'v0'
      });
      expect(mockKv.get).toHaveBeenCalledWith('state_version:user-1');
      expect(mockKv.put).toHaveBeenCalledWith(
        'state_version:user-1',
        JSON.stringify({
          notifications_version: 'v0',
          inbox_version: 'v0',
          comments_version: 'v0',
          bookings_version: 'v0'
        })
      );
    });
  });

  describe('getCounters', () => {
    it('should query D1 for unread notifications and inbox counts', async () => {
      mockDb.first.mockResolvedValue({ notifications: 5, inbox: 2, comments: 0 });

      const result = await StateService.getCounters(mockDb, { id: 'user-1', role: 'Admin' });
      expect(result).toEqual({
        notifications: 5,
        inbox: 2,
        comments: 0,
        bookings: 0
      });
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('Notifications'));
      expect(mockDb.bind).toHaveBeenCalledWith('user-1', 1, 1);
    });

    it('should fallback to 0 if count queries fail or return empty', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await StateService.getCounters(mockDb, { id: 'user-1', role: 'Admin' });
      expect(result).toEqual({
        notifications: 0,
        inbox: 0,
        comments: 0,
        bookings: 0
      });
    });
  });
});
