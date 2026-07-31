import { apiClient } from "../api/client";

export interface BookingServiceItem {
  service_id?: string;
  name?: string;
  price?: number;
  discount?: number;
}

export interface Booking {
  id: string;
  booking_number?: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  scheduled_from: string;
  scheduled_to: string;
  services_data: BookingServiceItem[];
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  paid_status: 'unpaid' | 'partial' | 'paid' | 'refunded';
  paid_amount: number;
  total_paid: number;
  payment_history?: Array<{
    date: string;
    amount: number;
    added_by: string;
    added_by_name?: string;
    notes?: string;
  }>;
  updated_by?: string;
  updated_by_name?: string;
  updated_at?: string;
  completed_by?: string;
  completed_by_name?: string;
  completed_at?: string;
  cancelled_by?: string;
  cancelled_by_name?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
}

export interface PaginatedBookings {
  data: Booking[];
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

export const BookingService = {
  getAll: async (params?: { search?: string; page?: number; limit?: number; status?: string }): Promise<PaginatedBookings> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.status && params.status !== 'all') query.append('status', params.status);

    const qs = query.toString();
    const url = `/bookings${qs ? `?${qs}` : ''}`;
    const res = await apiClient.get<ApiEnvelope<PaginatedBookings>>(url);
    return res.data;
  },

  getById: async (id: string): Promise<Booking> => {
    const res = await apiClient.get<ApiEnvelope<Booking>>(`/bookings/${id}`);
    return res.data;
  },

  create: async (data: any): Promise<Booking> => {
    const res = await apiClient.post<ApiEnvelope<Booking>>('/bookings', data);
    return res.data;
  },

  update: async (id: string, data: any): Promise<void> => {
    await apiClient.put(`/bookings/${id}`, data);
  },

  changeStatus: async (id: string, data: any): Promise<void> => {
    await apiClient.patch(`/bookings/${id}/status`, data);
  },

  recordPayment: async (id: string, data: { amount: number; notes?: string }): Promise<any> => {
    const res = await apiClient.post<ApiEnvelope<any>>(`/bookings/${id}/payments`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/bookings/${id}`);
  }
};
