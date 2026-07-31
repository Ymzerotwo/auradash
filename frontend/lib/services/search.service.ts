import { apiClient } from "../api/client";

interface SearchResult {
  query: string;
  total: number;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    sort_order: number;
    is_active: number;
    created_at: string;
  }>;
  services: Array<{
    id: string;
    category_id: string | null;
    name: string;
    slug: string;
    sort_order: number;
    is_active: number;
    created_at: string;
    category_name: string | null;
  }>;
}

interface SlugCheckResult {
  slug: string;
  table: string;
  available: boolean;
}

interface ApiEnvelope<T> {
  data: T;
}

export const SearchService = {
  /**
   * Global search across Categories and Services.
   */
  search: async (params: { q: string; type?: 'all' | 'service-categories' | 'services'; limit?: number }): Promise<SearchResult> => {
    const query = new URLSearchParams();
    query.append('q', params.q);
    if (params.type) query.append('type', params.type);
    if (params.limit) query.append('limit', String(params.limit));
    const res = await apiClient.get<ApiEnvelope<SearchResult>>(`/search?${query.toString()}`);
    return res.data;
  },

  /**
   * Check if a slug is available (unique) in a given table.
   * @param slug - The slug to check
   * @param table - 'service-categories' or 'services'
   * @param excludeId - Optional ID to exclude (for edit mode)
   */
  checkSlug: async (slug: string, table: 'service-categories' | 'services' | 'articles' | 'article_categories', excludeId?: string): Promise<boolean> => {
    const query = new URLSearchParams();
    query.append('slug', slug);
    query.append('table', table);
    if (excludeId) query.append('exclude_id', excludeId);
    const res = await apiClient.get<ApiEnvelope<SlugCheckResult>>(`/check-slug?${query.toString()}`);
    return res.data.available;
  }
};
