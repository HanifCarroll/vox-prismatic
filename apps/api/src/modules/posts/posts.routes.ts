import {
  BulkRegenerateRequestSchema,
  BulkSetStatusRequestSchema,
  ListPostsQuerySchema,
  ListScheduledPostsQuerySchema,
  SchedulePostRequestSchema,
  UpdatePostRequestSchema,
  AutoScheduleProjectRequestSchema,
  HookWorkbenchRequestSchema,
  PostAnalyticsQuerySchema,
} from '@content/shared-types'
import { Hono } from 'hono'
import { apiRateLimit } from '@/middleware/rate-limit'
import { validateRequest } from '@/middleware/validation'
import { authMiddleware } from '@/modules/auth/auth.middleware'
// Legacy helpers removed as part of Supabase migration
import { listHookFrameworks, runHookWorkbench } from './hook-workbench'
import { createUserClient, extractSupabaseToken } from '@/services/supabase'

export const postsRoutes = new Hono()

// All routes require auth
postsRoutes.use('*', authMiddleware)

postsRoutes.get('/hooks/frameworks', async (c) => {
  const data = listHookFrameworks()
  return c.json(data)
})

// List posts for a project
postsRoutes.get('/projects/:id/posts', validateRequest('query', ListPostsQuerySchema), async (c) => {
  const token = extractSupabaseToken(c)
  if (!token)
    return c.json({ items: [], meta: { page: 1, pageSize: 0, total: 0 } })
  const userClient = createUserClient(token)
  const id = c.req.param('id')
  const { page, pageSize } = c.req.valid('query')
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const { data, error, count } = await userClient
    .from('posts')
    .select(
      'id, project_id, insight_id, content, hashtags, platform, status, published_at, scheduled_at, schedule_status, schedule_error, schedule_attempted_at, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) return c.json({ items: [], meta: { page, pageSize, total: 0 } })
  const items = (data || []).map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    insightId: row.insight_id ?? null,
    content: row.content,
    hashtags: row.hashtags ?? [],
    platform: row.platform,
    status: row.status,
    publishedAt: row.published_at ?? null,
    scheduledAt: row.scheduled_at ?? null,
    scheduleStatus: row.schedule_status ?? null,
    scheduleError: row.schedule_error ?? null,
    scheduleAttemptedAt: row.schedule_attempted_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
  return c.json({ items, meta: { page, pageSize, total: count ?? items.length } })
})

// List scheduled posts for the authenticated user
postsRoutes.get('/scheduled', validateRequest('query', ListScheduledPostsQuerySchema), async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ items: [], meta: { page: 1, pageSize: 0, total: 0 } })
  const userClient = createUserClient(token)
  const { page, pageSize, status } = c.req.valid('query')
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  let qb = userClient
    .from('posts')
    .select(
      'id, project_id, insight_id, content, hashtags, platform, status, published_at, scheduled_at, schedule_status, schedule_error, schedule_attempted_at, created_at, updated_at',
      { count: 'exact' },
    )
    .not('scheduled_at', 'is', null)
    .order('scheduled_at', { ascending: true })
    .range(from, to)
  if (status) qb = qb.eq('schedule_status', status)
  const { data, error, count } = await qb
  if (error) return c.json({ items: [], meta: { page, pageSize, total: 0 } })
  const items = (data || []).map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    insightId: row.insight_id ?? null,
    content: row.content,
    hashtags: row.hashtags ?? [],
    platform: row.platform,
    status: row.status,
    publishedAt: row.published_at ?? null,
    scheduledAt: row.scheduled_at ?? null,
    scheduleStatus: row.schedule_status ?? null,
    scheduleError: row.schedule_error ?? null,
    scheduleAttemptedAt: row.schedule_attempted_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
  return c.json({ items, meta: { page, pageSize, total: count ?? items.length } })
})

postsRoutes.get('/analytics', validateRequest('query', PostAnalyticsQuerySchema), async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ summary: { totalPosts: 0, statusCounts: { pending: 0, approved: 0, rejected: 0, published: 0 }, scheduledCount: 0, publishedInPeriod: 0, averageTimeToPublishHours: null, rangeDays: 30 }, daily: [], topHashtags: [] })
  const userClient = createUserClient(token)
  const { days } = c.req.valid('query')
  const since = new Date()
  since.setDate(since.getDate() - (days || 30))
  const { data: rows, error } = await userClient
    .from('posts')
    .select('status, hashtags, created_at, published_at, scheduled_at')
    .gte('created_at', since.toISOString())
  if (error) return c.json({ summary: { totalPosts: 0, statusCounts: { pending: 0, approved: 0, rejected: 0, published: 0 }, scheduledCount: 0, publishedInPeriod: 0, averageTimeToPublishHours: null, rangeDays: days || 30 }, daily: [], topHashtags: [] })
  const statusCounts: any = { pending: 0, approved: 0, rejected: 0, published: 0 }
  let scheduledCount = 0
  let publishedInPeriod = 0
  let totalHours = 0
  let publishCount = 0
  const daily = new Map<string, number>()
  const tags = new Map<string, number>()
  for (const r of rows || []) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1
    if (r.scheduled_at) scheduledCount++
    if (r.published_at) {
      publishedInPeriod++
      const d = new Date(r.published_at)
      const k = d.toISOString().slice(0, 10)
      daily.set(k, (daily.get(k) || 0) + 1)
      if (r.created_at) {
        const dh = (new Date(r.published_at).getTime() - new Date(r.created_at).getTime()) / 36e5
        if (Number.isFinite(dh)) {
          totalHours += dh
          publishCount++
        }
      }
    }
    const arr = Array.isArray(r.hashtags) ? r.hashtags : []
    for (const t of arr) tags.set(t, (tags.get(t) || 0) + 1)
  }
  const dailyArr = Array.from(daily.entries()).map(([date, count]) => ({ date, published: count })).sort((a, b) => a.date.localeCompare(b.date))
  const topHashtags = Array.from(tags.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag, count]) => ({ tag, count }))
  const avg = publishCount > 0 ? totalHours / publishCount : null
  return c.json({
    summary: {
      totalPosts: (rows || []).length,
      statusCounts: { pending: statusCounts.pending || 0, approved: statusCounts.approved || 0, rejected: statusCounts.rejected || 0, published: statusCounts.published || 0 },
      scheduledCount,
      publishedInPeriod,
      averageTimeToPublishHours: avg,
      rangeDays: days || 30,
    },
    daily: dailyArr,
    topHashtags,
  })
})

// Get a single post
postsRoutes.get('/:id', async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const userClient = createUserClient(token)
  const id = c.req.param('id')
  const { data, error } = await userClient
    .from('posts')
    .select(
      'id, project_id, insight_id, content, hashtags, platform, status, published_at, scheduled_at, schedule_status, schedule_error, schedule_attempted_at, created_at, updated_at',
    )
    .eq('id', id)
    .single()
  if (error || !data) return c.json({ error: 'Not found', code: 'NOT_FOUND', status: 404 }, 404)
  const post = {
    id: data.id,
    projectId: data.project_id,
    insightId: data.insight_id ?? null,
    content: data.content,
    hashtags: data.hashtags ?? [],
    platform: data.platform,
    status: data.status,
    publishedAt: data.published_at ?? null,
    scheduledAt: data.scheduled_at ?? null,
    scheduleStatus: data.schedule_status ?? null,
    scheduleError: data.schedule_error ?? null,
    scheduleAttemptedAt: data.schedule_attempted_at ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
  return c.json({ post })
})

// Update a post (content/approval)
postsRoutes.patch('/:id', validateRequest('json', UpdatePostRequestSchema), async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const userClient = createUserClient(token)
  const id = c.req.param('id')
  const data = c.req.valid('json')
  const updates: any = { updated_at: new Date().toISOString() }
  if (typeof data.content !== 'undefined') updates.content = data.content
  if (typeof data.hashtags !== 'undefined') updates.hashtags = data.hashtags
  if (typeof data.status !== 'undefined') updates.status = data.status
  const { data: updated, error } = await userClient
    .from('posts')
    .update(updates)
    .eq('id', id)
    .select(
      'id, project_id, insight_id, content, hashtags, platform, status, published_at, scheduled_at, schedule_status, schedule_error, schedule_attempted_at, created_at, updated_at',
    )
    .single()
  if (error || !updated) return c.json({ error: 'Update failed', code: 'UPDATE_FAILED', status: 400 }, 400)
  const post = {
    id: updated.id,
    projectId: updated.project_id,
    insightId: updated.insight_id ?? null,
    content: updated.content,
    hashtags: updated.hashtags ?? [],
    platform: updated.platform,
    status: updated.status,
    publishedAt: updated.published_at ?? null,
    scheduledAt: updated.scheduled_at ?? null,
    scheduleStatus: updated.schedule_status ?? null,
    scheduleError: updated.schedule_error ?? null,
    scheduleAttemptedAt: updated.schedule_attempted_at ?? null,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  }
  return c.json({ post })
})

// Publish now (LinkedIn)
postsRoutes.post('/:id/publish', apiRateLimit, async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const userClient = createUserClient(token)
  const id = c.req.param('id')
  const { data: post, error: postErr } = await userClient
    .from('posts')
    .select('id, content, status')
    .eq('id', id)
    .single()
  if (postErr || !post) return c.json({ error: 'Not found', code: 'NOT_FOUND', status: 404 }, 404)
  if ((post as any).status !== 'approved') return c.json({ error: 'Post must be approved before publishing', code: 'POST_NOT_APPROVED', status: 422 }, 422)
  const { data: profile } = await userClient.from('profiles').select('linkedin_token, linkedin_id').single()
  const access = (profile as any)?.linkedin_token as string | null
  if (!access) return c.json({ error: 'LinkedIn is not connected', code: 'LINKEDIN_NOT_CONNECTED', status: 422 }, 422)
  let member = (profile as any)?.linkedin_id as string | null
  if (!member) {
    const infoResp = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${access}` } })
    if (!infoResp.ok) return c.json({ error: 'Failed to fetch LinkedIn user', code: 'LINKEDIN_USERINFO_FAILED', status: 400 }, 400)
    const info: any = await infoResp.json()
    member = String(info.sub || '')
    if (member) await userClient.from('profiles').update({ linkedin_id: member }).select('id').single()
  }
  const content = (post as any).content as string
  const ugcPayload = {
    author: `urn:li:person:${member}`,
    lifecycleState: 'PUBLISHED',
    specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text: content.slice(0, 2999) }, shareMediaCategory: 'NONE' } },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  }
  const resp = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST', headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' }, body: JSON.stringify(ugcPayload),
  })
  if (!resp.ok) return c.json({ error: 'LinkedIn publish failed', code: 'LINKEDIN_PUBLISH_FAILED', status: 400 }, 400)
  const { data: updated } = await userClient
    .from('posts')
    .update({ status: 'published', published_at: new Date().toISOString(), schedule_status: null, schedule_error: null, schedule_attempted_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, project_id, insight_id, content, hashtags, platform, status, published_at, scheduled_at, schedule_status, schedule_error, schedule_attempted_at, created_at, updated_at')
    .single()
  return c.json({ post: updated })
})

// Auto-schedule a single post into the next available timeslot
postsRoutes.post('/:id/auto-schedule', apiRateLimit, async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const userClient = createUserClient(token)
  const id = c.req.param('id')
  const { data: post } = await userClient.from('posts').select('id, status, scheduled_at').eq('id', id).single()
  if (!post) return c.json({ error: 'Post not found', code: 'NOT_FOUND', status: 404 }, 404)
  if ((post as any).status !== 'approved') return c.json({ error: 'Post must be approved', code: 'NOT_APPROVED', status: 422 }, 422)
  const { data: pref } = await userClient.from('user_schedule_preferences').select('timezone, lead_time_minutes').single()
  const { data: slots } = await userClient
    .from('user_preferred_timeslots')
    .select('iso_day_of_week, minutes_from_midnight, active')
    .eq('active', true)
    .order('iso_day_of_week')
    .order('minutes_from_midnight')
  if (!pref || !slots || slots.length === 0) return c.json({ error: 'No preferred timeslots configured', code: 'NO_PREFERENCES', status: 422 }, 422)
  const lead = Number((pref as any).lead_time_minutes || 30)
  const now = new Date()
  let candidate = new Date(now.getTime() + lead * 60000)
  for (let i = 0; i < 60; i++) {
    const isoDay = ((candidate.getDay() + 6) % 7) + 1
    const mins = candidate.getHours() * 60 + candidate.getMinutes()
    const match = slots.find((s: any) => s.iso_day_of_week === isoDay && s.minutes_from_midnight >= mins)
    if (match) {
      const h = Math.floor(match.minutes_from_midnight / 60)
      const m = match.minutes_from_midnight % 60
      const scheduledAt = new Date(candidate)
      scheduledAt.setHours(h, m, 0, 0)
      const { data: updated } = await userClient
        .from('posts')
        .update({ scheduled_at: scheduledAt.toISOString(), schedule_status: 'scheduled', schedule_error: null })
        .eq('id', id)
        .select('id, project_id, insight_id, content, hashtags, platform, status, published_at, scheduled_at, schedule_status, schedule_error, schedule_attempted_at, created_at, updated_at')
        .single()
      return c.json({ post: updated })
    }
    candidate.setDate(candidate.getDate() + 1)
    candidate.setHours(0, 0, 0, 0)
  }
  return c.json({ error: 'No available timeslot found', code: 'NO_SLOT', status: 422 }, 422)
})

// Schedule a post
postsRoutes.post('/:id/schedule', apiRateLimit, validateRequest('json', SchedulePostRequestSchema), async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const userClient = createUserClient(token)
  const id = c.req.param('id')
  const { scheduledAt } = c.req.valid('json')
  const when = new Date(scheduledAt)
  const { data: updated, error } = await userClient
    .from('posts')
    .update({ scheduled_at: when.toISOString(), schedule_status: 'scheduled', schedule_error: null })
    .eq('id', id)
    .select('id, project_id, insight_id, content, hashtags, platform, status, published_at, scheduled_at, schedule_status, schedule_error, schedule_attempted_at, created_at, updated_at')
    .single()
  if (error || !updated) return c.json({ error: 'Schedule failed', code: 'SCHEDULE_FAILED', status: 400 }, 400)
  return c.json({ post: updated })
})

// Unschedule a post
postsRoutes.delete('/:id/schedule', apiRateLimit, async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const userClient = createUserClient(token)
  const id = c.req.param('id')
  const { data: updated, error } = await userClient
    .from('posts')
    .update({ scheduled_at: null, schedule_status: null, schedule_error: null, schedule_attempted_at: null })
    .eq('id', id)
    .select('id, project_id, insight_id, content, hashtags, platform, status, published_at, scheduled_at, schedule_status, schedule_error, schedule_attempted_at, created_at, updated_at')
    .single()
  if (error || !updated) return c.json({ error: 'Unschedule failed', code: 'UNSCHEDULE_FAILED', status: 400 }, 400)
  return c.json({ post: updated })
})

// Bulk approve/reject posts
postsRoutes.patch('/bulk', apiRateLimit, validateRequest('json', BulkSetStatusRequestSchema), async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const userClient = createUserClient(token)
  const body = c.req.valid('json')
  const { error } = await userClient
    .from('posts')
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .in('id', body.ids as string[])
  if (error) return c.json({ updated: 0 })
  // Count of updated rows is not returned by PostgREST by default; report ids length
  return c.json({ updated: (body.ids as string[]).length })
})

// Bulk regenerate posts (re-generate content in place and set status to pending)
postsRoutes.post('/bulk/regenerate', apiRateLimit, validateRequest('json', BulkRegenerateRequestSchema), async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const userClient = createUserClient(token)
  const body = c.req.valid('json')
  const ids = body.ids as string[]
  if (!ids.length) return c.json({ updated: 0, items: [] })
  // Load posts + insights
  const { data: posts } = await userClient
    .from('posts')
    .select('id, project_id, insight_id, content')
    .in('id', ids)
  if (!posts || posts.length === 0) return c.json({ updated: 0, items: [] })
  const outItems: any[] = []
  const { default: z } = await import('zod')
  const PostOutSchema = z.object({ content: z.string().min(40).max(3000) })
  for (const p of posts) {
    let insightText = ''
    if ((p as any).insight_id) {
      const { data: insight } = await userClient
        .from('insights')
        .select('content')
        .eq('id', (p as any).insight_id as string)
        .eq('project_id', (p as any).project_id as string)
        .single()
      insightText = (insight as any)?.content || ''
    }
    const extra = body.customInstructions ? `\nGuidance: ${body.customInstructions}` : ''
    const prompt = `Regenerate a high-quality LinkedIn post from this insight. 4-6 short paragraphs, crisp, no emoji overload. Return JSON { "content": string }.\n\nInsight:\n${insightText}${extra}`
    try {
      const out = await (await import('@/modules/ai/ai')).generateJson({ schema: PostOutSchema, prompt, temperature: 0.4, action: 'post.regenerate' })
      const { data: updated } = await userClient
        .from('posts')
        .update({ content: (out as any).content, status: 'pending', updated_at: new Date().toISOString(), schedule_status: null, schedule_error: null, schedule_attempted_at: null })
        .eq('id', (p as any).id)
        .select('id, project_id, insight_id, content, hashtags, platform, status, published_at, scheduled_at, schedule_status, schedule_error, schedule_attempted_at, created_at, updated_at')
        .single()
      if (updated) outItems.push(updated)
    } catch (e) {
      // Skip failures; continue others
    }
  }
  return c.json({ updated: outItems.length, items: outItems })
})

postsRoutes.post('/:id/hooks/workbench', apiRateLimit, validateRequest('json', HookWorkbenchRequestSchema), async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const id = c.req.param('id')
  const body = c.req.valid('json')
  const result = await runHookWorkbench({ token, postId: id, input: body })
  return c.json(result)
})

// Auto-schedule all approved posts in a project
postsRoutes.post('/projects/:id/posts/auto-schedule', apiRateLimit, validateRequest('json', AutoScheduleProjectRequestSchema), async (c) => {
  const token = extractSupabaseToken(c)
  if (!token) return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 }, 401)
  const userClient = createUserClient(token)
  const id = c.req.param('id')
  const { limit = 20 } = c.req.valid('json')
  const { data: pref } = await userClient.from('user_schedule_preferences').select('timezone, lead_time_minutes').single()
  const { data: slots } = await userClient
    .from('user_preferred_timeslots')
    .select('iso_day_of_week, minutes_from_midnight, active')
    .eq('active', true)
    .order('iso_day_of_week')
    .order('minutes_from_midnight')
  if (!pref || !slots || slots.length === 0) return c.json({ error: 'No preferred timeslots configured', code: 'NO_PREFERENCES', status: 422 }, 422)
  const lead = Number((pref as any).lead_time_minutes || 30)
  const { data: approved } = await userClient
    .from('posts')
    .select('id, scheduled_at')
    .eq('project_id', id)
    .eq('status', 'approved')
    .is('scheduled_at', null)
    .limit(limit)
  const scheduled: any[] = []
  const now = new Date()
  let candidate = new Date(now.getTime() + lead * 60000)
  const takeNext = () => {
    for (let i = 0; i < 90; i++) {
      const isoDay = ((candidate.getDay() + 6) % 7) + 1
      const mins = candidate.getHours() * 60 + candidate.getMinutes()
      const match = slots.find((s: any) => s.iso_day_of_week === isoDay && s.minutes_from_midnight >= mins)
      if (match) {
        const h = Math.floor(match.minutes_from_midnight / 60)
        const m = match.minutes_from_midnight % 60
        const at = new Date(candidate)
        at.setHours(h, m, 0, 0)
        candidate = new Date(at.getTime() + 5 * 60000)
        return at
      }
      candidate.setDate(candidate.getDate() + 1)
      candidate.setHours(0, 0, 0, 0)
    }
    return null
  }
  for (const p of approved || []) {
    const at = takeNext()
    if (!at) break
    await userClient
      .from('posts')
      .update({ scheduled_at: at.toISOString(), schedule_status: 'scheduled', schedule_error: null })
      .eq('id', (p as any).id)
    scheduled.push({ id: (p as any).id })
  }
  return c.json({ scheduled, meta: { requested: limit, scheduledCount: scheduled.length } })
})
