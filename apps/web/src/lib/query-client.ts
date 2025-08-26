/**
 * TanStack Query client utilities for server-side and client-side usage
 */

import { QueryClient } from '@tanstack/react-query';

let serverQueryClient: QueryClient | undefined = undefined;

/**
 * Get or create a QueryClient instance for server-side rendering
 * Creates a new instance on each request to avoid cross-request state pollution
 */
export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server-side: create a new client for each request
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 60 seconds
          gcTime: 5 * 60 * 1000, // 5 minutes
          retry: false, // Don't retry on server
        },
        mutations: {
          retry: false, // Don't retry mutations on server
        },
      },
    });
  }

  // Client-side: use singleton pattern
  if (!serverQueryClient) {
    serverQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 60 seconds
          gcTime: 5 * 60 * 1000, // 5 minutes
          refetchOnWindowFocus: false,
          retry: 1,
        },
        mutations: {
          retry: 1,
        },
      },
    });
  }

  return serverQueryClient;
}