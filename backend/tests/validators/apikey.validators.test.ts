import { describe, it, expect } from 'vitest';
import { createApiKeySchema } from '../../src/validators/apikey.validators';

describe('Validators: API Key', () => {
  describe('createApiKeySchema - Production Keys', () => {
    it('should accept valid production key configuration', () => {
      const payload = {
        type: 'production',
        name: 'My Production Key',
        domain: 'trusted-domain.com'
      };
      const result = createApiKeySchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('production');
        expect(result.data.name).toBe('My Production Key');
        expect(result.data.domain).toBe('trusted-domain.com');
      }
    });

    it('should default type to production if omitted', () => {
      const payload = {
        name: 'Implicit Prod Key',
        domain: 'trusted.com'
      };
      const result = createApiKeySchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('production');
      }
    });

    it('should reject production key if domain is missing', () => {
      const payload = {
        type: 'production',
        name: 'Missing Domain'
      };
      const result = createApiKeySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const domainIssue = result.error.issues.find(i => i.path.includes('domain'));
        expect(domainIssue).toBeDefined();
        expect(domainIssue?.message).toBe('domain_required');
      }
    });

    it('should reject production key if domain is invalid', () => {
      const payload = {
        type: 'production',
        name: 'Invalid Domain',
        domain: 'not-a-valid-domain'
      };
      const result = createApiKeySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const domainIssue = result.error.issues.find(i => i.path.includes('domain'));
        expect(domainIssue).toBeDefined();
        expect(domainIssue?.message).toBe('invalid_domain');
      }
    });
  });

  describe('createApiKeySchema - Test Keys', () => {
    it('should accept valid test key configuration without domain', () => {
      const payload = {
        type: 'test',
        name: 'My Test Key'
      };
      const result = createApiKeySchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('test');
        expect(result.data.name).toBe('My Test Key');
        expect(result.data.domain).toBeUndefined();
        expect(result.data.expiresInHours).toBe(24); // Defaults to 24
      }
    });

    it('should accept test key with custom expiresInHours within limits', () => {
      const payload = {
        type: 'test',
        name: 'My Short Test Key',
        expiresInHours: 12
      };
      const result = createApiKeySchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expiresInHours).toBe(12);
      }
    });

    it('should reject test key with expiresInHours exceeding 24', () => {
      const payload = {
        type: 'test',
        name: 'Long Test Key',
        expiresInHours: 25
      };
      const result = createApiKeySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const expIssue = result.error.issues.find(i => i.path.includes('expiresInHours'));
        expect(expIssue).toBeDefined();
        expect(expIssue?.message).toBe('expires_too_long');
      }
    });

    it('should reject test key with expiresInHours less than 1', () => {
      const payload = {
        type: 'test',
        name: 'Zero Test Key',
        expiresInHours: 0
      };
      const result = createApiKeySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const expIssue = result.error.issues.find(i => i.path.includes('expiresInHours'));
        expect(expIssue).toBeDefined();
        expect(expIssue?.message).toBe('expires_too_short');
      }
    });
  });
});
