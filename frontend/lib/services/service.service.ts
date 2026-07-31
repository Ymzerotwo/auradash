import { apiClient } from "../api/client";

export interface ServiceData {
  id: string;
  category_id?: string | null;
  name: string;
  slug: string;
  meta_data?: unknown[];
  seo_data?: Record<string, unknown>;
  sort_order: number;
  is_active: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedService {
  services: ServiceData[];
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

export const ServiceService = {
  getAll: async (params?: { search?: string; category_id?: string; page?: number; limit?: number; status?: string }): Promise<PaginatedService> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category_id) query.append('category_id', params.category_id);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.status) query.append('status', params.status);
    const qs = query.toString();
    const res = await apiClient.get<ApiEnvelope<PaginatedService>>(`/services${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  getById: async (id: string): Promise<ServiceData> => {
    const res = await apiClient.get<ApiEnvelope<{ service: ServiceData }>>(`/services/${id}`);
    return res.data.service;
  },

  create: async (data: Partial<Omit<ServiceData, 'id' | 'created_at' | 'updated_at'>>): Promise<string> => {
    const res = await apiClient.post<ApiEnvelope<{ id: string }>>('/services', data);
    return res.data.id;
  },

  update: async (id: string, data: Partial<Omit<ServiceData, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
    await apiClient.put<ApiEnvelope<null>>(`/services/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete<ApiEnvelope<null>>(`/services/${id}`);
  }
};
