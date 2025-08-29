'use client';

import { useEffect, type ReactNode } from 'react';
import { useSchedulerStore } from './scheduler-store';
import type { CalendarEvent } from '@/types';
import type { ApprovedPost } from '@/types/scheduler';
import { usePostsData } from '@/app/content/hooks/use-server-actions';
import { useMemo } from 'react';
import type { PostView } from '@/types';

interface SchedulerHydrationProps {
  children: ReactNode;
  initialEvents?: CalendarEvent[];
  initialApprovedPosts?: ApprovedPost[];
  preselectedPostId?: string;
}

/**
 * SchedulerHydration component
 * Hydrates the Zustand store with initial data and handles preselected posts
 */
export function SchedulerHydration({
  children,
  initialEvents = [],
  initialApprovedPosts = [],
  preselectedPostId
}: SchedulerHydrationProps) {
  const {
    setEventsData,
    setApprovedPostsData,
    openModal,
  } = useSchedulerStore();
  
  // Use server actions to get fresh approved posts (similar to CalendarContext)
  const postsData = usePostsData();
  
  // Transform PostView[] to ApprovedPost[] format expected by the scheduler  
  const approvedPosts = useMemo(() => 
    (postsData.data || [])
      .filter((post: PostView) => post.status === 'approved')
      .map((post: PostView) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        platform: post.platform,
        insightId: post.insightId,
        status: post.status,
        characterCount: post.characterCount || post.content.length,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        insightTitle: post.insightTitle,
        transcriptTitle: post.transcriptTitle,
      } as ApprovedPost)), 
    [postsData.data]
  );

  // Hydrate initial data
  useEffect(() => {
    if (initialEvents.length > 0) {
      setEventsData(initialEvents);
    }
    if (initialApprovedPosts.length > 0) {
      setApprovedPostsData(initialApprovedPosts);
    }
  }, [initialEvents, initialApprovedPosts, setEventsData, setApprovedPostsData]);

  // Update approved posts when fresh data comes in
  useEffect(() => {
    if (approvedPosts.length > 0) {
      setApprovedPostsData(approvedPosts);
    }
  }, [approvedPosts, setApprovedPostsData]);

  // Handle preselected post (similar to CalendarContext logic)
  useEffect(() => {
    if (preselectedPostId && approvedPosts.length > 0) {
      const preselectedPost = approvedPosts.find((post) => post.id === preselectedPostId);
      if (preselectedPost) {
        openModal('post_schedule' as any, {
          postId: preselectedPost.id,
          postData: {
            id: preselectedPost.id,
            title: preselectedPost.title,
            content: preselectedPost.content,
            platform: preselectedPost.platform,
          },
          initialPlatform: preselectedPost.platform,
          mode: 'create',
        });
      }
    }
  }, [preselectedPostId, approvedPosts, openModal]);

  return <>{children}</>;
}