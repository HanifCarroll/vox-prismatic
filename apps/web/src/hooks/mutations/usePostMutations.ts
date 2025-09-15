import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as postsClient from '@/lib/client/posts'
import { toast } from 'sonner'

export function useUpdatePost(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, data }: { postId: number; data: { content?: string; status?: 'pending' | 'approved' | 'rejected' } }) =>
      postsClient.update(postId, data as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
      toast.success('Post updated')
    },
  })
}

export function useBulkSetStatus(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: 'pending' | 'approved' | 'rejected' }) =>
      postsClient.bulkSetStatus({ ids, status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
      toast.success('Bulk update applied')
    },
  })
}

export function usePublishNow() {
  return useMutation({
    mutationFn: (postId: number) => postsClient.publishNow(postId),
    onSuccess: () => toast.success('Post published on LinkedIn'),
  })
}

export function useBulkRegeneratePosts(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids }: { ids: number[] }) => postsClient.bulkRegenerate({ ids }),
    onMutate: async ({ ids }) => {
      // Optimistically mark selected posts as pending
      await qc.cancelQueries({ queryKey: ['posts', { projectId, page: 1, pageSize: 100 }] })
      const prev = qc.getQueryData<any>(['posts', { projectId, page: 1, pageSize: 100 }])
      qc.setQueryData<any>(['posts', { projectId, page: 1, pageSize: 100 }], (cur) => {
        if (!cur) return cur
        return {
          ...cur,
          items: (cur.items || []).map((p: any) => (ids.includes(p.id) ? { ...p, status: 'pending' } : p)),
        }
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      // Rollback optimistic update
      if (ctx?.prev) qc.setQueryData(['posts', { projectId, page: 1, pageSize: 100 }], ctx.prev)
      toast.error('Failed to regenerate posts')
    },
    onSuccess: (response) => {
      // Merge regenerated posts into the cache by stable post id, preserving order
      qc.setQueryData<any>(['posts', { projectId, page: 1, pageSize: 100 }], (previous) => {
        if (!previous || !response?.items) return previous
        const existingItems: any[] = previous.items || []
        const regeneratedById = new Map<number, any>(
          response.items.map((post: any) => [post.id, post]),
        )
        const mergedItems = existingItems.map((existingPost) => {
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
