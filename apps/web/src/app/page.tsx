import { DashboardClient } from './components/DashboardClient';
import { getApiBaseUrl } from '@/lib/api-config';

const API_BASE_URL = getApiBaseUrl();

/**
 * Dashboard page - main overview of the content creation system
 * Server component that fetches initial data and passes it to client
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
  const dashboardData = await fetchDashboardData();
  
  // Get server time for consistent date calculations
  const serverTime = new Date().toISOString();

  return (
    <DashboardClient initialData={dashboardData} serverTime={serverTime} />
  );
}