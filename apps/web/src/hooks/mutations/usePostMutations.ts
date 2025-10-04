import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  usePostsUpdate,
  usePostsBulkSetStatus,
  usePostsPublishNow,
  usePostsBulkRegenerate,
  usePostsAutoSchedule,
  usePostsSchedule,
  usePostsUnschedule,
  usePostsAutoScheduleProject,
  postsListByProject,
} from '@/api/posts/posts'
import { toast } from 'sonner'
import type { ApiError } from '@/lib/client/base'
import type {
  PostStatus,
  PostsListByProject200ItemsItem,
  PostsBulkRegenerateBody,
} from '@/api/generated.schemas'

// For backward compatibility
type ProjectPostsResponse = Awaited<ReturnType<typeof postsListByProject>>
type ProjectPost = PostsListByProject200ItemsItem
type BulkRegenerateRequest = PostsBulkRegenerateBody

export function useUpdatePost(projectId: string) {
  const qc = useQueryClient()
  const updateMutation = usePostsUpdate()

  return {
    ...updateMutation,
    mutate: ({
      postId,
      data,
    }: {
      postId: string
      data: { content?: string; hashtags?: string[]; status?: PostStatus }
    }) => {
      updateMutation.mutate(
        { id: postId, data },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
            toast.success('Post updated')
          },
        }
      )
    },
  }
}

export function useBulkSetStatus(projectId: string) {
  const qc = useQueryClient()
  const bulkMutation = usePostsBulkSetStatus()

  return {
    ...bulkMutation,
    mutate: ({ ids, status }: { ids: string[]; status: PostStatus }) => {
      bulkMutation.mutate(
        { data: { ids, status } },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
            toast.success('Bulk update applied')
          },
        }
      )
    },
  }
}

export function usePublishNow(projectId?: string) {
  const qc = useQueryClient()
  const publishMutation = usePostsPublishNow()

  return {
    ...publishMutation,
    mutate: (postId: string) => {
      publishMutation.mutate(
        { id: postId },
        {
          onSuccess: () => {
            if (projectId) {
              qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
            }
            toast.success('Post published on LinkedIn')
          },
          onError: (error: ApiError) => {
            toast.error(error.error || 'Failed to publish post')
          },
        }
      )
    },
  }
}

export function useBulkRegeneratePosts(projectId: string) {
  const qc = useQueryClient()
  const regenerateMutation = usePostsBulkRegenerate({
    mutation: {
      onMutate: async ({ data }: { data: BulkRegenerateRequest }) => {
        const { ids } = data
        // Optimistically mark selected posts as pending
        await qc.cancelQueries({ queryKey: ['posts', { projectId, page: 1, pageSize: 100 }] })
        const prev = qc.getQueryData<ProjectPostsResponse>(['posts', { projectId, page: 1, pageSize: 100 }])
        qc.setQueryData<ProjectPostsResponse>(['posts', { projectId, page: 1, pageSize: 100 }], (cur) => {
          if (!cur) {
            return cur
          }
          return {
            ...cur,
            items: (cur.items || []).map((post: ProjectPost) =>
              ids.includes(post.id) ? { ...post, status: 'pending' as PostStatus } : post
            ),
          }
        })
        return { prev }
      },
      onError: (_err, _vars, ctx) => {
        // Rollback optimistic update
        if (ctx?.prev) {
          qc.setQueryData(['posts', { projectId, page: 1, pageSize: 100 }], ctx.prev)
        }
        toast.error('Failed to regenerate posts')
      },
      onSuccess: (response) => {
        // Merge regenerated posts into the cache by stable post id, preserving order
        qc.setQueryData<ProjectPostsResponse>(['posts', { projectId, page: 1, pageSize: 100 }], (previous) => {
          if (!previous || !response?.items) {
            return previous
          }
          const existingItems: ProjectPost[] = previous.items || []
          const regeneratedById = new Map<string, ProjectPost>(response.items.map((post) => [post.id, post]))
          const mergedItems = existingItems.map((existingPost: ProjectPost) => {
            const updated = regeneratedById.get(existingPost.id)
            return updated ? { ...existingPost, ...updated } : existingPost
          })
          return { ...previous, items: mergedItems }
        })
        // Also refresh in the background to keep meta in sync
        qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
        toast.success('Regeneration queued')
      },
    },
  })

  return regenerateMutation
}

export function useSchedulePost(projectId: string) {
  const qc = useQueryClient()
  const scheduleMutation = usePostsSchedule<ApiError>()

  return {
    ...scheduleMutation,
    mutate: ({ postId, scheduledAt }: { postId: string; scheduledAt: Date }) => {
      const iso = scheduledAt instanceof Date ? scheduledAt.toISOString() : new Date(scheduledAt).toISOString()
      scheduleMutation.mutate(
        { id: postId, data: { scheduledAt: iso } },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
            toast.success('Post scheduled')
          },
          onError: (error: ApiError) => {
            toast.error(error.error || 'Failed to schedule post')
          },
        }
      )
    },
  }
}

export function useUnschedulePost(projectId: string) {
  const qc = useQueryClient()
  const unscheduleMutation = usePostsUnschedule<ApiError>()

  return {
    ...unscheduleMutation,
    mutate: ({ postId }: { postId: string }) => {
      unscheduleMutation.mutate(
        { id: postId },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
            toast.success('Post unscheduled')
          },
          onError: (error: ApiError) => {
            toast.error(error.error || 'Failed to unschedule post')
          },
        }
      )
    },
  }
}

export function useAutoschedulePost(projectId: string) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const autoScheduleMutation = usePostsAutoSchedule<ApiError>()

  return {
    ...autoScheduleMutation,
    mutate: (postId: string) => {
      autoScheduleMutation.mutate(
        { id: postId },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
            toast.success('Post auto-scheduled')
          },
          onError: (error: ApiError) => {
            const msg = error.error || 'Failed to auto-schedule post'
            const openScheduling = () => navigate({ to: '/settings', search: { tab: 'scheduling' } })
            const openIntegrations = () => navigate({ to: '/settings', search: { tab: 'integrations' } })
            if (/No preferred timeslots configured/i.test(msg)) {
              toast.error(msg, { action: { label: 'Open Scheduling', onClick: openScheduling } })
              return
            }
            if (/No available timeslot/i.test(msg)) {
              toast.error(msg, { action: { label: 'Open Scheduling', onClick: openScheduling } })
              return
            }
            if (/LinkedIn is not connected/i.test(msg)) {
              toast.error(msg, { action: { label: 'Connect LinkedIn', onClick: openIntegrations } })
              return
            }
            if (/must be approved/i.test(msg)) {
              toast.error('Approve the post before scheduling')
              return
            }
            if (/already scheduled/i.test(msg)) {
              toast.error('Post is already scheduled. Unschedule it first.')
              return
            }
            toast.error(msg)
          },
        }
      )
    },
  }
}

export function useAutoscheduleProject(projectId: string) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const autoscheduleProjectMutation = usePostsAutoScheduleProject<ApiError>()

  return {
    ...autoscheduleProjectMutation,
    mutate: (vars: { limit?: number } = {}) => {
      autoscheduleProjectMutation.mutate(
        { projectId, data: { ...(typeof vars.limit === 'number' ? { limit: vars.limit } : {}) } },
        {
          onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
            const scheduledCount = Number(res.meta?.scheduledCount ?? 0)
            const requested = Number(res.meta?.requested ?? vars.limit ?? scheduledCount)
            toast.success(`Auto-scheduled ${scheduledCount}/${requested} posts`)
          },
          onError: (error: ApiError) => {
            const msg = error.error || 'Failed to auto-schedule project posts'
            const openScheduling = () => navigate({ to: '/settings', search: { tab: 'scheduling' } })
            const openIntegrations = () => navigate({ to: '/settings', search: { tab: 'integrations' } })
            if (/No preferred timeslots configured/i.test(msg)) {
              toast.error(msg, { action: { label: 'Open Scheduling', onClick: openScheduling } })
              return
            }
            if (/No available timeslot/i.test(msg)) {
              toast.error(msg, { action: { label: 'Open Scheduling', onClick: openScheduling } })
              return
            }
            if (/LinkedIn is not connected/i.test(msg)) {
              toast.error(msg, { action: { label: 'Connect LinkedIn', onClick: openIntegrations } })
              return
            }
            toast.error(msg)
          },
        }
      )
    },
  }
}
