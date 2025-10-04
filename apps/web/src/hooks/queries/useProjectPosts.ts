import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { postsListByProject } from '@/api/posts/posts'

export type ProjectPostsResponse = Awaited<ReturnType<typeof postsListByProject>>
export type ProjectPostsQueryResult = UseQueryResult<ProjectPostsResponse, unknown>

export function useProjectPosts(
  projectId: string,
  enabled: boolean,
  initialData?: ProjectPostsResponse,
) {
  return useQuery<ProjectPostsResponse>({
    queryKey: ['posts', { projectId, page: 1, pageSize: 100 }],
    queryFn: ({ signal }) => postsListByProject(projectId, { page: 1, pageSize: 100 }, signal),
    enabled: !!projectId && enabled,
    initialData,
  })
}
