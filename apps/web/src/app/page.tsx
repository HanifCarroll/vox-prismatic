import { DashboardClient } from './components/DashboardClient';
import { getApiBaseUrl } from '@/lib/api-config';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { dashboardKeys } from './hooks/useDashboardQueries';

const API_BASE_URL = getApiBaseUrl();


/**
 * Dashboard page - main overview of the content creation system
 * Server component that fetches initial data and hydrates the client
 */

async function fetchDashboardData() {
  try {
    // Use the consolidated dashboard endpoint instead of multiple requests
    const dashboardResponse = await fetch(`${API_BASE_URL}/api/dashboard`, {
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!dashboardResponse.ok) {
      console.error('Dashboard API request failed:', dashboardResponse.status);
      return null;
    }

    const dashboardData = await dashboardResponse.json();
    if (!dashboardData.success || !dashboardData.data) {
      console.error('Invalid dashboard data:', dashboardData);
      return null;
    }

    return dashboardData.data;
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return null;
  }
}

export default async function HomePage() {
  const queryClient = getQueryClient();
  const dashboardData = await fetchDashboardData();
  
  // Get server time for consistent date calculations
  const serverTime = new Date().toISOString();
  
  // Prefetch data into React Query cache for client-side
  if (dashboardData) {
    await queryClient.prefetchQuery({
      queryKey: dashboardKeys.data(),
      queryFn: () => dashboardData,
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient initialData={dashboardData} serverTime={serverTime} />
    </HydrationBoundary>
  );
}