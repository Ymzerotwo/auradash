/**
 * ==========================================
 *        AuraDash API Key Services
 * ==========================================
 * 
 * Frontend services to interact with AuraDash API Key endpoints.
 */

import { apiClient as api } from '../api/client';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiKey {
  id: string;
  name: string;
  domain: string;
  short_key: string;
  created_at?: string;
  type: 'production' | 'test';
  expires_at?: string;
  is_expired?: boolean;
  created_by?: string;
  created_by_name?: string;
}

export interface CreateApiKeyRequest {
  name: string;
  domain?: string;
  type: 'production' | 'test';
  expiresInHours?: number;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  domain: string;
  apiKey: string; // The full key (only shown once)
  created_at: string;
  type: 'production' | 'test';
  expires_at?: string;
}

export const ApiKeyService = {
  /**
   * Fetches a paginated list of API keys from the workspace.
   * 
   * @param page - Current page number.
   * @param limit - Number of keys per page.
   * @returns A promise resolving to a paginated response of API keys.
   */
  getApiKeys: async (page: number = 1, limit: number = 20): Promise<PaginatedResponse<ApiKey>> => {
    const response = await api.get<{ data: PaginatedResponse<ApiKey> }>(`/workspace/apikeys?page=${page}&limit=${limit}`);
    return response.data;
  },

  /**
   * Generates a new API Key (production or test).
   * 
   * @param data - The request data containing name, type, and optional domain/expiration.
   * @returns A promise resolving to the created key metadata and the full API key.
   */
  createApiKey: async (data: CreateApiKeyRequest): Promise<CreateApiKeyResponse> => {
    const response = await api.post<{ data: CreateApiKeyResponse }>('/workspace/apikeys', data);
    return response.data;
  },

  /**
   * Deletes (revokes) an API Key by its ID.
   * 
   * @param id - The ID of the key to delete.
   * @returns A promise resolving when the deletion is complete.
   */
  deleteApiKey: async (id: string): Promise<void> => {
    await api.delete(`/workspace/apikeys/${id}`);
  }
};
