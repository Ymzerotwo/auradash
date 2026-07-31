import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CustomerController } from '../../src/controllers/customer.controller';
import { CustomerService } from '../../src/services/customer.services';

describe('CustomerController', () => {
  let mockContext: any;
  let getCustomersSpy: any;
  let getCustomerStatsSpy: any;
  let getCustomerByIdSpy: any;
  let createCustomerSpy: any;
  let updateCustomerSpy: any;
  let deleteCustomerSpy: any;
  let markAsSpamSpy: any;
  let removeFromSpamSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    getCustomersSpy = vi.spyOn(CustomerService, 'getCustomers');
    getCustomerStatsSpy = vi.spyOn(CustomerService, 'getCustomerStats');
    getCustomerByIdSpy = vi.spyOn(CustomerService, 'getCustomerById');
    createCustomerSpy = vi.spyOn(CustomerService, 'createCustomer');
    updateCustomerSpy = vi.spyOn(CustomerService, 'updateCustomer');
    deleteCustomerSpy = vi.spyOn(CustomerService, 'deleteCustomer');
    markAsSpamSpy = vi.spyOn(CustomerService, 'markAsSpam');
    removeFromSpamSpy = vi.spyOn(CustomerService, 'removeFromSpam');

    mockContext = {
      req: {
        url: 'http://localhost/api/customers',
        query: vi.fn(),
        param: vi.fn(),
        json: vi.fn()
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

  describe('getCustomers', () => {
    it('should query customers with role criteria', async () => {
      mockContext.get.mockReturnValue({ role: 'Admin' });
      mockContext.req.query.mockImplementation((key: string) => {
        if (key === 'status') return 'spam';
        return '';
      });
      getCustomersSpy.mockResolvedValue({
        data: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
      });

      const response: any = await CustomerController.getCustomers(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('CUSTOMERS_FETCHED');
    });
  });

  describe('getStats', () => {
    it('should return customer metrics', async () => {
      getCustomerStatsSpy.mockResolvedValue({ total: 5, spammed: 1, active: 4 });

      const response: any = await CustomerController.getStats(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.data.total).toBe(5);
    });
  });

  describe('createCustomer', () => {
    it('should handle unique constraint phone error with 409', async () => {
      mockContext.req.json.mockResolvedValue({
        full_name: 'Ahmad',
        phone: '+12345678',
        email: 'ahmad@example.com'
      });
      createCustomerSpy.mockRejectedValue(new Error('PHONE_ALREADY_EXISTS'));

      const response: any = await CustomerController.createCustomer(mockContext);
      expect(response.status).toBe(409);
      expect(response.data.slug).toBe('PHONE_ALREADY_EXISTS');
    });
  });

  describe('deleteCustomer', () => {
    it('should deny non-admins', async () => {
      mockContext.get.mockReturnValue({ role: 'Staff' });

      const response: any = await CustomerController.deleteCustomer(mockContext);
      expect(response.status).toBe(403);
    });
  });

  describe('markAsSpam', () => {
    it('should mark customer as spam with valid reason', async () => {
      mockContext.get.mockReturnValue({ id: 'admin_1' });
      mockContext.req.param.mockReturnValue('cust_1');
      mockContext.req.json.mockResolvedValue({ reason: 'Spamming calls' });
      markAsSpamSpy.mockResolvedValue({ success: true });

      const response: any = await CustomerController.markAsSpam(mockContext);
      expect(response.status).toBe(200);
      expect(response.data.slug).toBe('CUSTOMER_SPAMMED');
    });
  });
});
