import { apiClient, ApiError } from '../api/client';
import { CreateCustomerDTO, UpdateCustomerDTO } from '../validations/customer.schema';

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  gender?: 'male' | 'female';
  date_of_birth?: string;
  city?: string;
  acquisition_source?: string;
  tags: string[];
  spam: boolean;
  spam_reason?: string;
  add_spam_by_name?: string;
  add_spam_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  updated_by_name?: string;
  last_visit_at?: string;
  bookings?: any[];
  comments?: any[];
}

export interface PaginatedCustomers {
  data: Customer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CustomerStats {
  total: number;
  active: number;
  spammed: number;
}

export const CustomerService = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<PaginatedCustomers> => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.search) searchParams.append('search', params.search);
      if (params?.status && params.status !== 'all') searchParams.append('status', params.status);

      const response = await apiClient.get<{ data: PaginatedCustomers }>(`/customers?${searchParams.toString()}`);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) throw new Error(error.slug.toLowerCase());
      throw error;
    }
  },

  getStats: async (): Promise<CustomerStats> => {
    try {
      const response = await apiClient.get<{ data: CustomerStats }>('/customers/stats');
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) throw new Error(error.slug.toLowerCase());
      throw error;
    }
  },

  getById: async (id: string): Promise<Customer> => {
    try {
      const response = await apiClient.get<{ data: Customer }>(`/customers/${id}`);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) throw new Error(error.slug.toLowerCase());
      throw error;
    }
  },

  create: async (data: CreateCustomerDTO): Promise<{ id: string }> => {
    try {
      const response = await apiClient.post<{ data: { id: string } }>('/customers', data);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) throw new Error(error.slug.toLowerCase());
      throw error;
    }
  },

  update: async (id: string, data: UpdateCustomerDTO): Promise<void> => {
    try {
      await apiClient.put(`/customers/${id}`, data);
    } catch (error) {
      if (error instanceof ApiError) throw new Error(error.slug.toLowerCase());
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/customers/${id}`);
    } catch (error) {
      if (error instanceof ApiError) throw new Error(error.slug.toLowerCase());
      throw error;
    }
  },

  markAsSpam: async (id: string, reason: string): Promise<void> => {
    try {
      await apiClient.put(`/customers/${id}/spam`, { reason });
    } catch (error) {
      if (error instanceof ApiError) throw new Error(error.slug.toLowerCase());
      throw error;
    }
  },

  removeFromSpam: async (id: string): Promise<void> => {
    try {
      await apiClient.put(`/customers/${id}/unspam`, {});
    } catch (error) {
      if (error instanceof ApiError) throw new Error(error.slug.toLowerCase());
      throw error;
    }
  }
};
