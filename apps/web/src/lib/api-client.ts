/**
 * Centralized API client for communicating with the Hono API server
 */

import { getApiBaseUrl } from './api-config';
import type { ApiResponse } from '@content-creation/types';

export const API_BASE_URL = getApiBaseUrl();

/**
 * Enhanced fetch wrapper with proper error handling
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * Convenience methods for different HTTP methods
 */
export const apiClient = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  
  post: <T, D = unknown>(endpoint: string, data: D) => 
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  patch: <T, D = unknown>(endpoint: string, data: D) => 
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  put: <T, D = unknown>(endpoint: string, data: D) => 
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: <T = void>(endpoint: string) => 
    apiRequest<T>(endpoint, {
      method: 'DELETE',
    }),
};