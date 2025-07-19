/**
 * API utility functions for MangoPeach UI
 */

export const API_BASE_URL = process.env.API_SERVER_BASE_URL || 'http://localhost:4000';

/**
 * Create a full API URL from a relative path
 */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Fetch data from the API with error handling
 */
export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const url = apiUrl(path);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success === false) {
      throw new Error(data.error || 'API request failed');
    }
    
    return data.data || data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

/**
 * API endpoint helpers
 */
export const api = {
  libraries: {
    list: () => apiRequest<any[]>('/libraries'),
    get: (libraryId: string, parentId?: string) => {
      const params = parentId ? `?parentId=${encodeURIComponent(parentId)}` : '';
      return apiRequest<{groups: any[], bundles: any[]}>(`/libraries/${libraryId}${params}`);
    },
    scan: (libraryId: string) => apiRequest(`/libraries/${libraryId}/scan`, { method: 'POST' }),
  },
  bundles: {
    get: (libraryId: string, bundleId: string) => 
      apiRequest<any>(`/libraries/${libraryId}/bundles/${bundleId}`),
  },
  images: {
    url: (libraryId: string, bundleId: string, imageId: string) =>
      apiUrl(`/libraries/${libraryId}/bundles/${bundleId}/images/${imageId}`),
    urlByIndex: (libraryId: string, bundleId: string, pageIndex: number) =>
      apiUrl(`/libraries/${libraryId}/bundles/${bundleId}/images?pageIndex=${pageIndex}`),
    urlByPath: (libraryId: string, bundleId: string, imagePath: string) =>
      apiUrl(`/libraries/${libraryId}/bundles/${bundleId}/images?imagePath=${encodeURIComponent(imagePath)}`),
  },
};