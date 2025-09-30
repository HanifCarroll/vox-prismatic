import { z } from 'zod'
import {
  PostSchema,
  BulkSetStatusRequestSchema,
  BulkSetStatusResponseSchema,
  UpdatePostRequestSchema,
  PublishNowResponseSchema,
  BulkRegenerateRequestSchema,
  BulkRegenerateResponseSchema,
  SchedulePostRequestSchema,
  SchedulePostResponseSchema,
  UnschedulePostResponseSchema,
  AutoScheduleProjectRequestSchema,
  AutoScheduleProjectResponseSchema,
  AutoScheduleSingleResponseSchema,
  ListScheduledPostsResponseSchema,
  HookFrameworksResponseSchema,
  HookWorkbenchRequestSchema,
  HookWorkbenchResponseSchema,
  PostAnalyticsQuerySchema,
  PostAnalyticsResponseSchema,
} from '@content/shared-types'
import type {
  ListPostsQuery,
  ListScheduledPostsQuery,
  HookWorkbenchRequest,
  PostAnalyticsQuery,
} from '@content/shared-types'
import { fetchJson, parseWith } from './base'

const PostsListResponse = z.object({
  items: z.array(PostSchema),
  meta: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }),
})
const PostEnvelope = z.object({ post: PostSchema })

export async function listForProject(projectId: string, query?: ListPostsQuery) {
  const sp = new URLSearchParams()
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (typeof v === 'undefined' || v === null) {
        continue
      }
      if (typeof v === 'string' && (v as string).length === 0) {
        continue
      }
      sp.set(k, String(v))
    }
  }
  const qs = sp.toString()
  const data = await fetchJson(`/api/posts/projects/${projectId}/posts${qs ? `?${qs}` : ''}`)
  return parseWith(PostsListResponse, data)
}

export async function get(postId: string) {
  const data = await fetchJson(`/api/posts/posts/${postId}`)
  return parseWith(PostEnvelope, data)
}

export async function update(postId: string, req: z.infer<typeof UpdatePostRequestSchema>) {
  const body = JSON.stringify(parseWith(UpdatePostRequestSchema, req))
  const data = await fetchJson(`/api/posts/posts/${postId}`, { method: 'PATCH', body })
  return parseWith(PostEnvelope, data)
}

export async function publishNow(postId: string) {
  const data = await fetchJson(`/api/posts/posts/${postId}/publish`, { method: 'POST' })
  return parseWith(PublishNowResponseSchema, data)
}

export async function schedule(postId: string, req: { scheduledAt: Date | string }) {
  const payload = parseWith(SchedulePostRequestSchema, req)
  const body = JSON.stringify({ scheduledAt: payload.scheduledAt.toISOString() })
  const data = await fetchJson(`/api/posts/posts/${postId}/schedule`, { method: 'POST', body })
  return parseWith(SchedulePostResponseSchema, data)
}

export async function unschedule(postId: string) {
  const data = await fetchJson(`/api/posts/posts/${postId}/schedule`, { method: 'DELETE' })
  return parseWith(UnschedulePostResponseSchema, data)
}

export async function bulkSetStatus(req: z.infer<typeof BulkSetStatusRequestSchema>) {
  const body = JSON.stringify(parseWith(BulkSetStatusRequestSchema, req))
  const data = await fetchJson('/api/posts/posts/bulk', { method: 'PATCH', body })
  return parseWith(BulkSetStatusResponseSchema, data)
}

export async function bulkRegenerate(req: z.infer<typeof BulkRegenerateRequestSchema>) {
  const body = JSON.stringify(parseWith(BulkRegenerateRequestSchema, req))
  const data = await fetchJson('/api/posts/posts/bulk/regenerate', { method: 'POST', body })
  return parseWith(BulkRegenerateResponseSchema, data)
}

export async function autoschedulePost(postId: string) {
  const data = await fetchJson(`/api/posts/posts/${postId}/auto-schedule`, { method: 'POST' })
  return parseWith(AutoScheduleSingleResponseSchema, data)
}

export async function autoscheduleProject(
  projectId: string,
  req: z.infer<typeof AutoScheduleProjectRequestSchema> = {},
) {
  const body = JSON.stringify(parseWith(AutoScheduleProjectRequestSchema, req))
  const data = await fetchJson(`/api/posts/projects/${projectId}/posts/auto-schedule`, {
    method: 'POST',
    body,
  })
  return parseWith(AutoScheduleProjectResponseSchema, data)
}

export async function listScheduled(query: ListScheduledPostsQuery) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (typeof v === 'undefined' || v === null) {
      continue
    }
    if (typeof v === 'string' && (v as string).length === 0) {
      continue
    }
    sp.set(k, String(v))
  }
  const qs = sp.toString()
  const data = await fetchJson(`/api/posts/posts/scheduled${qs ? `?${qs}` : ''}`)
  return parseWith(ListScheduledPostsResponseSchema, data)
}

export async function listHookFrameworks() {
  const data = await fetchJson('/api/posts/hooks/frameworks')
  return parseWith(HookFrameworksResponseSchema, data)
}

export async function runHookWorkbench(postId: string, req: HookWorkbenchRequest = {}) {
  const body = JSON.stringify(parseWith(HookWorkbenchRequestSchema, req))
  const data = await fetchJson(`/api/posts/posts/${postId}/hooks/workbench`, { method: 'POST', body })
  return parseWith(HookWorkbenchResponseSchema, data)
}

export async function getAnalytics(query: PostAnalyticsQuery = { days: 30 }) {
  const payload = parseWith(PostAnalyticsQuerySchema, query)
  const sp = new URLSearchParams()
  if (payload.days) {
    sp.set('days', String(payload.days))
  }
  const qs = sp.toString()
  const data = await fetchJson(`/api/posts/analytics${qs ? `?${qs}` : ''}`)
  return parseWith(PostAnalyticsResponseSchema, data)
}
