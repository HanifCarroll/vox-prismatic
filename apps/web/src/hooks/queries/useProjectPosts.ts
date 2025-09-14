import { useQuery } from '@tanstack/react-query'
import * as postsClient from '@/lib/client/posts'

export function useProjectPosts(projectId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['posts', { projectId, page: 1, pageSize: 100 }],
    queryFn: () => postsClient.listForProject(projectId, { page: 1, pageSize: 100 }),
    enabled: !!projectId && enabled,
  })
}
