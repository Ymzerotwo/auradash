import { apiClient, ApiError } from '../api/client';

export interface DashboardStats {
  bookingsCount: number;
  bookingsDiffPercent: number;
  newCommentsCount: number;
  newCommentsDiffPercent: number;
  newInboxMessagesCount: number;
  newInboxMessagesDiffPercent: number;
  totalRevenue: number;
  revenueDiffPercent: number;
  newCustomersCount: number;
  newCustomersDiffPercent: number;
  totalCustomers: number;
}

export interface TimelineEvent {
  id: string;
  type: 'NEW_BOOKING' | 'BOOKING_CONFIRMED' | 'BOOKING_COMPLETED' | 'BOOKING_CANCELLED' | 'NEW_COMMENT' | 'NEW_INBOX_MESSAGE';
  timestamp: string;
  title: string;
  status: string;
}

export interface DashboardData {
  stats: DashboardStats;
  timeline: TimelineEvent[];
  hasMore: boolean;
  page: number;
  limit: number;
}

export const DashboardService = {
  getDashboardData: async (startDate?: string, endDate?: string, page?: number, limit?: number): Promise<DashboardData> => {
    try {
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);
      if (page !== undefined) query.append('page', page.toString());
      if (limit !== undefined) query.append('limit', limit.toString());
      
      const qs = query.toString();
      const response = await apiClient.get<{ data: DashboardData }>(`/dashboard${qs ? `?${qs}` : ''}`);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) throw new Error(error.slug.toLowerCase());
      throw error;
    }
  }
};
