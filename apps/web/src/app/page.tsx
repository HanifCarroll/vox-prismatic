import { Pipeline } from './components/Pipeline';
import { DashboardWidgets } from './components/DashboardWidgets';
import type { ApiResponse } from '@/types/database';
import { AlertTriangle } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

/**
 * Dashboard page - main overview of the content creation system
 * Now fetches all data from the API server
 */

// Dashboard stats interface
interface DashboardStats {
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

async function fetchDashboardData(): Promise<{ stats: DashboardStats; recentActivity: RecentActivity } | null> {
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
    let stats: DashboardStats = {
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
        
        <Pipeline />
      </div>
    );
  }

  const { stats, recentActivity } = dashboardData;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Content Creation Dashboard</h1>
      
      <div className="grid gap-8">
        <DashboardWidgets 
          stats={stats}
          recentActivity={recentActivity}
        />
        <Pipeline />
      </div>
    </div>
  );
}