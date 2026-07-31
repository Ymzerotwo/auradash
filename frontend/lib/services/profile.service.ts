import { apiClient, API_BASE_URL } from '../api/client';

import { type UpdateProfileInput as ProfileUpdateInput } from '../validations/profile.schema';

export type { ProfileUpdateInput };

export const ProfileService = {
  async updateProfile(data: ProfileUpdateInput): Promise<void> {
    await apiClient.put('/profile', data);
  },

  /**
   * Upload a profile avatar using the unified media endpoint.
   * Stores files in the 'avatars' folder.
   * Returns the media ID and absolute photo_url.
   */
  async uploadAvatar({ file }: { file: File }): Promise<{ id: string, file_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'avatars');

    const response = await apiClient.fetch<{ data: { id: string, file_url: string } }>('/media', {
      method: 'POST',
      body: formData
    });
    
    const item = response.data;
    const url = item.file_url;
    const absoluteUrl = url.startsWith('http') 
      ? url 
      : `${API_BASE_URL.replace(/\/api\/?$/, '')}${url.startsWith('/') ? url : '/' + url}`;

    return { id: item.id, file_url: absoluteUrl };
  },
};
