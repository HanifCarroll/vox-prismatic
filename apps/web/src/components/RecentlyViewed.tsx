'use client';

import { Clock, FileText, Lightbulb, Edit3, X } from 'lucide-react';
import Link from 'next/link';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import type { RecentItem } from '@/types/recently-viewed';
import { getPlatformConfig } from '@/constants/platforms';

interface RecentlyViewedProps {
  isCollapsed?: boolean;
}

const typeConfig = {
  post: { 
    icon: Edit3, 
    color: 'text-blue-600',
    label: 'Post'
  },
  insight: { 
    icon: Lightbulb, 
    color: 'text-yellow-600',
    label: 'Insight'
  },
  transcript: { 
    icon: FileText, 
    color: 'text-green-600',
    label: 'Transcript'
  }
};

function RecentItemRow({ item, onRemove, isCollapsed }: { 
  item: RecentItem; 
  onRemove: () => void;
  isCollapsed: boolean;
}) {
  const config = typeConfig[item.type];
  const Icon = config.icon;
  
  // Format time ago
  const timeAgo = (() => {
    const now = new Date();
    const viewed = new Date(item.viewedAt);
    const diffMs = now.getTime() - viewed.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  })();

  if (isCollapsed) {
    const PlatformIcon = item.platform ? getPlatformConfig(item.platform as any).icon : null;
    const platformConfig = item.platform ? getPlatformConfig(item.platform as any) : null;
    
    return (
      <Link
        href={item.url}
        className="relative flex items-center justify-center p-2 rounded-lg transition-colors hover:bg-gray-100 group"
        title={`${item.title} (${timeAgo})`}
      >
        <Icon className={`h-4 w-4 ${config.color}`} />
        {item.platform && PlatformIcon && platformConfig && (
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
            platformConfig.color
          } flex items-center justify-center`}>
            <PlatformIcon className="h-1.5 w-1.5 text-white" />
          </div>
        )}
      </Link>
    );
  }

  const PlatformIcon = item.platform ? getPlatformConfig(item.platform as any).icon : null;
  const platformConfig = item.platform ? getPlatformConfig(item.platform as any) : null;

  return (
    <div className="relative group">
      <Link
        href={item.url}
        className="flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-gray-100"
      >
        <Icon className={`h-3.5 w-3.5 ${config.color} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-900 truncate">
            {item.title}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <span>{timeAgo}</span>
            {item.platform && PlatformIcon && platformConfig && (
              <>
                <span>•</span>
                <div className="flex items-center gap-0.5">
                  <PlatformIcon className="h-2 w-2" />
                  <span>{platformConfig.label}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          onRemove();
        }}
        className="absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200"
        title="Remove from recent"
      >
        <X className="h-2.5 w-2.5 text-gray-500" />
      </button>
    </div>
  );
}

export function RecentlyViewed({ isCollapsed = false }: RecentlyViewedProps) {
  const { recentItems, removeRecentItem, clearRecentItems } = useRecentlyViewed();
  
  // Show only the 5 most recent items
  const displayItems = recentItems.slice(0, 5);

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      {!isCollapsed && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Recently Viewed
          </h3>
          <button
            onClick={clearRecentItems}
            className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
            title="Clear all recent items"
          >
            Clear
          </button>
        </div>
      )}

      <div className={`space-y-1 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        {displayItems.map((item) => (
          <RecentItemRow
            key={`${item.type}-${item.id}`}
            item={item}
            isCollapsed={isCollapsed}
            onRemove={() => removeRecentItem(item.id, item.type)}
          />
        ))}
      </div>
      
      {!isCollapsed && displayItems.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="text-[10px] text-gray-400 text-center">
            <Clock className="inline h-2.5 w-2.5 mr-1" />
            Last {displayItems.length} viewed
          </div>
        </div>
      )}
    </div>
  );
}