import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import * as postsClient from '@/lib/client/posts'
import { toast } from 'sonner'
import type { ApiError } from '@/lib/client/base'
import type { PostStatus, BulkRegenerateRequest } from '@content/shared-types'
type ProjectPostsResponse = Awaited<ReturnType<typeof postsClient.listForProject>>
type ProjectPost = ProjectPostsResponse['items'][number]

export function useUpdatePost(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      postId,
      data,
    }: {
      postId: number
      data: { content?: string; hashtags?: string[]; status?: PostStatus }
    }) => postsClient.update(postId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
      toast.success('Post updated')
    },
  })
}

export function useBulkSetStatus(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: PostStatus }) =>
      postsClient.bulkSetStatus({ ids, status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
      toast.success('Bulk update applied')
    },
  })
}

export function usePublishNow(projectId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (postId: number) => postsClient.publishNow(postId),
    onSuccess: () => {
      if (projectId) {
        qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
      }
      toast.success('Post published on LinkedIn')
    },
    onError: (error: ApiError) => {
      toast.error(error.error || 'Failed to publish post')
    },
  })
}

export function useBulkRegeneratePosts(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: BulkRegenerateRequest) => postsClient.bulkRegenerate(vars),
    onMutate: async ({ ids }) => {
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
            ids.includes(post.id) ? { ...post, status: 'pending' } : post,
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
        const regeneratedById = new Map<number, ProjectPost>(response.items.map((post) => [post.id, post]))
        const mergedItems = existingItems.map((existingPost: ProjectPost) => {
          const updated = regeneratedById.get(existingPost.id)
          return updated ? { ...existingPost, ...updated } : existingPost
        })
        return { ...previous, items: mergedItems }
      })
      // Also refresh in the background to keep meta in sync
      qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
      toast.success('Regenerated selected posts')
    },
  })
}

export function useSchedulePost(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, scheduledAt }: { postId: number; scheduledAt: Date }) =>
      postsClient.schedule(postId, { scheduledAt }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
      toast.success('Post scheduled')
    },
    onError: (error: ApiError) => {
      toast.error(error.error || 'Failed to schedule post')
    },
  })
}

export function useUnschedulePost(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ postId }: { postId: number }) => postsClient.unschedule(postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
      toast.success('Post unscheduled')
    },
    onError: (error: ApiError) => {
      toast.error(error.error || 'Failed to unschedule post')
    },
  })
}

export function useAutoschedulePost(projectId: number) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (postId: number) => postsClient.autoschedulePost(postId),
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
  })
}

export function useAutoscheduleProject(projectId: number) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (vars: { limit?: number } = {}) => postsClient.autoscheduleProject(projectId, vars),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
      toast.success(`Auto-scheduled ${res.meta.scheduledCount}/${res.meta.requested} posts`)
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
  })
}
