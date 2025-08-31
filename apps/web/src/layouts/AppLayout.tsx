
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { NavigationLayout } from '@/components/navigation/NavigationLayout';
import { ModalManager } from '@/components/modals/ModalManager';
import { getApiBaseUrl } from '@/lib/api-config';
import type { ApiResponse, DashboardData, SidebarCounts } from '@/types';

const API_BASE_URL = getApiBaseUrl();

/**
 * App Layout - Main layout wrapper with navigation for all pages
 * Fetches dashboard data for navigation counts and provides layout structure
 */

async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dashboard`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Dashboard API returned ${response.status}: ${response.statusText}`
      );
    }

    const result: ApiResponse<DashboardData> = await response.json();

    if (result.success && result.data) {
      return result.data;
    } else {
      console.error(
        'Dashboard API error:',
        result.success ? 'No data' : result.error
      );
      return getDefaultDashboardData();
    }
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return getDefaultDashboardData();
  }
}

function getDefaultDashboardData(): DashboardData {
  return {
    counts: {
      transcripts: { total: 0, byStatus: {} },
      insights: { total: 0, byStatus: {} },
      posts: { total: 0, byStatus: {} },
      scheduled: { total: 0, byPlatform: {}, upcoming24h: 0 },
    },
    activity: [],
  };
}

export function AppLayout() {
  // Fetch dashboard data for navigation counts
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-layout'],
    queryFn: fetchDashboardData,
    staleTime: 60000, // Consider data stale after 1 minute
    refetchInterval: 60000, // Refetch every minute for navigation counts
  });

  // Extract sidebar-specific counts that need badges
  const sidebarCounts: SidebarCounts = dashboardData
    ? {
        transcripts: dashboardData.counts.transcripts.byStatus.raw || 0,
        insights: dashboardData.counts.insights.byStatus.needs_review || 0,
        posts: dashboardData.counts.posts.byStatus.needs_review || 0,
      }
    : {
        transcripts: 0,
        insights: 0,
        posts: 0,
      };

  return (
    <>
      <NavigationLayout initialCounts={sidebarCounts}>
        <Outlet />
      </NavigationLayout>
      <ModalManager />
    </>
  );
}