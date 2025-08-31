
import { useQuery } from '@tanstack/react-query';
import { DashboardClient } from '@/components/DashboardClient';
import { getApiBaseUrl } from '@/lib/api-config';

const API_BASE_URL = getApiBaseUrl();

/**
 * Dashboard page - main overview of the content creation system
 * Uses React Query for data fetching and caching
 */

async function fetchDashboardData() {
  const dashboardResponse = await fetch(`${API_BASE_URL}/api/dashboard`, {
    signal: AbortSignal.timeout(10000), // 10 second timeout
  });

  if (!dashboardResponse.ok) {
    throw new Error(`Dashboard API request failed: ${dashboardResponse.status}`);
  }

  const dashboardData = await dashboardResponse.json();
  if (!dashboardData.success || !dashboardData.data) {
    throw new Error('Invalid dashboard data received');
  }

  return dashboardData.data;
}

export function DashboardPage() {
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Get server time for consistent date calculations
  const serverTime = new Date().toISOString();

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
          Failed to load dashboard: {error.message}
        </div>
      </div>
    );
  }

  return (
    <DashboardClient initialData={dashboardData} serverTime={serverTime} />
  );
}

export default DashboardPage;