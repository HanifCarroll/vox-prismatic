import { Pipeline } from './components/Pipeline';
import { DashboardWidgets } from './components/DashboardWidgets';
import { DashboardStats } from './api/dashboard/stats/route';
import { RecentActivityResponse } from './api/dashboard/recent-activity/route';

/**
 * Dashboard page - main overview of the content creation system
 */

async function fetchDashboardStats(): Promise<DashboardStats | null> {
  try {
    // Import the route handler directly for server-side execution
    const { GET } = await import('./api/dashboard/stats/route');
    const request = new Request('http://localhost:3000/api/dashboard/stats');
    const response = await GET(request);
    
    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return null;
  }
}

async function fetchRecentActivity(): Promise<RecentActivityResponse | null> {
  try {
    // Import the route handler directly for server-side execution
    const { GET } = await import('./api/dashboard/recent-activity/route');
    const request = new Request('http://localhost:3000/api/dashboard/recent-activity');
    const response = await GET(request);
    
    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return null;
  }
}

export default async function Dashboard() {
  // Fetch data in parallel
  const [stats, recentActivity] = await Promise.all([
    fetchDashboardStats(),
    fetchRecentActivity()
  ]);

  // Fallback data if API calls fail
  const fallbackStats: DashboardStats = {
    pipeline: {
      rawTranscripts: 0,
      cleanedTranscripts: 0,
      readyInsights: 0,
      generatedPosts: 0,
      approvedPosts: 0,
      scheduledPosts: 0
    },
    recentActivity: {
      insightsApprovedToday: 0,
      postsScheduledToday: 0,
      reviewSessionApprovalRate: 0
    },
    upcomingPosts: {
      todayCount: 0,
      weekCount: 0
    }
  };

  const currentStats = stats || fallbackStats;

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Content Creation Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Transform coaching transcripts into social media content
            </p>
          </div>
          
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-8">
        {/* Pipeline Overview */}
        <Pipeline 
          stats={currentStats.pipeline}
          className="mb-8"
        />

        {/* Dashboard Widgets */}
        <DashboardWidgets 
          stats={currentStats}
          recentActivity={recentActivity}
          className="mb-8"
        />

        {/* Status Message */}
        {!stats && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">⚠️</span>
              <span className="font-medium text-yellow-800">
                Unable to load dashboard data
              </span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              The system is running with mock data. Check your configuration and try refreshing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
