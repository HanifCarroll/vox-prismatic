import { Pipeline } from './components/Pipeline';
import { DashboardWidgets } from './components/DashboardWidgets';
import type { ApiResponse, DashboardStats, ActivityItem, RecentActivityResponse } from '@/types';
import { AlertTriangle } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-config';

const API_BASE_URL = getApiBaseUrl();

// Transform legacy stats to full DashboardStats format
function transformToDashboardStats(legacyStats: LegacyDashboardStats): DashboardStats {
  return {
    upcomingPosts: {
      todayCount: 0, // TODO: Update when API provides this data
      weekCount: legacyStats.scheduledPosts?.count || 0,
      nextPost: undefined, // TODO: Update when API provides next post data
    },
    pipeline: {
      rawTranscripts: legacyStats.transcripts?.count || 0,
      cleanedTranscripts: 0, // TODO: Update when API provides this breakdown
      readyInsights: legacyStats.insights?.count || 0,
      generatedPosts: legacyStats.posts?.count || 0,
      approvedPosts: 0, // TODO: Update when API provides status breakdown
      scheduledPosts: legacyStats.scheduledPosts?.count || 0,
    },
  };
}

// Transform legacy activity to proper format
function transformToActivityResponse(recentActivity: RecentActivity): RecentActivityResponse {
  const activities: ActivityItem[] = [
    ...recentActivity.transcripts.map((t): ActivityItem => ({
      id: t.id,
      type: 'transcript_processed' as const,
      title: t.title,
      description: `Transcript ${t.status}`,
      timestamp: t.createdAt.toISOString(),
    })),
    ...recentActivity.insights.map((i): ActivityItem => ({
      id: i.id,
      type: i.status === 'approved' ? 'insight_approved' : 'insight_rejected' as const,
      title: i.title,
      description: `Insight ${i.status}`,
      timestamp: i.createdAt.toISOString(),
    })),
    ...recentActivity.posts.map((p): ActivityItem => ({
      id: p.id,
      type: p.status === 'scheduled' ? 'post_scheduled' : 'post_generated' as const,
      title: p.title,
      description: `Post for ${p.platform}`,
      timestamp: p.createdAt.toISOString(),
      metadata: {
        platform: p.platform as any,
      },
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    activities,
    summary: {
      totalToday: activities.length, // TODO: Filter by today
      insightsApproved: activities.filter(a => a.type === 'insight_approved').length,
      postsScheduled: activities.filter(a => a.type === 'post_scheduled').length,
    },
  };
}

// Default dashboard stats for error states
const defaultDashboardStats: DashboardStats = {
  upcomingPosts: {
    todayCount: 0,
    weekCount: 0,
    nextPost: undefined,
  },
  pipeline: {
    rawTranscripts: 0,
    cleanedTranscripts: 0,
    readyInsights: 0,
    generatedPosts: 0,
    approvedPosts: 0,
    scheduledPosts: 0,
  },
};

const defaultActivityResponse: RecentActivityResponse = {
  activities: [],
  summary: {
    totalToday: 0,
    insightsApproved: 0,
    postsScheduled: 0,
  },
};

/**
 * Dashboard page - main overview of the content creation system
 * Now fetches all data from the API server
 */

// Legacy dashboard stats interface (for compatibility with current API)
interface LegacyDashboardStats {
  transcripts: { count: number };
  insights: { count: number };
  posts: { count: number };
  scheduledPosts: { count: number };
}

// Recent activity interface
interface RecentActivity {
  transcripts: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: Date;
  }>;
  insights: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: Date;
  }>;
  posts: Array<{
    id: string;
    title: string;
    platform: string;
    status: string;
    createdAt: Date;
  }>;
}

async function fetchDashboardData(): Promise<{ stats: LegacyDashboardStats; recentActivity: RecentActivity } | null> {
  try {
    // Fetch dashboard stats and recent activity from API endpoints
    const [statsResponse, transcriptsResponse, insightsResponse, postsResponse] = await Promise.all([
      // Assuming we have a dashboard stats endpoint
      fetch(`${API_BASE_URL}/api/dashboard/stats`, {
        next: { revalidate: 300 }, // Revalidate stats every 5 minutes
      }).catch(() => null),
      
      // Fetch recent items for activity feed
      fetch(`${API_BASE_URL}/api/transcripts?limit=5`, {
        next: { revalidate: 60 },
      }),
      fetch(`${API_BASE_URL}/api/insights?limit=5`, {
        next: { revalidate: 60 },
      }),
      fetch(`${API_BASE_URL}/api/posts?limit=5`, {
        next: { revalidate: 60 },
      }),
    ]);

    // Parse responses
    let stats: LegacyDashboardStats = {
      transcripts: { count: 0 },
      insights: { count: 0 },
      posts: { count: 0 },
      scheduledPosts: { count: 0 },
    };

    if (statsResponse && statsResponse.ok) {
      const statsData = await statsResponse.json();
      if (statsData.success && statsData.data) {
        stats = statsData.data;
      }
    }

    // Parse activity data
    const recentActivity: RecentActivity = {
      transcripts: [],
      insights: [],
      posts: [],
    };

    if (transcriptsResponse.ok) {
      const transcriptsData: ApiResponse<any[]> = await transcriptsResponse.json();
      if (transcriptsData.success && transcriptsData.data) {
        recentActivity.transcripts = transcriptsData.data.map(t => ({
          ...t,
          createdAt: new Date(t.createdAt),
        }));
      }
    }

    if (insightsResponse.ok) {
      const insightsData: ApiResponse<any[]> = await insightsResponse.json();
      if (insightsData.success && insightsData.data) {
        recentActivity.insights = insightsData.data.map(i => ({
          ...i,
          createdAt: new Date(i.createdAt),
        }));
      }
    }

    if (postsResponse.ok) {
      const postsData: ApiResponse<any[]> = await postsResponse.json();
      if (postsData.success && postsData.data) {
        recentActivity.posts = postsData.data.map(p => ({
          ...p,
          createdAt: new Date(p.createdAt),
        }));
      }
    }

    return { stats, recentActivity };
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return null;
  }
}

export default async function HomePage() {
  const dashboardData = await fetchDashboardData();

  if (!dashboardData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 p-4 border border-orange-200 bg-orange-50 rounded-lg mb-6">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <div>
            <p className="font-medium text-orange-900">Unable to load dashboard data</p>
            <p className="text-sm text-orange-700">Check if the API server is running and accessible.</p>
          </div>
        </div>
        
        <div className="grid gap-8">
          <DashboardWidgets 
            stats={defaultDashboardStats}
            recentActivity={defaultActivityResponse}
          />
          <Pipeline stats={defaultDashboardStats.pipeline} />
        </div>
      </div>
    );
  }

  const { stats, recentActivity } = dashboardData;
  const transformedStats = transformToDashboardStats(stats);
  const transformedActivity = transformToActivityResponse(recentActivity);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Content Creation Dashboard</h1>
      
      <div className="grid gap-8">
        <DashboardWidgets 
          stats={transformedStats}
          recentActivity={transformedActivity}
        />
        <Pipeline stats={transformedStats.pipeline} />
      </div>
    </div>
  );
}