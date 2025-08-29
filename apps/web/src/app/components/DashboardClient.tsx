'use client';

import { Pipeline } from './Pipeline';
import { DashboardWidgets } from './DashboardWidgets';
import { ActionCenter } from './dashboard/ActionCenter';
import type { DashboardStats, RecentActivityResponse } from '@/types';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { useDashboardCountsData } from '@/app/content/hooks/use-server-actions';

// Transform legacy stats to full DashboardStats format
function transformToDashboardStats(counts: any): DashboardStats {
  return {
    upcomingPosts: {
      todayCount: counts.scheduled?.today || 0,
      weekCount: counts.scheduled?.thisWeek || 0,
      nextPost: undefined, // TODO: Update when API provides next post data
    },
    pipeline: {
      rawTranscripts: counts.transcripts?.total || 0,
      cleanedTranscripts: 0, // TODO: Update when API provides this breakdown
      readyInsights: counts.insights?.total || 0,
      generatedPosts: counts.posts?.total || 0,
      approvedPosts: 0, // TODO: Update when API provides status breakdown
      scheduledPosts: counts.scheduled?.total || 0,
    },
  };
}

// Transform activity to proper format
function transformToActivityResponse(activity: any[], serverTime?: string): RecentActivityResponse {
  const activities = activity.map(item => ({
    id: item.id,
    type: item.type,
    title: item.title,
    description: item.description || `${item.type.replace('_', ' ')} - ${item.status}`,
    timestamp: item.timestamp,
    metadata: item.metadata,
  }));

  // Use server time if provided (during SSR), otherwise use client time
  // Compare using UTC dates to avoid timezone issues
  const referenceDate = serverTime ? new Date(serverTime) : new Date();
  const todayUTC = referenceDate.toISOString().split('T')[0];

  return {
    activities,
    summary: {
      totalToday: activities.filter(a => {
        const activityDateUTC = new Date(a.timestamp).toISOString().split('T')[0];
        return activityDateUTC === todayUTC;
      }).length,
      insightsApproved: activities.filter(a => a.type === 'insight_approved').length,
      postsScheduled: activities.filter(a => a.type === 'post_scheduled').length,
    },
  };
}

// Default values for error states
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

interface DashboardClientProps {
  initialData?: any;
  serverTime?: string;
}

/**
 * Client-side dashboard component with React Query
 */
export function DashboardClient({ initialData, serverTime }: DashboardClientProps) {
  const { counts: data, loading: isLoading, error, refetch } = useDashboardCountsData();
  const isFetching = isLoading;
  
  // Use initial data from server or fetched data
  const dashboardData = data || initialData;
  
  // Show loading indicator if fetching (not initial load)
  const showRefreshIndicator = isFetching && !isLoading;

  if (error || !dashboardData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 p-4 border border-orange-200 bg-orange-50 rounded-lg mb-6">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <div>
            <p className="font-medium text-orange-900">Unable to load dashboard data</p>
            <p className="text-sm text-orange-700">
              {error?.message || 'Check if the API server is running and accessible.'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="ml-auto px-4 py-2 text-sm bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
        
        <div className="grid gap-6 sm:gap-8">
          <Pipeline stats={defaultDashboardStats.pipeline} />
          <DashboardWidgets 
            stats={defaultDashboardStats}
            recentActivity={defaultActivityResponse}
          />
        </div>
      </div>
    );
  }

  // Use workflow pipeline if available, otherwise fall back to old format
  const pipelineStats = dashboardData.workflowPipeline || transformToDashboardStats(dashboardData.counts).pipeline;
  const transformedStats = transformToDashboardStats(dashboardData.counts);
  const transformedActivity = transformToActivityResponse(dashboardData.activity || [], serverTime);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Content Creation Dashboard</h1>
          <p className="text-gray-600 text-lg">Monitor your content pipeline and track performance metrics</p>
        </div>
        {showRefreshIndicator && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Refreshing...
          </div>
        )}
      </div>
      
      <div className="grid gap-6 sm:gap-8">
        {/* Action Center - Shows items needing immediate attention */}
        <ActionCenter className="mb-2" />
        
        {/* Pipeline Overview */}
        <Pipeline stats={pipelineStats} />
        
        {/* Widgets and Activity */}
        <DashboardWidgets 
          stats={transformedStats}
          recentActivity={transformedActivity}
        />
      </div>
    </div>
  );
}