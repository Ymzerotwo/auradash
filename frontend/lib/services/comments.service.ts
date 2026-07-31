import { apiClient } from '../api/client';

export interface Comment {
  id: string;
  article_id: string;
  article_title?: string;
  user_name: string;
  user_email: string | null;
  parent_id: string | null;
  user_id: string | null;
  user_full_name?: string | null;
  parent_user_name?: string | null;
  content: string;
  status: 'pending' | 'approved' | 'spam';
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  approved_by_name?: string | null;
}

export interface PaginatedComments {
  comments: Comment[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const CommentsService = {
  getAll: async (params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<PaginatedComments> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);
    
    const response = await apiClient.get<{ data: any }>(`/comments?${searchParams.toString()}`);
    return {
      comments: response.data.data || [],
      pagination: response.data.pagination
    };
  },

  approve: async (id: string): Promise<void> => {
    await apiClient.patch(`/comments/${id}/approve`, {});
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/comments/${id}`);
  },

  reply: async (id: string, content: string): Promise<Comment> => {
    const response = await apiClient.post<{ data: Comment }>(`/comments/${id}/reply`, { content });
    return response.data;
  }
};
