/**
 * React Query Scheduler Mutations with Optimistic Updates
 * 
 * Converts Zustand scheduler mutations to React Query mutations
 * with optimistic UI updates for instant feedback.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptimisticUpdate } from '@/hooks/useOptimisticUpdate';
import { schedulerAPI } from '@/lib/api/scheduler';
import type { CalendarEvent, PostView, Platform } from '@/types';
import { EntityType } from '@content-creation/types';
import { useToast } from '@/lib/toast';

/**
 * ★ Insight ─────────────────────────────────────
 * These mutations use React Query's optimistic update pattern
 * with onMutate, onError, and onSettled to provide instant UI feedback
 * while ensuring data consistency through automatic rollback on errors.
 * ─────────────────────────────────────────────────
 */

/**
 * Schedule an approved post to the calendar
 */
export function useSchedulePost() {
  const queryClient = useQueryClient();
  const { executeWithOptimism } = useOptimisticUpdate();
  const toast = useToast();

  return useMutation({
    mutationFn: async (params: {
      postId: string;
      dateTime: Date;
      platform: Platform;
      content: string;
    }) => {
      const { postId, dateTime, platform, content } = params;

      // Get the post for optimistic updates
      const schedulerData = queryClient.getQueryData<{
        events: CalendarEvent[];
        approvedPosts: PostView[];
      }>(['scheduler']);

      const post = schedulerData?.approvedPosts.find(p => p.id === postId);
      if (!post) {
        throw new Error('Post not found');
      }

      // Create optimistic calendar event
      const optimisticEvent: CalendarEvent = {
        id: `temp-${postId}-${Date.now()}`, // Temporary ID
        postId,
        platform,
        scheduledTime: dateTime,
        status: 'scheduled',
        content: post.content,
        title: post.title,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Execute with optimistic update
      const result = await executeWithOptimism({
        entityType: EntityType.SCHEDULED_POST,
        entityId: postId,
        action: 'schedule',
        optimisticData: optimisticEvent,
        originalData: post,
        serverAction: async () => {
          const response = await schedulerAPI.scheduleApprovedPost({
            postId,
            platform,
            content,
            datetime: dateTime.toISOString(),
          });

          if (!response.success) {
            return { success: false, error: response.error };
          }

          return { success: true, data: response.data };
        },
        successMessage: 'Post scheduled successfully',
        errorMessage: 'Failed to schedule post',
      });

      return result;
    },

    onMutate: async (params) => {
      // Cancel any outgoing refetches for scheduler data
      await queryClient.cancelQueries({ queryKey: ['scheduler'] });
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });

      // Snapshot the previous value for rollback
      const previousSchedulerData = queryClient.getQueryData(['scheduler']);
      const previousDashboardData = queryClient.getQueryData(['dashboard']);

      // Optimistically update the cache with the new event
      queryClient.setQueryData(['scheduler'], (old: any) => {
        if (!old) return old;

        const post = old.approvedPosts.find((p: PostView) => p.id === params.postId);
        if (!post) return old;

        const optimisticEvent: CalendarEvent = {
          id: `temp-${params.postId}-${Date.now()}`,
          postId: params.postId,
          platform: params.platform,
          scheduledTime: params.dateTime,
          status: 'scheduled' as const,
          content: post.content,
          title: post.title,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        return {
          ...old,
          events: [...old.events, optimisticEvent],
        };
      });

      return { previousSchedulerData, previousDashboardData };
    },

    onError: (err, params, context) => {
      // Rollback optimistic updates on error
      if (context?.previousSchedulerData) {
        queryClient.setQueryData(['scheduler'], context.previousSchedulerData);
      }
      if (context?.previousDashboardData) {
        queryClient.setQueryData(['dashboard'], context.previousDashboardData);
      }
      
      toast.error(err instanceof Error ? err.message : 'Failed to schedule post');
    },

    onSettled: () => {
      // Always refetch after mutation settles to ensure cache consistency
      queryClient.invalidateQueries({ queryKey: ['scheduler'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Update scheduled event time
 */
export function useUpdateEventTimeMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ eventId, newDateTime }: {
      eventId: string;
      newDateTime: Date;
    }) => {
      const response = await api.scheduler.updateScheduledEvent(eventId, {
        scheduledTime: newDateTime.toISOString()
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update event');
      }
      
      return response.data;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.events() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.main() });
    },
    onError: (error) => {
      console.error('Failed to update event time:', error);
      toast.apiError('update event', error instanceof Error ? error.message : 'Unknown error occurred');
    },
  });
}

/**
 * Delete scheduled event
 */
export function useDeleteEventMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const response = await api.scheduler.deleteScheduledEvent(eventId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete event');
      }
      
      return response.data;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.events() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.main() });
    },
    onError: (error) => {
      console.error('Failed to delete event:', error);
      toast.apiError('delete event', error instanceof Error ? error.message : 'Unknown error occurred');
    },
  });
}

/**
 * Combined mutations hook for convenience
 */
export function useSchedulerMutations() {
  const schedulePost = useSchedulePostMutation();
  const updateEventTime = useUpdateEventTimeMutation();
  const deleteEvent = useDeleteEventMutation();

  return {
    schedulePost: {
      mutate: (postId: string, dateTime: Date, platform: Platform) => 
        schedulePost.mutate({ postId, dateTime, platform }),
      ...schedulePost
    },
    updateEventTime: {
      mutate: (eventId: string, newDateTime: Date) => 
        updateEventTime.mutate({ eventId, newDateTime }),
      ...updateEventTime
    },
    deleteEvent: {
      mutate: (eventId: string) => deleteEvent.mutate(eventId),
      ...deleteEvent
    }
  };
}