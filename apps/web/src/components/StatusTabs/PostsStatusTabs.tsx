'use client';

import type { PostView } from '@/types';
import { StatusTabs, type StatusFilter } from './index';

// Core workflow filters - focused on the review → approve → schedule flow
const POST_STATUS_FILTERS: StatusFilter<PostView>[] = [
  { 
    key: 'needs_review', 
    label: 'Needs Review', 
    count: (posts) => posts.filter(p => p.status === 'needs_review').length 
  },
  { 
    key: 'approved', 
    label: 'Ready to Schedule', 
    count: (posts) => posts.filter(p => p.status === 'approved').length 
  },
  { 
    key: 'scheduled', 
    label: 'Scheduled', 
    count: (posts) => posts.filter(p => p.status === 'scheduled').length 
  },
  { 
    key: 'all', 
    label: 'All Posts', 
    count: (posts) => posts.length 
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
      layout="scroll" // Posts use horizontal scrolling layout
    />
  );
}