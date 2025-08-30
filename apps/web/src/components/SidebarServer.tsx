import type { ApiResponse, DashboardData, SidebarCounts } from "@/types";
import { ResponsiveNavigation } from "./navigation/ResponsiveNavigation";

/**
 * Server-side sidebar wrapper that fetches all dashboard data before rendering
 * Uses the centralized dashboard API for optimal performance
 */

async function fetchDashboardData(): Promise<DashboardData> {
  try {
    // Use the centralized dashboard API with proper URL selection
    const { getApiBaseUrl } = await import("@/lib/api-config");
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/dashboard`, {
      cache: "no-store", // Always fetch fresh data for server components
      headers: {
        "Content-Type": "application/json",
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
        "Dashboard API error:",
        result.success ? "No data" : result.error
      );
      return getDefaultDashboardData();
    }
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
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

export default async function SidebarServer({
  className,
}: {
  className?: string;
}) {
  // Fetch all dashboard data on the server - this blocks page rendering until complete
  const dashboardData = await fetchDashboardData();

  // Extract sidebar-specific counts that need badges
  const sidebarCounts: SidebarCounts = {
    transcripts: dashboardData.counts.transcripts.byStatus.raw || 0,
    insights: dashboardData.counts.insights.byStatus.needs_review || 0,
    posts: dashboardData.counts.posts.byStatus.needs_review || 0,
  };

  return (
    <ResponsiveNavigation className={className} initialCounts={sidebarCounts} />
  );
}
