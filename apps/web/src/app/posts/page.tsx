import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { postKeys } from './hooks/usePostQueries';
import { fetchPosts } from '@/lib/server/fetch-posts';
import PostsClient from './PostsClient';

// Server Component - fetches data and hydrates TanStack Query
export default async function PostsPage() {
  const queryClient = getQueryClient();
  
  // Prefetch posts data on the server with default filters
  await queryClient.prefetchQuery({
    queryKey: postKeys.list({}),
    queryFn: () => fetchPosts(),
    staleTime: 30 * 1000, // Match client-side configuration
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostsClient />
    </HydrationBoundary>
  );
}