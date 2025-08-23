'use client';

import { DashboardStats } from '../api/dashboard/stats/route';
import { ActivityItem, RecentActivityResponse } from '../api/dashboard/recent-activity/route';

/**
 * Dashboard overview widgets
 * Shows recent activity and upcoming posts
 */

interface DashboardWidgetsProps {
  stats: DashboardStats;
  recentActivity?: RecentActivityResponse;
  className?: string;
}

interface WidgetProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  className?: string;
}

function Widget({ title, icon, children, className = '' }: WidgetProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

function getActivityIcon(type: ActivityItem['type']): string {
  switch (type) {
    case 'insight_approved':
      return '✅';
    case 'insight_rejected':
      return '❌';
    case 'post_generated':
      return '📝';
    case 'post_scheduled':
      return '📅';
    case 'transcript_processed':
      return '🔄';
    default:
      return '📄';
  }
}

function getActivityColor(type: ActivityItem['type']): string {
  switch (type) {
    case 'insight_approved':
    case 'post_scheduled':
      return 'text-green-600';
    case 'insight_rejected':
      return 'text-red-600';
    case 'post_generated':
    case 'transcript_processed':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
}

export function DashboardWidgets({ stats, recentActivity, className = '' }: DashboardWidgetsProps) {
  return (
    <div className={`dashboard-widgets ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Activity Widget */}
        <Widget title="Recent Activity" icon="📈" className="lg:col-span-1">
          {recentActivity && recentActivity.activities.length > 0 ? (
            <div className="space-y-4">
              {/* Activity Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="font-semibold text-gray-800">{recentActivity.summary.totalToday}</div>
                  <div className="text-xs text-gray-600">Today</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600">{recentActivity.summary.insightsApproved}</div>
                  <div className="text-xs text-gray-600">Approved</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-600">{recentActivity.summary.postsScheduled}</div>
                  <div className="text-xs text-gray-600">Scheduled</div>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="max-h-64 overflow-y-auto space-y-3">
                {recentActivity.activities.slice(0, 8).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="text-lg flex-shrink-0 mt-0.5">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 truncate">
                        {activity.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {activity.description}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="text-xs text-gray-500">
                          {formatRelativeTime(activity.timestamp)}
                        </div>
                        {activity.metadata?.platform && (
                          <div className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {activity.metadata.platform}
                          </div>
                        )}
                        {activity.metadata?.score && (
                          <div className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                            ⭐{activity.metadata.score}/20
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-2xl mb-2">🔄</div>
              <div className="text-sm">No recent activity</div>
            </div>
          )}
        </Widget>

        {/* Upcoming Posts Widget */}
        <Widget title="Upcoming Posts" icon="📅" className="lg:col-span-1">
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-700">
                  {stats.upcomingPosts.todayCount}
                </div>
                <div className="text-sm text-blue-600">Posts Today</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-700">
                  {stats.upcomingPosts.weekCount}
                </div>
                <div className="text-sm text-green-600">This Week</div>
              </div>
            </div>

            {/* Next Post */}
            {stats.upcomingPosts.nextPost ? (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-800 mb-2">
                  🎯 Next Scheduled Post
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-lg">
                    {stats.upcomingPosts.nextPost.platform === 'linkedin' ? '📱' : '🐦'}
                  </div>
                  <div className="font-medium text-gray-700 capitalize">
                    {stats.upcomingPosts.nextPost.platform}
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {stats.upcomingPosts.nextPost.title}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(stats.upcomingPosts.nextPost.scheduledTime).toLocaleString('en-US', {
                    month: 'numeric',
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <div className="text-xl mb-1">📭</div>
                <div className="text-sm">No upcoming posts</div>
                <div className="text-xs mt-1">Schedule some posts to see them here</div>
              </div>
            )}

            {/* Performance Tip */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="text-sm font-medium text-yellow-800 mb-1">
                💡 Scheduling Tip
              </div>
              <div className="text-xs text-yellow-700">
                {stats.recentActivity.reviewSessionApprovalRate > 80 
                  ? "Great approval rate! Consider increasing your content volume."
                  : "Review approval rate could be improved. Check insight quality settings."
                }
              </div>
            </div>
          </div>
        </Widget>

      </div>
    </div>
  );
}