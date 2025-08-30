/**
 * API Configuration
 * Handles URL configuration for Vite-based SPA
 */

import { env } from '@/env';

/**
 * Get the appropriate API base URL
 * Uses Vite proxy configuration for /api routes
 */
export function getApiBaseUrl(): string {
  // Use relative URL since Vite proxy handles /api routes
  return env.apiBaseUrl;
}

/**
 * Create a fetch wrapper with the correct base URL
 */
export async function apiFetch(
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('/') ? endpoint : `${baseUrl}${endpoint}`;
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

/**
 * Type-safe API fetch wrapper
 */
export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await apiFetch(endpoint, options);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}