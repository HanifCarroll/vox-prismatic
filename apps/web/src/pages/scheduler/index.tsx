
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getApiBaseUrl } from "@/lib/api-config";
import type { ApiResponse, CalendarEvent, PostView } from "@/types/database";
import { CalendarClientWrapper } from "@/components/scheduler/CalendarClientWrapper";
import { SchedulerHydration } from "@/components/scheduler/store/hydration";
import { SchedulerStatsWrapper } from "@/components/scheduler/SchedulerStatsWrapper";

const API_BASE_URL = getApiBaseUrl();

/**
 * Scheduler Page - Post scheduling interface with drag-and-drop calendar
 * Uses React Query for data fetching and URL state management
 */

interface SchedulerData {
  events: CalendarEvent[];
  approvedPosts: PostView[];
}

async function getSchedulerData(): Promise<SchedulerData> {
  // Fetch calendar events and approved posts in parallel
  const [eventsResponse, postsResponse] = await Promise.all([
    fetch(`${API_BASE_URL}/api/scheduler/events`),
    fetch(`${API_BASE_URL}/api/posts?status=approved&limit=100`),
  ]);

  if (!eventsResponse.ok || !postsResponse.ok) {
    throw new Error("Failed to fetch scheduler data");
  }

  const eventsData: ApiResponse<CalendarEvent[]> = await eventsResponse.json();
  const postsData: ApiResponse<PostView[]> = await postsResponse.json();

  return {
    events: eventsData.success ? eventsData.data || [] : [],
    approvedPosts: postsData.success ? postsData.data || [] : [],
  };
}

export function SchedulerPage() {
  const [searchParams] = useSearchParams();
  
  // Parse URL parameters
  const view = (searchParams.get('view') as 'day' | 'week' | 'month') || 'week';
  const date = searchParams.get('date');
  const platforms = searchParams.get('platforms');
  const status = searchParams.get('status') || 'all';
  const postId = searchParams.get('postId');

  const { data, isLoading, error } = useQuery({
    queryKey: ['scheduler'],
    queryFn: getSchedulerData,
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: false, // Don't refetch on window focus
    // No refetchInterval - rely on cache invalidation when user actions occur
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">
          Failed to load scheduler: {(error as Error).message}
        </div>
      </div>
    );
  }

  const { events = [], approvedPosts = [] } = data || {};

  return (
    <SchedulerHydration
      initialEvents={events}
      initialPosts={approvedPosts}
      preselectedPostId={postId || undefined}
    >
      <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
        <div className="container mx-auto py-3 px-4 max-w-7xl flex flex-col flex-1 min-h-0">
          {/* Use SchedulerStatsWrapper to handle client-side statistics */}
          <SchedulerStatsWrapper />

          {/* Calendar with URL state management */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 min-h-0">
            <CalendarClientWrapper 
              initialView={view}
              initialDate={date ? new Date(date) : new Date()}
              initialFilters={{
                platforms: platforms?.split(',').filter(Boolean),
                status: status
              }}
            />
          </div>
        </div>
      </div>
    </SchedulerHydration>
  );
}

export default SchedulerPage;