import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomsService } from '../../src/services/rooms.services';

describe('RoomsService', () => {
  let mockDb: any;
  let mockKV: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ results: [] })
    };

    mockKV = {
      put: vi.fn().mockResolvedValue(undefined)
    };
  });

  it('should sync users to rooms based on roles and permissions', async () => {
    mockDb.all.mockResolvedValue({
      results: [
        { id: 'u1', role: 'Admin' },
        { id: 'u2', role: 'Staff', permissions: '{"cms.comments":true}' },
        { id: 'u3', role: 'Staff', permissions: '{"operations.calendar":true}' },
        { id: 'u4', role: 'Staff', permissions: '{"inbox":true}' }
      ]
    });

    await RoomsService.syncRooms(mockDb as any, mockKV as any);

    expect(mockKV.put).toHaveBeenCalledWith('room:cms.comments', JSON.stringify(['u1', 'u2']));
    expect(mockKV.put).toHaveBeenCalledWith('room:operations.calendar', JSON.stringify(['u1', 'u3']));
    expect(mockKV.put).toHaveBeenCalledWith('room:inbox', JSON.stringify(['u1', 'u4']));
  });
});
