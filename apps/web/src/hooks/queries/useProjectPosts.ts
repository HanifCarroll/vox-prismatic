import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import * as postsClient from '@/lib/client/posts'

export type ProjectPostsResponse = Awaited<ReturnType<typeof postsClient.listForProject>>
export type ProjectPostsQueryResult = UseQueryResult<ProjectPostsResponse, unknown>

export function useProjectPosts(
  projectId: string,
  enabled: boolean,
  initialData?: ProjectPostsResponse,
) {
  return useQuery<ProjectPostsResponse>({
    queryKey: ['posts', { projectId, page: 1, pageSize: 100 }],
    queryFn: () => postsClient.listForProject(projectId, { page: 1, pageSize: 100 }),
    enabled: !!projectId && enabled,
    initialData,
  })
}
