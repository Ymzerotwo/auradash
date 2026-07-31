import { apiClient } from "../api/client";

export interface ArticleData {
  id: string;
  category_id?: string | null;
  title: string;
  slug: string;
  excerpt?: string | null;
  preview_image_url?: string | null;
  reading_time_minutes?: number | null;
  author_id?: string | null;
  published_at?: string | null;
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

export interface PaginatedArticle {
  articles: ArticleData[];
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

export const ArticleService = {
  getAll: async (params?: { search?: string; category_id?: string; status?: string; page?: number; limit?: number }): Promise<PaginatedArticle> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category_id) query.append('category_id', params.category_id);
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    const res = await apiClient.get<ApiEnvelope<PaginatedArticle>>(`/articles${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  getById: async (id: string): Promise<ArticleData> => {
    const res = await apiClient.get<ApiEnvelope<{ article: ArticleData }>>(`/articles/${id}`);
    return res.data.article;
  },

  getPublishers: async (): Promise<{ id: string; full_name: string; photo_url: string | null }[]> => {
    const res = await apiClient.get<ApiEnvelope<{ publishers: { id: string; full_name: string; photo_url: string | null }[] }>>('/articles/publishers');
    return res.data.publishers;
  },

  create: async (data: Partial<Omit<ArticleData, 'id' | 'created_at' | 'updated_at'>>): Promise<string> => {
    const res = await apiClient.post<ApiEnvelope<{ id: string }>>('/articles', data);
    return res.data.id;
  },

  update: async (id: string, data: Partial<Omit<ArticleData, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
    await apiClient.put<ApiEnvelope<null>>(`/articles/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete<ApiEnvelope<null>>(`/articles/${id}`);
  }
};
