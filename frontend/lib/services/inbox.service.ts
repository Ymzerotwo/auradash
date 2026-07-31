import { apiClient } from '../api/client';

export interface InboxMessage {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  inquiry_type: 'general' | 'service' | 'offer';
  message?: string;
  status: 'unread' | 'read' | 'converted' | 'spam' | 'profile_created';
  metadata?: any;
  created_at: string;
  converted_by?: string;
  converted_at?: string;
  read_at?: string;
  read_by?: string;
  read_by_name?: string;
  converted_by_name?: string;
  profile_created_at?: string;
  profile_created_by?: string;
  profile_created_by_name?: string;
  add_to_spam_at?: string;
  add_to_spam_by?: string;
  add_to_spam_by_name?: string;
  spam_reason?: string;
}

export interface PaginatedInbox {
  messages: InboxMessage[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const InboxService = {
  getAll: async (params?: { page?: number; limit?: number; status?: string }): Promise<PaginatedInbox> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status && params.status !== 'all') searchParams.append('status', params.status);

    const response = await apiClient.get<{ data: PaginatedInbox }>(`/inbox?${searchParams.toString()}`);
    return response.data;
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get<{ data: { count: number } }>('/inbox/unread-count');
    return response.data;
  },

  updateStatus: async (id: string, status: string, spam_reason?: string): Promise<void> => {
    await apiClient.patch(`/inbox/${id}/status`, { status, spam_reason });
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/inbox/${id}`);
  }
};
