import { apiClient } from '../api/client';

export interface MediaItem {
  id: string;
  file_name: string;
  file_url: string;
  mime_type: string;
  size_bytes: number;
  alt_text: string | null;
  folder: string;
  created_by?: string;
  created_by_name?: string;
  created_at?: string;
}

export interface PaginatedMedia {
  data: MediaItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MediaQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  folder?: string;
  mime_type?: string;
}

export const MediaService = {
  async getAll(params: MediaQueryParams): Promise<PaginatedMedia> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.search) query.append('search', params.search);
    if (params.folder) query.append('folder', params.folder);
    if (params.mime_type) query.append('mime_type', params.mime_type);

    const response = await apiClient.get<{ data: PaginatedMedia }>(`/media?${query.toString()}`);
    return response.data;
  },

  async uploadMedia(file: File, folder: string = '/', altText?: string): Promise<MediaItem> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    if (altText) {
      formData.append('alt_text', altText);
    }

    const response = await apiClient.fetch<{ data: MediaItem }>('/media', {
      method: 'POST',
      body: formData,
    });
    
    return response.data;
  },

  async updateMedia(id: string, data: { file_name?: string; alt_text?: string | null; folder?: string }): Promise<void> {
    await apiClient.patch(`/media/${id}`, data);
  },

  async deleteMedia(id: string): Promise<void> {
    await apiClient.delete(`/media/${id}`);
  }
};
