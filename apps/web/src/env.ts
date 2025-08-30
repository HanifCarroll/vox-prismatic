/**
 * Environment configuration for Vite
 * Centralizes environment variable access with type safety
 */

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PUBLIC_API_BASE_URL?: string;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Environment configuration with defaults
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  publicApiBaseUrl: import.meta.env.VITE_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',
} as const;

/**
 * Get the appropriate API base URL
 * Since Vite proxy handles /api routes, we can use relative paths
 */
export function getApiBaseUrl(): string {
  // In browser, use relative URL since Vite proxy handles it
  return env.apiBaseUrl;
}