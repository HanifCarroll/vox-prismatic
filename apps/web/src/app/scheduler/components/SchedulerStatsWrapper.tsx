'use client';

import React from 'react';
import { Calendar, Clock, TrendingUp, FileText } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { apiClient } from '@/lib/api-client';

/**
 * Client-side wrapper for scheduler statistics and PageHeader
 * Handles loading states and integrates with the scheduler statistics hook
 */
export function SchedulerStatsWrapper() {
  const [stats, setStats] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Fetch scheduler stats
  React.useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get('/api/scheduler/stats');
        if (response.success) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch scheduler stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  // Prepare stats for PageHeader component
  const pageStats = React.useMemo(() => {
    if (isLoading || !stats) {
      return undefined; // Show loading state
    }

    return [
      {
        label: "Approved Posts",
        value: stats.totalApprovedPosts,
        icon: FileText,
        trend: stats.totalApprovedPosts > 0 ? 'up' as const : undefined
      },
      {
        label: "Scheduled Events", 
        value: stats.totalScheduledEvents,
        icon: Calendar,
        trend: stats.totalScheduledEvents > 0 ? 'up' as const : undefined
      },
      {
        label: "This Week",
        value: stats.thisWeekEvents,
        icon: TrendingUp,
        trend: stats.thisWeekEvents > 0 ? 'neutral' as const : undefined
      },
      {
        label: "Next 7 Days",
        value: stats.next7DaysEvents,
        icon: Clock,
        trend: stats.next7DaysEvents > 0 ? 'neutral' as const : undefined
      }
    ];
  }, [stats, isLoading]);

  return (
    <PageHeader
      title="Schedule"
      description="Schedule and manage your content calendar across all platforms"
      stats={pageStats}
    />
  );
}