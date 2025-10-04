import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PostSchema, type Post } from '@content/shared-types'
import type { ProjectPostsResponse } from '@/hooks/queries/useProjectPosts'
import { getEcho } from '@/lib/realtime/echo'

const POSTS_QUERY_KEY = (projectId: string) => ['posts', { projectId, page: 1, pageSize: 100 }] as const

type Options = {
  enabled?: boolean
}

export function useRealtimePosts(projectId: string, userId: string | null | undefined, options: Options = {}) {
  const { enabled = true } = options
  const client = useQueryClient()

  useEffect(() => {
    if (!enabled || !projectId || !userId) {
      return undefined
    }

    let active = true

    try {
      const echo = getEcho()
      const channel = echo.private(`user.${userId}`)

      const handlePostRegenerated = (payload: { post?: unknown }) => {
        if (!active) {
          return
        }
        try {
          const parsed = PostSchema.parse(payload.post)
          if (!parsed || parsed.projectId !== projectId) {
            return
          }
          client.setQueryData<ProjectPostsResponse | undefined>(POSTS_QUERY_KEY(projectId), (current) => {
            if (!current) {
              return current
            }
            const exists = (current.items ?? []).some((item) => item.id === parsed.id)
            if (!exists) {
              return current
            }
            const mergedItems = current.items.map((item) => {
              if (item.id !== parsed.id) {
                return item
              }
              const merged: Post = {
                ...item,
                ...parsed,
              }
              return merged
            })
            return {
              ...current,
              items: mergedItems,
            }
          })
        } catch (error) {
          console.error('Failed to handle post.regenerated event', error)
        }
      }

      channel.listen('.post.regenerated', handlePostRegenerated)

      return () => {
        active = false
        channel.stopListening('.post.regenerated')
        echo.leave(`user.${userId}`)
      }
    } catch (error) {
      console.error('Realtime posts subscription failed', error)
      return undefined
    }
  }, [client, enabled, projectId, userId])
}
