import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiKeyService } from '../../src/services/apikey.services';
import * as cryptoUtils from '../../src/utils/crypto';

describe('ApiKeyService', () => {
  let mockDb: any;
  let generateApiKeySpy: any;
  let generateTestApiKeySpy: any;
  let normalizeDomainSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    generateApiKeySpy = vi.spyOn(cryptoUtils, 'generateApiKey').mockResolvedValue({
      fullKey: 'full_key_123',
      shortKey: 'short_key_123',
      payloadStr: 'payload'
    });
    generateTestApiKeySpy = vi.spyOn(cryptoUtils, 'generateTestApiKey').mockResolvedValue({
      fullKey: 'full_test_key_123',
      shortKey: 'auradash_ts.eyJleHAiOjE3ODE5MDE2MDB9',
      payloadStr: '{"exp":1781901600}'
    });
    normalizeDomainSpy = vi.spyOn(cryptoUtils, 'normalizeDomain').mockReturnValue('example.com');

    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      all: vi.fn().mockResolvedValue({ results: [] }),
      first: vi.fn().mockResolvedValue({ total: 0 })
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createApiKey', () => {
    it('should create and return an API key successfully', async () => {
      const data = { type: 'production' as const, name: 'Prod Key', domain: 'example.com' };
      const secret = 'master_secret';
      const userId = 'user_123';

      const result = await ApiKeyService.createApiKey(mockDb as any, data as any, secret, userId);

      expect(generateApiKeySpy).toHaveBeenCalledWith('example.com', 'master_secret');
      expect(normalizeDomainSpy).toHaveBeenCalledWith('example.com');
      expect(mockDb.prepare).toHaveBeenCalled();
      expect(result.apiKey).toBe('full_key_123');
      expect(result.domain).toBe('example.com');
      expect(result.type).toBe('production');
    });

    it('should create and return a test key successfully without domain validation', async () => {
      const data = { type: 'test' as const, name: 'Test Key', expiresInHours: 12 };
      const secret = 'master_secret';
      const userId = 'user_123';

      const result = await ApiKeyService.createApiKey(mockDb as any, data, secret, userId);

      expect(generateTestApiKeySpy).toHaveBeenCalledWith(12, 'master_secret');
      expect(mockDb.prepare).toHaveBeenCalled();
      expect(result.apiKey).toBe('full_test_key_123');
      expect(result.domain).toBe('test');
      expect(result.type).toBe('test');
      expect(result.expires_at).toBeDefined();
    });
  });

  describe('listApiKeys', () => {
    it('should list API keys with pagination', async () => {
      mockDb.all.mockResolvedValue({ 
        results: [
          { id: '1', name: 'Key 1', domain: 'example.com', short_key: 'auradash_pk.payload.sig' }
        ] 
      });
      mockDb.first.mockResolvedValue({ total: 1 });

      const result = await ApiKeyService.listApiKeys(mockDb as any, '1', '10');

      expect(result.data).toHaveLength(1);
      expect((result.data as any)[0].type).toBe('production');
      expect(result.pagination.total).toBe(1);
    });

    it('should dynamically decode test keys and add expires_at / is_expired fields', async () => {
      // Create two mock keys: one valid/future exp, one expired
      const futureTestKey = 'auradash_ts.eyJleHAiOjI1MjQ2MDgwMDB9.sig'; // exp in 2050
      const expiredTestKey = 'auradash_ts.eyJleHAiOjE2MDAwMDAwMDB9.sig'; // exp in 2020

      mockDb.all.mockResolvedValue({ 
        results: [
          { id: '1', name: 'Future Test Key', domain: 'test', short_key: futureTestKey },
          { id: '2', name: 'Expired Test Key', domain: 'test', short_key: expiredTestKey }
        ] 
      });
      mockDb.first.mockResolvedValue({ total: 2 });

      const result = await ApiKeyService.listApiKeys(mockDb as any, '1', '10');

      expect(result.data).toHaveLength(2);
      
      // Future key
      expect((result.data as any)[0].type).toBe('test');
      expect((result.data as any)[0].is_expired).toBe(false);
      expect((result.data as any)[0].expires_at).toBe(new Date(2524608000 * 1000).toISOString());

      // Expired key
      expect((result.data as any)[1].type).toBe('test');
      expect((result.data as any)[1].is_expired).toBe(true);
      expect((result.data as any)[1].expires_at).toBe(new Date(1600000000 * 1000).toISOString());
    });
  });

  describe('deleteApiKey', () => {
    it('should delete the API key when it exists', async () => {
      mockDb.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

      await expect(ApiKeyService.deleteApiKey(mockDb as any, 'key_id')).resolves.not.toThrow();
      expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM ApiKeys WHERE id = ?');
    });

    it('should throw NOT_FOUND error when no changes were made', async () => {
      mockDb.run.mockResolvedValue({ success: true, meta: { changes: 0 } });

      await expect(ApiKeyService.deleteApiKey(mockDb as any, 'key_id')).rejects.toThrow('NOT_FOUND');
    });
  });
});
