import { useQuery } from '@tanstack/react-query'
import * as postsClient from '@/lib/client/posts'

export function useHookFrameworks(enabled: boolean) {
  return useQuery({
    queryKey: ['hook-frameworks'],
    queryFn: () => postsClient.listHookFrameworks(),
    enabled,
    staleTime: 1000 * 60 * 30,
  })
}

export type HookFrameworksQueryResult = ReturnType<typeof useHookFrameworks>
