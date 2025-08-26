import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { insightKeys } from './hooks/useInsightQueries';
import { fetchInsights } from '@/lib/server/fetch-insights';
import InsightsClient from './InsightsClient';

// Server Component - fetches data and hydrates TanStack Query
export default async function InsightsPage() {
  const queryClient = getQueryClient();
  
  // Prefetch insights data on the server with default filters
  await queryClient.prefetchQuery({
    queryKey: insightKeys.list({}),
    queryFn: () => fetchInsights(),
    staleTime: 30 * 1000, // Match client-side configuration
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InsightsClient />
    </HydrationBoundary>
  );
}