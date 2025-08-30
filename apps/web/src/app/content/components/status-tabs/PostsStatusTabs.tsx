
import type { PostView } from '@/types';
import { StatusTabs, type StatusFilter } from './index';
import { Edit3, Eye, CheckSquare, Calendar } from 'lucide-react';
import { useMemo } from 'react';

interface PostsStatusTabsProps {
  activeFilter: string;
  posts: PostView[];
  onFilterChange: (filter: string) => void;
  globalCounts?: {
    total: number;
    needs_review: number;
    approved: number;
    scheduled: number;
    published: number;
    failed: number;
    rejected: number;
    archived: number;
  };
}

export function PostsStatusTabs({ activeFilter, posts, onFilterChange, globalCounts }: PostsStatusTabsProps) {
  const filters = useMemo(() => {
    const useGlobal = !!globalCounts;
    
    return [
      { 
        key: 'all', 
        label: 'All Posts', 
        count: () => useGlobal ? globalCounts.total : posts.length,
        icon: Edit3,
        iconColor: 'text-gray-600'
      },
      { 
        key: 'needs_review', 
        label: 'Needs Review', 
        count: () => useGlobal ? globalCounts.needs_review : posts.filter(p => p.status === 'needs_review').length,
        icon: Eye,
        iconColor: 'text-amber-600'
      },
      { 
        key: 'approved', 
        label: 'Ready to Schedule', 
        count: () => useGlobal ? globalCounts.approved : posts.filter(p => p.status === 'approved').length,
        icon: CheckSquare,
        iconColor: 'text-green-600'
      },
      { 
        key: 'scheduled', 
        label: 'Scheduled', 
        count: () => useGlobal ? globalCounts.scheduled : posts.filter(p => p.status === 'scheduled').length,
        icon: Calendar,
        iconColor: 'text-blue-600'
      },
    ] as StatusFilter<PostView>[];
  }, [posts, globalCounts]);
  
  return (
    <StatusTabs
      activeFilter={activeFilter}
      items={posts}
      filters={filters}
      onFilterChange={onFilterChange}
      layout="grid" // Posts use grid layout like Insights/Transcripts
    />
  );
}