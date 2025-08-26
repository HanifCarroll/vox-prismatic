import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { transcriptKeys } from './hooks/useTranscriptQueries';
import { fetchTranscripts } from '@/lib/server/fetch-transcripts';
import TranscriptsClient from './TranscriptsClient';

// Server Component - fetches data and hydrates TanStack Query
export default async function TranscriptsPage() {
  const queryClient = getQueryClient();
  
  // Prefetch transcripts data on the server
  await queryClient.prefetchQuery({
    queryKey: transcriptKeys.lists(),
    queryFn: () => fetchTranscripts(),
    staleTime: 30 * 1000, // Match client-side configuration
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TranscriptsClient />
    </HydrationBoundary>
  );
}