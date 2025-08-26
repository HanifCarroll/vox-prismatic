'use client';

import type { PostView } from '@/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// Filter configuration
const statusFilters = [
  { key: 'all', label: 'All Posts', count: (posts: PostView[]) => posts.length },
  { key: 'draft', label: 'Draft', count: (posts: PostView[]) => posts.filter(p => p.status === 'draft').length },
  { key: 'needs_review', label: 'Needs Review', count: (posts: PostView[]) => posts.filter(p => p.status === 'needs_review').length },
  { key: 'approved', label: 'Approved', count: (posts: PostView[]) => posts.filter(p => p.status === 'approved').length },
  { key: 'scheduled', label: 'Scheduled', count: (posts: PostView[]) => posts.filter(p => p.status === 'scheduled').length },
  { key: 'published', label: 'Published', count: (posts: PostView[]) => posts.filter(p => p.status === 'published').length },
  { key: 'failed', label: 'Failed', count: (posts: PostView[]) => posts.filter(p => p.status === 'failed').length },
  { key: 'archived', label: 'Archived', count: (posts: PostView[]) => posts.filter(p => p.status === 'archived').length }
];

interface PostsStatusTabsProps {
  activeFilter: string;
  posts: PostView[];
  onFilterChange: (filter: string) => void;
}

export function PostsStatusTabs({ activeFilter, posts, onFilterChange }: PostsStatusTabsProps) {
  return (
    <div className="mb-6 w-full">
      <Tabs value={activeFilter} onValueChange={onFilterChange} className="w-full">
        <div className="overflow-x-auto scrollbar-custom scrollbar-hide-mobile pb-1">
          <TabsList className="flex h-auto p-1 bg-muted/30 rounded-lg border border-border w-max min-w-full">
            {statusFilters.map((filter) => (
              <TabsTrigger 
                key={filter.key} 
                value={filter.key}
                className="flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-md font-medium text-xs sm:text-sm transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border hover:bg-background/50 hover:text-foreground/80 flex-shrink-0"
              >
                <span>{filter.label}</span>
                <Badge 
                  variant={activeFilter === filter.key ? "default" : "secondary"} 
                  className={`text-[10px] sm:text-xs font-semibold px-1 sm:px-1.5 h-4 sm:h-5 min-w-[18px] flex items-center justify-center ${
                    activeFilter === filter.key 
                      ? "bg-primary/10 text-primary border-primary/20" 
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {filter.count(posts)}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </div>
  );
}