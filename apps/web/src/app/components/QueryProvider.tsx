"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

interface QueryProviderProps {
  children: React.ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time of 5 minutes for calendar events
            staleTime: 5 * 60 * 1000,
            // Cache time of 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests up to 2 times
            retry: 2,
            // Don't refetch on window focus for calendar data
            refetchOnWindowFocus: false,
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}