import { apiClient } from "../api/client";

export interface ArticleCategory {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  preview_image_url?: string | null;
  meta_data?: Record<string, unknown> | unknown[];
  seo_data?: Record<string, unknown>;
  sort_order: number;
  is_active: boolean | number;
  created_at: string;
  created_by?: string;
  created_by_name?: string;
  updated_at?: string;
  updated_by?: string;
  updated_by_name?: string;
}

export interface PaginatedArticleCategory {
  categories: ArticleCategory[];
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

export const ArticleCategoryService = {
  getAll: async (params?: { search?: string; status?: string; page?: number; limit?: number }): Promise<PaginatedArticleCategory> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    const res = await apiClient.get<ApiEnvelope<PaginatedArticleCategory>>(`/article-categories${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  getById: async (id: string): Promise<ArticleCategory> => {
    const res = await apiClient.get<ApiEnvelope<{ category: ArticleCategory }>>(`/article-categories/${id}`);
    return res.data.category;
  },

  create: async (data: Partial<Omit<ArticleCategory, 'id' | 'created_at' | 'updated_at'>>): Promise<string> => {
    const res = await apiClient.post<ApiEnvelope<{ id: string }>>('/article-categories', data);
    return res.data.id;
  },

  update: async (id: string, data: Partial<Omit<ArticleCategory, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
    await apiClient.put<ApiEnvelope<null>>(`/article-categories/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete<ApiEnvelope<null>>(`/article-categories/${id}`);
  }
};
