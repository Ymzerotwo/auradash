import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiKeyAuth } from '../../src/middleware/apiKey.middleware';
import { generateApiKey, generateTestApiKey } from '../../src/utils/crypto';

describe('Middleware: API Key', () => {
  let mockContext: any;
  let mockNext: any;
  const MASTER_SECRET = 'test-master-secret';
  let validKey: string;
  let anotherValidKey: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Generate REAL valid API keys for testing
    const result = await generateApiKey('trusted.com', MASTER_SECRET);
    validKey = result.fullKey;

    const anotherResult = await generateApiKey('another-domain.com', MASTER_SECRET);
    anotherValidKey = anotherResult.fullKey;

    // Mock Hono Context
    mockContext = {
      req: {
        header: vi.fn(),
        url: 'http://localhost/api/test',
      },
      env: {
        AURADASH_MASTER_SECRET: MASTER_SECRET,
      },
      set: vi.fn(),
      get: vi.fn(),
      json: vi.fn((data, status) => ({ status, data })),
    };

    mockNext = vi.fn();
  });

  it('should return 401 if API Key is missing in headers', async () => {
    mockContext.req.header.mockReturnValue(null);
    const response: any = await apiKeyAuth(mockContext, mockNext);
    
    expect(response.status).toBe(401);
    expect(response.data.slug).toBe('API_KEY_MISSING');
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should extract API Key correctly from Bearer Authorization header', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      const lower = name.toLowerCase();
      if (lower === 'authorization') return `Bearer ${validKey}`;
      if (lower === 'origin') return 'https://trusted.com';
      return undefined;
    });
    
    const response: any = await apiKeyAuth(mockContext, mockNext);
    
    // If it reaches next(), it successfully extracted and verified the Bearer token!
    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 500 if AURADASH_MASTER_SECRET is missing from environment', async () => {
    mockContext.req.header.mockReturnValue(validKey);
    mockContext.env.AURADASH_MASTER_SECRET = undefined;
    
    const response: any = await apiKeyAuth(mockContext, mockNext);
    
    expect(response.status).toBe(500);
    expect(response.data.slug).toBe('INTERNAL_SERVER_ERROR');
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if API Key cryptographic verification fails', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      if (name.toLowerCase() === 'x-api-key') return 'auradash_pk_invalidBase64_invalidSignature';
      return undefined;
    });
    
    const response: any = await apiKeyAuth(mockContext, mockNext);
    
    expect(response.status).toBe(401);
    expect(response.data.slug).toBe('INVALID_API_KEY');
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 if request Origin domain does NOT match API Key domain', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      const lower = name.toLowerCase();
      if (lower === 'x-api-key') return validKey;
      if (lower === 'origin') return 'https://malicious.com';
      return undefined;
    });
    
    const response: any = await apiKeyAuth(mockContext, mockNext);
    
    expect(response.status).toBe(403);
    expect(response.data.slug).toBe('DOMAIN_MISMATCH');
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next() and authorize if everything is mathematically and contextually valid', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      const lower = name.toLowerCase();
      if (lower === 'x-api-key') return validKey;
      if (lower === 'referer') return 'https://trusted.com/some/path';
      return undefined;
    });
    
    const response: any = await apiKeyAuth(mockContext, mockNext);
    
    expect(mockContext.set).toHaveBeenCalledWith('apiKeyDomain', 'trusted.com');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should authorize if the request is from a subdomain of the valid domain', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      const lower = name.toLowerCase();
      if (lower === 'x-api-key') return validKey;
      if (lower === 'origin') return 'https://sub.trusted.com';
      return undefined;
    });
    
    await apiKeyAuth(mockContext, mockNext);
    
    expect(mockContext.set).toHaveBeenCalledWith('apiKeyDomain', 'trusted.com');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should authorize if the request is from a deeply nested subdomain', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      const lower = name.toLowerCase();
      if (lower === 'x-api-key') return validKey;
      if (lower === 'origin') return 'https://app.sub.trusted.com';
      return undefined;
    });
    
    await apiKeyAuth(mockContext, mockNext);
    
    expect(mockContext.set).toHaveBeenCalledWith('apiKeyDomain', 'trusted.com');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 403 ORIGIN_REQUIRED when no Origin and no Referer are sent', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      const lower = name.toLowerCase();
      if (lower === 'x-api-key') return validKey;
      // No origin or referer sent — simulates curl/Postman/server-side request
      return undefined;
    });

    const response: any = await apiKeyAuth(mockContext, mockNext);

    expect(response.status).toBe(403);
    expect(response.data.slug).toBe('ORIGIN_REQUIRED');
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should not leak the requesting domain in the DOMAIN_MISMATCH error message', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      const lower = name.toLowerCase();
      if (lower === 'x-api-key') return validKey;
      if (lower === 'origin') return 'https://attacker-domain.com';
      return undefined;
    });

    const response: any = await apiKeyAuth(mockContext, mockNext);

    expect(response.status).toBe(403);
    expect(response.data.message).not.toContain('attacker-domain.com');
  });

  it('should reject a key with forged payload data', async () => {
    const parts = validKey.split('.');
    const payload = parts[1];
    
    // Change exactly one character in the middle of the payload
    const modifiedPayload = payload.substring(0, payload.length / 2) + 
                           (payload[payload.length / 2] === 'a' ? 'b' : 'a') + 
                           payload.substring(payload.length / 2 + 1);
                           
    const forgedKey = `auradash_pk.${modifiedPayload}.${parts[2]}`;

    mockContext.req.header.mockReturnValue(forgedKey);
    const response: any = await apiKeyAuth(mockContext, mockNext);
    
    expect(response.status).toBe(401);
    expect(response.data.slug).toBe('INVALID_API_KEY');
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject a key composed of mismatched payload and signature', async () => {
    const partsA = validKey.split('.');
    const partsB = anotherValidKey.split('.');
    
    // Take payload from A and signature from B
    const frankensteinKey = `auradash_pk.${partsA[1]}.${partsB[2]}`;

    mockContext.req.header.mockReturnValue(frankensteinKey);
    const response: any = await apiKeyAuth(mockContext, mockNext);
    
    expect(response.status).toBe(401);
    expect(response.data.slug).toBe('INVALID_API_KEY');
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject domains that are partial string matches', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      const lower = name.toLowerCase();
      if (lower === 'x-api-key') return validKey;
      if (lower === 'origin') return 'https://not-trusted.com'; 
      return undefined;
    });

    const response: any = await apiKeyAuth(mockContext, mockNext);
    
    expect(response.status).toBe(403);
    expect(response.data.slug).toBe('DOMAIN_MISMATCH');
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject keys with manipulated system prefixes', async () => {
    const parts = validKey.split('.');
    
    // Change 'auradash_pk' to 'admin_pk'
    const forgedPrefixKey = `admin_pk.${parts[1]}.${parts[2]}`;

    mockContext.req.header.mockReturnValue(forgedPrefixKey);
    const response: any = await apiKeyAuth(mockContext, mockNext);
    
    expect(response.status).toBe(401);
    expect(response.data.slug).toBe('INVALID_API_KEY');
    expect(mockNext).not.toHaveBeenCalled();
  });

  describe('Test API Key (auradash_ts) Middleware Integration', () => {
    let validTestKey: string;

    beforeEach(async () => {
      const result = await generateTestApiKey(2, MASTER_SECRET);
      validTestKey = result.fullKey;
    });

    it('should authorize test key even without Origin or Referer headers', async () => {
      mockContext.req.header.mockImplementation((name: string) => {
        if (name.toLowerCase() === 'x-api-key') return validTestKey;
        return undefined; // No origin or referer headers
      });

      await apiKeyAuth(mockContext, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('apiKeyDomain', 'test');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should authorize test key when Origin/Referer are present', async () => {
      mockContext.req.header.mockImplementation((name: string) => {
        const lower = name.toLowerCase();
        if (lower === 'x-api-key') return validTestKey;
        if (lower === 'origin') return 'https://localhost:3000';
        return undefined;
      });

      await apiKeyAuth(mockContext, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('apiKeyDomain', 'test');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject requests with expired test key', async () => {
      // Create a test key that expires in the past manually
      const result = await generateTestApiKey(1, MASTER_SECRET);
      const parts = result.fullKey.split('.');
      
      const payloadBuffer = new TextEncoder().encode(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const payload = JSON.parse(new TextDecoder().decode(payloadBuffer));
      payload.exp = Math.floor(Date.now() / 1000) - 60; // Expired 1 minute ago

      const binaryStr = String.fromCharCode(...new TextEncoder().encode(JSON.stringify(payload)));
      const base64Payload = btoa(binaryStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      // Re-sign
      const textEncoder = new TextEncoder();
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        textEncoder.encode(MASTER_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const newShort = `auradash_ts.${base64Payload}`;
      const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, textEncoder.encode(newShort));
      const sigBinary = String.fromCharCode(...new Uint8Array(sigBuf));
      const base64Sig = btoa(sigBinary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const expiredKey = `${newShort}.${base64Sig}`;

      mockContext.req.header.mockReturnValue(expiredKey);
      const response: any = await apiKeyAuth(mockContext, mockNext);

      expect(response.status).toBe(401);
      expect(response.data.slug).toBe('INVALID_API_KEY');
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Additional Robustness Tests', () => {
    it('should match and authorize trusted domains even when Origin header includes port numbers', async () => {
      mockContext.req.header.mockImplementation((name: string) => {
        const lower = name.toLowerCase();
        if (lower === 'x-api-key') return validKey;
        if (lower === 'origin') return 'https://trusted.com:8080';
        return undefined;
      });

      await apiKeyAuth(mockContext, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('apiKeyDomain', 'trusted.com');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should trim API Key header if it contains leading/trailing whitespaces', async () => {
      mockContext.req.header.mockImplementation((name: string) => {
        const lower = name.toLowerCase();
        if (lower === 'x-api-key') return `  ${validKey}   `;
        if (lower === 'origin') return 'https://trusted.com';
        return undefined;
      });

      await apiKeyAuth(mockContext, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('apiKeyDomain', 'trusted.com');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 DOMAIN_MISMATCH if the Origin or Referer header contains a malformed URL', async () => {
      mockContext.req.header.mockImplementation((name: string) => {
        const lower = name.toLowerCase();
        if (lower === 'x-api-key') return validKey;
        if (lower === 'origin') return 'http://[invalid-ipv6';
        return undefined;
      });

      const response: any = await apiKeyAuth(mockContext, mockNext);

      expect(response.status).toBe(403);
      expect(response.data.slug).toBe('DOMAIN_MISMATCH');
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
