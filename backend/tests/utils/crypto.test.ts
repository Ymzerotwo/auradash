import { describe, it, expect, vi } from 'vitest';
import { 
  hashPassword, verifyPassword, timingSafeEqual,
  normalizeDomain, generateApiKey, generateTestApiKey, verifyApiKey 
} from '../../src/utils/crypto';

// ─── hashPassword Tests ────────────────────────────────────────────────────────

describe('Utils: Crypto - hashPassword', () => {
  it('should return a string in salt:hash format', async () => {
    const hash = await hashPassword('TestPassword123');
    expect(hash).toContain(':');
    const [salt, hashPart] = hash.split(':');
    expect(salt).toBeDefined();
    expect(hashPart).toBeDefined();
  });

  it('should produce a 64-char hex salt (32 bytes)', async () => {
    const hash = await hashPassword('TestPassword123');
    const [salt] = hash.split(':');
    expect(salt.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(salt)).toBe(true);
  });

  it('should produce a 64-char hex hash (256 bits)', async () => {
    const hash = await hashPassword('TestPassword123');
    const [, hashPart] = hash.split(':');
    expect(hashPart.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(hashPart)).toBe(true);
  });

  it('should generate different salts for the same password', async () => {
    const hash1 = await hashPassword('SamePassword');
    const hash2 = await hashPassword('SamePassword');
    const [salt1] = hash1.split(':');
    const [salt2] = hash2.split(':');
    expect(salt1).not.toBe(salt2);
  });

  it('should generate different hashes for the same password (due to random salt)', async () => {
    const hash1 = await hashPassword('SamePassword');
    const hash2 = await hashPassword('SamePassword');
    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty string password', async () => {
    const hash = await hashPassword('');
    expect(hash).toContain(':');
    const [salt, hashPart] = hash.split(':');
    expect(salt.length).toBe(64);
    expect(hashPart.length).toBe(64);
  });

  it('should handle unicode password', async () => {
    const hash = await hashPassword('unicode_password_🔐');
    expect(hash).toContain(':');
    const [salt, hashPart] = hash.split(':');
    expect(salt.length).toBe(64);
    expect(hashPart.length).toBe(64);
  });

  it('should handle very long password', async () => {
    const longPassword = 'A'.repeat(10000);
    const hash = await hashPassword(longPassword);
    expect(hash).toContain(':');
  });
});

// ─── verifyPassword Tests ──────────────────────────────────────────────────────

describe('Utils: Crypto - verifyPassword', () => {
  it('should verify correct password against its hash', async () => {
    const password = 'SecurePassword123!';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const hash = await hashPassword('CorrectPassword');
    const isValid = await verifyPassword('WrongPassword', hash);
    expect(isValid).toBe(false);
  });

  it('should reject empty password against a valid hash', async () => {
    const hash = await hashPassword('NonEmptyPassword');
    const isValid = await verifyPassword('', hash);
    expect(isValid).toBe(false);
  });

  it('should verify empty password if it was originally hashed as empty', async () => {
    const hash = await hashPassword('');
    const isValid = await verifyPassword('', hash);
    expect(isValid).toBe(true);
  });

  it('should reject plaintext stored hash (no colon separator)', async () => {
    const isValid = await verifyPassword('password', 'plaintext_no_colon');
    expect(isValid).toBe(false);
  });

  it('should reject corrupted salt (invalid hex)', async () => {
    const isValid = await verifyPassword('password', 'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ:0000000000000000000000000000000000000000000000000000000000000000');
    expect(isValid).toBe(false);
  });

  it('should be case-sensitive for passwords', async () => {
    const hash = await hashPassword('CaseSensitive');
    const isValid = await verifyPassword('casesensitive', hash);
    expect(isValid).toBe(false);
  });

  it('should verify unicode passwords correctly', async () => {
    const password = 'hello_world_🌍';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject similar but different unicode passwords', async () => {
    const hash = await hashPassword('hello_world');
    const isValid = await verifyPassword('hell0_world', hash);
    expect(isValid).toBe(false);
  });

  it('should handle hash with empty salt part', async () => {
    const isValid = await verifyPassword('password', ':0000000000000000000000000000000000000000000000000000000000000000');
    expect(isValid).toBe(false);
  });
});

// ─── timingSafeEqual Tests ─────────────────────────────────────────────────────

describe('Utils: Crypto - timingSafeEqual', () => {
  it('should return true for identical strings', () => {
    expect(timingSafeEqual('abc123', 'abc123')).toBe(true);
  });

  it('should return false for different strings of same length', () => {
    expect(timingSafeEqual('abc123', 'abc124')).toBe(false);
  });

  it('should return false for different length strings', () => {
    expect(timingSafeEqual('short', 'longer_string')).toBe(false);
  });

  it('should return true for empty strings', () => {
    expect(timingSafeEqual('', '')).toBe(true);
  });

  it('should handle unicode strings', () => {
    expect(timingSafeEqual('hello_🌍', 'hello_🌍')).toBe(true);
    expect(timingSafeEqual('hello_🌍', 'hello_🌎')).toBe(false);
  });

  it('should handle 64-char hex tokens (CSRF-sized)', () => {
    const token = 'a'.repeat(64);
    const same = 'a'.repeat(64);
    const diff = 'a'.repeat(63) + 'b';
    expect(timingSafeEqual(token, same)).toBe(true);
    expect(timingSafeEqual(token, diff)).toBe(false);
  });
});

// ─── normalizeDomain Tests ─────────────────────────────────────────────────────

describe('Utils: Crypto - normalizeDomain', () => {
  it('should extract hostname from full URL', () => {
    expect(normalizeDomain('https://example.com/path')).toBe('example.com');
  });

  it('should remove www prefix', () => {
    expect(normalizeDomain('https://www.example.com')).toBe('example.com');
  });

  it('should handle bare domain without protocol', () => {
    expect(normalizeDomain('example.com')).toBe('example.com');
  });

  it('should handle domain with www and no protocol', () => {
    expect(normalizeDomain('www.example.com')).toBe('example.com');
  });

  it('should lowercase the domain', () => {
    expect(normalizeDomain('HTTPS://EXAMPLE.COM')).toBe('example.com');
  });

  it('should handle http protocol', () => {
    expect(normalizeDomain('http://example.com')).toBe('example.com');
  });

  it('should trim whitespace', () => {
    expect(normalizeDomain('  example.com  ')).toBe('example.com');
  });

  it('should handle subdomains', () => {
    expect(normalizeDomain('https://api.example.com')).toBe('api.example.com');
  });

  it('should handle domain with port', () => {
    expect(normalizeDomain('https://example.com:8080')).toBe('example.com');
  });

  it('should handle localhost', () => {
    expect(normalizeDomain('http://localhost:3000')).toBe('localhost');
  });
});

// ─── generateApiKey + verifyApiKey Integration Tests ───────────────────────────

describe('Utils: Crypto - API Key Generation & Verification', () => {
  const SECRET = 'test-secret-key-for-unit-tests';

  it('should generate a key with 3 dot-separated parts', async () => {
    const result = await generateApiKey('example.com', SECRET);
    const parts = result.fullKey.split('.');
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe('auradash_pk');
  });

  it('should produce a shortKey without the signature', async () => {
    const result = await generateApiKey('example.com', SECRET);
    expect(result.shortKey).toBe(result.fullKey.split('.').slice(0, 2).join('.'));
  });

  it('should include domain in the payload', async () => {
    const result = await generateApiKey('example.com', SECRET);
    const payload = JSON.parse(result.payloadStr);
    expect(payload.domain).toBe('example.com');
    expect(payload.iat).toBeDefined();
  });

  it('should normalize domain in the key (strip www)', async () => {
    const result = await generateApiKey('www.example.com', SECRET);
    const payload = JSON.parse(result.payloadStr);
    expect(payload.domain).toBe('example.com');
  });

  it('should verify a valid key', async () => {
    const { fullKey } = await generateApiKey('example.com', SECRET);
    const result = await verifyApiKey(fullKey, SECRET);
    expect(result.valid).toBe(true);
    expect(result.normalizedDomain).toBe('example.com');
  });

  it('should reject a key signed with a different secret', async () => {
    const { fullKey } = await generateApiKey('example.com', SECRET);
    const result = await verifyApiKey(fullKey, 'wrong-secret');
    expect(result.valid).toBe(false);
  });

  it('should reject a tampered payload', async () => {
    const { fullKey } = await generateApiKey('example.com', SECRET);
    const parts = fullKey.split('.');
    // Flip a character in the payload
    const p = parts[1];
    const tampered = p.substring(0, 1) + (p[1] === 'a' ? 'b' : 'a') + p.substring(2);
    const tamperedKey = `auradash_pk.${tampered}.${parts[2]}`;
    const result = await verifyApiKey(tamperedKey, SECRET);
    expect(result.valid).toBe(false);
  });

  it('should reject empty/null/undefined input', async () => {
    expect((await verifyApiKey('', SECRET)).valid).toBe(false);
    expect((await verifyApiKey(null as any, SECRET)).valid).toBe(false);
    expect((await verifyApiKey(undefined as any, SECRET)).valid).toBe(false);
  });

  it('should reject key with wrong prefix', async () => {
    const { fullKey } = await generateApiKey('example.com', SECRET);
    const parts = fullKey.split('.');
    const result = await verifyApiKey(`wrong_prefix.${parts[1]}.${parts[2]}`, SECRET);
    expect(result.valid).toBe(false);
  });

  it('should reject key with wrong number of parts', async () => {
    expect((await verifyApiKey('auradash_pk.payload', SECRET)).valid).toBe(false);
    expect((await verifyApiKey('a.b.c.d', SECRET)).valid).toBe(false);
  });

  it('should return payload with domain and iat for valid keys', async () => {
    const { fullKey } = await generateApiKey('test.io', SECRET);
    const result = await verifyApiKey(fullKey, SECRET);
    expect(result.valid).toBe(true);
    expect(result.payload).toBeDefined();
    expect(result.payload.domain).toBe('test.io');
    expect(typeof result.payload.iat).toBe('number');
  });

  describe('Test API Key Generation & Verification (auradash_ts)', () => {
    it('should generate a test key prefixed with auradash_ts', async () => {
      const result = await generateTestApiKey(24, SECRET);
      const parts = result.fullKey.split('.');
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('auradash_ts');
    });

    it('should include exp and iat in test key payload', async () => {
      const result = await generateTestApiKey(24, SECRET);
      const payload = JSON.parse(result.payloadStr);
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.exp - payload.iat).toBe(24 * 3600);
    });

    it('should enforce maximum of 24 hours for test keys', async () => {
      const result = await generateTestApiKey(48, SECRET); // requested 48 hours
      const payload = JSON.parse(result.payloadStr);
      expect(payload.exp - payload.iat).toBe(24 * 3600); // capped at 24 hours
    });

    it('should verify a valid test key', async () => {
      const { fullKey } = await generateTestApiKey(2, SECRET);
      const result = await verifyApiKey(fullKey, SECRET);
      expect(result.valid).toBe(true);
      expect(result.isTestKey).toBe(true);
      expect(result.normalizedDomain).toBeUndefined();
    });

    it('should reject an expired test key', async () => {
      // Mock generateTestApiKey or manipulate exp
      const result = await generateTestApiKey(1, SECRET);
      const payload = JSON.parse(result.payloadStr);
      
      // Manually tamper the payload to set exp to past time
      payload.exp = Math.floor(Date.now() / 1000) - 10;
      
      // Re-sign modified payload
      const textEncoder = new TextEncoder();
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        textEncoder.encode(SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const parts = result.fullKey.split('.');
      const binary = textEncoder.encode(JSON.stringify(payload));
      let binaryStr = '';
      for (let i = 0; i < binary.byteLength; i++) {
        binaryStr += String.fromCharCode(binary[i]);
      }
      const base64Payload = btoa(binaryStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      
      const newShort = `auradash_ts.${base64Payload}`;
      const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, textEncoder.encode(newShort));
      
      const sigBytes = new Uint8Array(sigBuf);
      let sigBinary = '';
      for (let i = 0; i < sigBytes.byteLength; i++) {
        sigBinary += String.fromCharCode(sigBytes[i]);
      }
      const newSig = btoa(sigBinary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const expiredKey = `${newShort}.${newSig}`;

      const verifyResult = await verifyApiKey(expiredKey, SECRET);
      expect(verifyResult.valid).toBe(false);
    });

    it('should reject a forged test key', async () => {
      const { fullKey } = await generateTestApiKey(1, SECRET);
      const parts = fullKey.split('.');
      // Tamper signature
      const tamperedKey = `auradash_ts.${parts[1]}.invalid_signature`;
      const verifyResult = await verifyApiKey(tamperedKey, SECRET);
      expect(verifyResult.valid).toBe(false);
    });
  });

  describe('Additional Robustness Tests', () => {
    it('should return false in timingSafeEqual when strings have different lengths', () => {
      expect(timingSafeEqual('short', 'muchlongerstring')).toBe(false);
      expect(timingSafeEqual('muchlongerstring', 'short')).toBe(false);
    });

    it('should correctly normalize domain when Origin or Referer contains a path, query parameters, or hash', () => {
      expect(normalizeDomain('https://sub.domain.com/path/to/page?query=value#hash')).toBe('sub.domain.com');
      expect(normalizeDomain('http://localhost:3000/index.html')).toBe('localhost');
    });
  });
});
