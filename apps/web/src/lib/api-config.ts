/**
 * API Configuration
 * Handles URL selection for server-side vs client-side requests
 */

/**
 * Get the appropriate API base URL based on the execution context
 * - Server-side (SSR): Uses Docker network URL (http://api:3000)
 * - Client-side: Uses public URL (http://localhost:3000)
 */
export function getApiBaseUrl(): string {
  // Check if we're on the server side
  if (typeof window === 'undefined') {
    // Server-side: prioritize internal Docker network URL
    return process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  }
  
  // Client-side: use public URL
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
}

/**
 * Create a fetch wrapper with the correct base URL
 */
export async function apiFetch(
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
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

// Export a constant for legacy compatibility
export const API_BASE_URL = getApiBaseUrl();