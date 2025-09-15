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
    onSuccess: (data) => {
      // Merge returned items into cache for instant UI update
      qc.setQueryData<any>(['posts', { projectId, page: 1, pageSize: 100 }], (prev) => {
        if (!prev || !data?.items) return prev
        const map = new Map<number, any>()
        for (const it of prev.items || []) map.set(it.id, it)
        for (const it of data.items) map.set(it.id, { ...map.get(it.id), ...it })
        return { ...prev, items: Array.from(map.values()) }
      })
      qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
      toast.success('Regenerated selected posts')
    },
  })
}
