import { apiClient } from "../api/client";

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  meta_data?: unknown[];
  seo_data?: Record<string, unknown>;
  sort_order: number;
  is_active: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedServiceCategory {
  categories: ServiceCategory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ApiEnvelope<T> {
  data: T;
}

export const ServiceCategoryService = {
  getAll: async (params?: { search?: string; page?: number; limit?: number; status?: string }): Promise<PaginatedServiceCategory> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.status) query.append('status', params.status);
    const qs = query.toString();
    const res = await apiClient.get<ApiEnvelope<PaginatedServiceCategory>>(`/service-categories${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  getById: async (id: string): Promise<ServiceCategory> => {
    const res = await apiClient.get<ApiEnvelope<{ category: ServiceCategory }>>(`/service-categories/${id}`);
    return res.data.category;
  },

  create: async (data: Partial<Omit<ServiceCategory, 'id' | 'created_at' | 'updated_at'>>): Promise<string> => {
    const res = await apiClient.post<ApiEnvelope<{ id: string }>>('/service-categories', data);
    return res.data.id;
  },

  update: async (id: string, data: Partial<Omit<ServiceCategory, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
    await apiClient.put<ApiEnvelope<null>>(`/service-categories/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete<ApiEnvelope<null>>(`/service-categories/${id}`);
  }
};
