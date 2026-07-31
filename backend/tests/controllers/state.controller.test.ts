import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StateController } from '../../src/controllers/state.controller';
import { StateService } from '../../src/services/state.services';

describe('StateController', () => {
  let mockContext: any;
  let getStateHashSpy: any;
  let getCountersSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    getStateHashSpy = vi.spyOn(StateService, 'getStateHash');
    getCountersSpy = vi.spyOn(StateService, 'getCounters');

    mockContext = {
      req: {
        url: 'http://localhost/api/state',
        query: vi.fn(),
        param: vi.fn(),
        valid: vi.fn()
      },
      env: {
        DB: {},
        K1: {}
      },
      get: vi.fn().mockReturnValue({ id: 'user-123' }), // mock logged-in user
      json: vi.fn((data, status) => ({ status: status || 200, data }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getHash', () => {
    it('should return unauthorized if user is not authenticated', async () => {
      mockContext.get.mockReturnValue(null);

      const response: any = await StateController.getHash(mockContext);
      expect(response.status).toBe(401);
      expect(response.data.slug).toBe('UNAUTHORIZED');
    });

    it('should return state version hash successfully', async () => {
      const mockState = {
        notifications_version: 'v12',
        inbox_version: 'v34',
        comments_version: 'v0',
        bookings_version: 'v0'
      };
      getStateHashSpy.mockResolvedValue(mockState);

      const response: any = await StateController.getHash(mockContext);
      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockState);
    });

    it('should return 500 error if service throws', async () => {
      getStateHashSpy.mockRejectedValue(new Error('KV failure'));

      const response: any = await StateController.getHash(mockContext);
      expect(response.status).toBe(500);
      expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('getCounters', () => {
    it('should return unauthorized if user is not authenticated', async () => {
      mockContext.get.mockReturnValue(null);

      const response: any = await StateController.getCounters(mockContext);
      expect(response.status).toBe(401);
      expect(response.data.slug).toBe('UNAUTHORIZED');
    });

    it('should return state counters successfully', async () => {
      const mockCounters = {
        notifications: 4,
        inbox: 1,
        comments: 0,
        bookings: 0
      };
      getCountersSpy.mockResolvedValue(mockCounters);

      const response: any = await StateController.getCounters(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('COUNTERS_FETCHED');
      expect(response.data.data).toEqual(mockCounters);
    });

    it('should return 500 error if service throws', async () => {
      getCountersSpy.mockRejectedValue(new Error('D1 failure'));

      const response: any = await StateController.getCounters(mockContext);
      expect(response.status).toBe(500);
      expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
