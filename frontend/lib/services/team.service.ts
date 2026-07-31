import { apiClient } from "../api/client";

export interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  username: string;
  photo_url: string | null;
  role: 'Admin' | 'User';
  job_title: string | null;
  is_banned: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
  password_updated_at?: string | null;
  password_updated_by?: string | null;
  banned_by?: string | null;
  permissions?: Record<string, any> | null;
}

export interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  suspendedMembers: number;
  adminsCount: number;
}

export interface PaginatedTeam {
  team: TeamMember[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Backend envelope shape: { success, data: T, ... } */
interface ApiEnvelope<T> {
  data: T;
}

export const TeamService = {
  getStats: async (): Promise<TeamStats> => {
    const res = await apiClient.get<ApiEnvelope<{ stats: TeamStats }>>('/team/stats');
    return res.data.stats;
  },

  getAll: async (params?: { search?: string; page?: number; limit?: number; status?: string }): Promise<PaginatedTeam> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    const qs = query.toString();
    const res = await apiClient.get<ApiEnvelope<PaginatedTeam>>(`/team${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  getById: async (id: string): Promise<TeamMember> => {
    const res = await apiClient.get<ApiEnvelope<{ member: TeamMember }>>(`/team/${id}`);
    return res.data.member;
  },

  create: async (data: Partial<Omit<TeamMember, 'id' | 'created_at'>> & { password?: string }): Promise<string> => {
    const res = await apiClient.post<ApiEnvelope<{ id: string }>>('/team', data);
    return res.data.id;
  },

  update: async (id: string, data: Partial<Omit<TeamMember, 'id' | 'created_at'>> & { password?: string }): Promise<void> => {
    await apiClient.put<ApiEnvelope<null>>(`/team/${id}`, data);
  },

  toggleStatus: async (id: string, data: { is_banned?: boolean }): Promise<void> => {
    await apiClient.patch<ApiEnvelope<null>>(`/team/${id}/status`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete<ApiEnvelope<null>>(`/team/${id}`);
  }
};
