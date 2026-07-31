import { apiClient, API_BASE_URL } from '../api/client';

export interface WorkspaceIdentityPayload {
  siteName: string;
  logoUrl?: string | null;
}

export interface WorkspaceContactPayload {
  contactInfo: {
    whatsapp?: string;
    phone?: string;
    email?: string;
  };
}

export interface WorkspaceSocialPayload {
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
    youtube?: string;
    snapchat?: string;
    telegram?: string;
    pinterest?: string;
    threads?: string;
  };
}

export interface WorkspaceLocationsPayload {
  locations: Array<{
    id: string;
    label?: string;
    address?: string;
    city?: string;
    country?: string;
    mapUrl?: string;
  }>;
}

export interface WorkspaceWorkingHoursPayload {
  workingHours: Record<string, {
    open: string;
    close: string;
    closed: boolean;
  }>;
}

export interface WorkspaceSettingsPayload {
  siteName: string;
  logoUrl?: string | null;
  contactInfo: {
    whatsapp?: string;
    phone?: string;
    email?: string;
  };
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
    youtube?: string;
    snapchat?: string;
    telegram?: string;
    pinterest?: string;
    threads?: string;
  };
  locations: Array<{
    id: string;
    label?: string;
    address?: string;
    city?: string;
    country?: string;
    mapUrl?: string;
  }>;
  workingHours: Record<string, {
    open: string;
    close: string;
    closed: boolean;
  }>;
}

export const WorkspaceService = {
  /**
   * Fetches the current workspace settings.
   */
  async getSettings(): Promise<WorkspaceSettingsPayload> {
    const response = await apiClient.get<{ data: { settings: WorkspaceSettingsPayload } }>('/workspace');
    return response.data.settings;
  },

  /**
   * Updates workspace brand identity.
   */
  async updateIdentity(settings: WorkspaceIdentityPayload): Promise<void> {
    await apiClient.put('/workspace/identity', settings);
  },

  /**
   * Updates workspace contact info.
   */
  async updateContact(settings: WorkspaceContactPayload): Promise<void> {
    await apiClient.put('/workspace/contact', settings);
  },

  /**
   * Updates workspace social links.
   */
  async updateSocial(settings: WorkspaceSocialPayload): Promise<void> {
    await apiClient.put('/workspace/social', settings);
  },

  /**
   * Updates workspace locations.
   */
  async updateLocations(settings: WorkspaceLocationsPayload): Promise<void> {
    await apiClient.put('/workspace/locations', settings);
  },

  /**
   * Updates workspace working hours.
   */
  async updateWorkingHours(settings: WorkspaceWorkingHoursPayload): Promise<void> {
    await apiClient.put('/workspace/working-hours', settings);
  },

  /**
   * Resolves a shortened Google Maps URL.
   */
  async resolveMap(url: string): Promise<string> {
    const response = await apiClient.get<{ data: { resolvedUrl: string } }>(`/workspace/resolve-map?url=${encodeURIComponent(url)}`);
    return response.data.resolvedUrl;
  },

  /**
   * Uploads a logo and returns the public URL.
   */
  async uploadLogo(file: File): Promise<string> {
    const response = await apiClient.upload<{ data: { url: string } }>('/upload', file);
    // Ensure we return the absolute URL if the API returns a relative path
    const url = response.data.url;
    const baseUrl = API_BASE_URL.replace(/\/api$/, '');
    return url.startsWith('http') ? url : `${baseUrl}${url}`;
  },

};
