import { z } from 'zod'
import {
  ListPostsQuerySchema,
  PostSchema,
  BulkApprovePostsRequestSchema,
  BulkApprovePostsResponseSchema,
  UpdatePostRequestSchema,
  PublishNowResponseSchema,
} from '@content/shared-types'
import { fetchJson, parseWith } from './base'

const PostsListResponse = z.object({
  items: z.array(PostSchema),
  meta: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }),
})
const PostEnvelope = z.object({ post: PostSchema })

export async function listForProject(
  projectId: number,
  query?: z.infer<typeof ListPostsQuerySchema>,
) {
  const sp = new URLSearchParams()
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (typeof v === 'undefined' || v === null || v === '') return
      sp.set(k, String(v))
    })
  }
  const qs = sp.toString()
  const data = await fetchJson(`/api/posts/projects/${projectId}/posts${qs ? `?${qs}` : ''}`)
  return parseWith(PostsListResponse, data)
}

export async function get(postId: number) {
  const data = await fetchJson(`/api/posts/posts/${postId}`)
  return parseWith(PostEnvelope, data)
}

export async function update(postId: number, req: z.infer<typeof UpdatePostRequestSchema>) {
  const body = JSON.stringify(parseWith(UpdatePostRequestSchema, req))
  const data = await fetchJson(`/api/posts/posts/${postId}`, { method: 'PATCH', body })
  return parseWith(PostEnvelope, data)
}

export async function publishNow(postId: number) {
  const data = await fetchJson(`/api/posts/posts/${postId}/publish`, { method: 'POST' })
  return parseWith(PublishNowResponseSchema, data)
}

export async function bulkApprove(req: z.infer<typeof BulkApprovePostsRequestSchema>) {
  const body = JSON.stringify(parseWith(BulkApprovePostsRequestSchema, req))
  const data = await fetchJson('/api/posts/posts/bulk', { method: 'PATCH', body })
  return parseWith(BulkApprovePostsResponseSchema, data)
}

