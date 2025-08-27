'use client';

import type { PostView } from '@/types';
import { StatusTabs, type StatusFilter } from './index';
import { Edit3, Eye, CheckSquare, Calendar } from 'lucide-react';

// Core workflow filters - All Posts first, then workflow progression: review → approve → schedule
const POST_STATUS_FILTERS: StatusFilter<PostView>[] = [
  { 
    key: 'all', 
    label: 'All Posts', 
    count: (posts) => posts.length,
    icon: Edit3,
    iconColor: 'text-gray-600'
  },
  { 
    key: 'needs_review', 
    label: 'Needs Review', 
    count: (posts) => posts.filter(p => p.status === 'needs_review').length,
    icon: Eye,
    iconColor: 'text-amber-600'
  },
  { 
    key: 'approved', 
    label: 'Ready to Schedule', 
    count: (posts) => posts.filter(p => p.status === 'approved').length,
    icon: CheckSquare,
    iconColor: 'text-green-600'
  },
  { 
    key: 'scheduled', 
    label: 'Scheduled', 
    count: (posts) => posts.filter(p => p.status === 'scheduled').length,
    icon: Calendar,
    iconColor: 'text-blue-600'
  },
];

interface PostsStatusTabsProps {
  activeFilter: string;
  posts: PostView[];
  onFilterChange: (filter: string) => void;
}

export function PostsStatusTabs({ activeFilter, posts, onFilterChange }: PostsStatusTabsProps) {
  return (
    <StatusTabs
      activeFilter={activeFilter}
      items={posts}
      filters={POST_STATUS_FILTERS}
      onFilterChange={onFilterChange}
      layout="grid" // Posts use grid layout like Insights/Transcripts
    />
  );
}