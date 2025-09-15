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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts', { projectId }] })
      toast.success('Regenerated selected posts')
    },
  })
}
