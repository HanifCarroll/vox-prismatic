/**
 * Environment configuration for Vite
 * Centralizes all environment variable access
 */

export const env = {
  // API Configuration
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  
  // App Configuration
  appUrl: import.meta.env.VITE_APP_URL || 'http://localhost:3001',
  
  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  mode: import.meta.env.MODE,
} as const;

// Type-safe environment variable access
export type Env = typeof env;