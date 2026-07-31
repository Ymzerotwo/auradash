import { apiClient } from '../api/client';

export interface Notification {
  id: string;
  type: string;
  titleKey: string;
  message_title: string;
  message_body: any;
  url: string | null;
  is_read: number;
  created_at: string;
}

export interface PaginatedNotifications {
  notifications: Notification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const NotificationsService = {
  getNotifications: async (params?: { page?: number; limit?: number }): Promise<PaginatedNotifications> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const response = await apiClient.get<{ data: PaginatedNotifications }>(`/notifications?${searchParams.toString()}`);
    return {
      notifications: response.data.notifications || [],
      pagination: response.data.pagination
    };
  },

  markAsRead: async (id: string): Promise<void> => {
    await apiClient.patch(`/notifications/${id}/read`, {});
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.post('/notifications/mark-all-read', {});
  }
};
