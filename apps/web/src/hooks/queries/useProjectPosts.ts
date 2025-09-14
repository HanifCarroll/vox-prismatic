import { useQuery } from '@tanstack/react-query'
import * as postsClient from '@/lib/client/posts'

export function useProjectPosts(projectId: number) {
  return useQuery({
    queryKey: ['posts', { projectId, page: 1, pageSize: 1000 }],
    queryFn: () => postsClient.listForProject(projectId, { page: 1, pageSize: 1000 }),
    enabled: !!projectId,
  })
}

