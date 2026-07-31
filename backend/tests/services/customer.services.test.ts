import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerService } from '../../src/services/customer.services';

describe('CustomerService', () => {
  let mockDb: any;
  let mockKV: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      all: vi.fn().mockResolvedValue({ results: [] }),
      first: vi.fn().mockResolvedValue(null),
      batch: vi.fn().mockResolvedValue([{ meta: { changes: 1 } }])
    };

    mockKV = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined)
    };
  });

  describe('getCustomers', () => {
    it('should query spam status and paginate customers list', async () => {
      mockDb.all.mockResolvedValue({
        results: [{ id: 'cust_1', full_name: 'John Doe', tags: '["vip"]', spam: 0 }]
      });
      mockDb.first.mockResolvedValue({ total: 1 });

      const result = await CustomerService.getCustomers(mockDb as any, 'Admin', 1, 10, 'John', false);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].spam).toBe(false);
      expect(result.data[0].tags).toEqual(['vip']);
      expect(result.pagination.total).toBe(1);
    });

    it('should redact spam details for non-Admin users', async () => {
      mockDb.all.mockResolvedValue({
        results: [{ id: 'cust_1', full_name: 'John Doe', spam_reason: 'Abuse', add_spam_by_name: 'admin_1' }]
      });
      mockDb.first.mockResolvedValue({ total: 1 });

      const result = await CustomerService.getCustomers(mockDb as any, 'Staff', 1, 10, undefined, true);

      expect(result.data[0].spam_reason).toBeUndefined();
      expect(result.data[0].add_spam_by_name).toBeUndefined();
    });
  });

  describe('getCustomerStats', () => {
    it('should compute totals of active and spammed customers', async () => {
      mockDb.first.mockResolvedValue({ total: 10, spammed: 2, active: 8 });

      const stats = await CustomerService.getCustomerStats(mockDb as any);
      expect(stats.total).toBe(10);
      expect(stats.spammed).toBe(2);
      expect(stats.active).toBe(8);
    });
  });

  describe('getCustomerById', () => {
    it('should throw CUSTOMER_NOT_FOUND when customer does not exist', async () => {
      mockDb.first.mockResolvedValue(null);

      await expect(CustomerService.getCustomerById(mockDb as any, 'invalid', 'Admin'))
        .rejects.toThrow('CUSTOMER_NOT_FOUND');
    });

    it('should return customer details', async () => {
      mockDb.first.mockResolvedValue({ id: 'cust_123', spam: 1, tags: '["regular"]' });

      const result = await CustomerService.getCustomerById(mockDb as any, 'cust_123', 'Admin');
      expect(result.spam).toBe(true);
      expect(result.tags).toEqual(['regular']);
    });
  });

  describe('createCustomer', () => {
    it('should create customer and return newly generated UUID id', async () => {
      const result = await CustomerService.createCustomer(mockDb as any, {
        full_name: 'Ahmad',
        phone: '123456789',
        email: 'ahmad@example.com'
      });

      expect(result.id).toBeDefined();
      expect(mockDb.run).toHaveBeenCalled();
    });

    it('should throw PHONE_ALREADY_EXISTS on unique phone collision', async () => {
      mockDb.run.mockRejectedValue(new Error('UNIQUE constraint failed: Customers.phone'));

      await expect(CustomerService.createCustomer(mockDb as any, {
        full_name: 'Ahmad',
        phone: '123456789',
        email: 'ahmad@example.com'
      })).rejects.toThrow('PHONE_ALREADY_EXISTS');
    });
  });

  describe('updateCustomer', () => {
    it('should throw CUSTOMER_NOT_FOUND if no target user exists', async () => {
      mockDb.first.mockResolvedValue(null);

      await expect(CustomerService.updateCustomer(mockDb as any, 'c1', { full_name: 'Ahmad' }))
        .rejects.toThrow('CUSTOMER_NOT_FOUND');
    });

    it('should update and execute successfully', async () => {
      mockDb.first.mockResolvedValue({ id: 'c1' });

      const result = await CustomerService.updateCustomer(mockDb as any, 'c1', { full_name: 'Ahmad' });
      expect(result.success).toBe(true);
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('deleteCustomer', () => {
    it('should throw CUSTOMER_NOT_FOUND if row changes is 0', async () => {
      mockDb.run.mockResolvedValue({ success: true, meta: { changes: 0 } });

      await expect(CustomerService.deleteCustomer(mockDb as any, 'c1'))
        .rejects.toThrow('CUSTOMER_NOT_FOUND');
    });
  });

  describe('markAsSpam', () => {
    it('should update DB and register KV entries', async () => {
      mockDb.first.mockResolvedValue({ phone: '123', email: 'spam@mail.com' });

      const result = await CustomerService.markAsSpam(mockDb as any, mockKV as any, 'c1', 'admin_1', 'Harassment');

      expect(result.success).toBe(true);
      expect(mockKV.put).toHaveBeenCalledWith('spam:phone:123', '1');
      expect(mockKV.put).toHaveBeenCalledWith('spam:email:spam@mail.com', '1');
    });
  });

  describe('removeFromSpam', () => {
    it('should update DB and delete KV entries', async () => {
      mockDb.first.mockResolvedValue({ phone: '123', email: 'spam@mail.com', spam: 1 });
      mockKV.get.mockResolvedValue('1');

      const result = await CustomerService.removeFromSpam(mockDb as any, mockKV as any, 'c1');

      expect(result.success).toBe(true);
      expect(mockKV.delete).toHaveBeenCalledWith('spam:phone:123');
      expect(mockKV.delete).toHaveBeenCalledWith('spam:email:spam@mail.com');
    });
  });

  describe('upsertCustomerFromInbox', () => {
    it('should throw CUSTOMER_IS_SPAMMED if found target has spam=1', async () => {
      mockDb.all.mockResolvedValue({
        results: [{ id: 'c1', phone: '123', spam: 1 }]
      });

      await expect(CustomerService.upsertCustomerFromInbox(mockDb as any, { full_name: 'A', phone: '123' }))
        .rejects.toThrow('CUSTOMER_IS_SPAMMED');
    });

    it('should insert customer if no matching records found', async () => {
      mockDb.all.mockResolvedValue({ results: [] });

      const result = await CustomerService.upsertCustomerFromInbox(mockDb as any, { full_name: 'Ahmad', phone: '123' });
      expect(result.id).toBeDefined();
      expect(mockDb.run).toHaveBeenCalled();
    });
  });
});
