import { usePostsFrameworks } from '@/api/posts/posts'

export function useHookFrameworks(enabled: boolean) {
  return usePostsFrameworks({
    query: {
      enabled,
      staleTime: 1000 * 60 * 30,
    },
  })
}

export type HookFrameworksQueryResult = ReturnType<typeof useHookFrameworks>
