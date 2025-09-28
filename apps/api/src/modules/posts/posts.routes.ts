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
import { logger } from '@/middleware/logging'
import { apiRateLimit } from '@/middleware/rate-limit'
import { validateRequest } from '@/middleware/validation'
import { authMiddleware } from '@/modules/auth/auth.middleware'
import {
  getPostByIdForUser,
  listProjectPosts,
  listScheduledPosts,
  publishPostNow,
  regeneratePostsBulk,
  schedulePostForUser,
  unschedulePostForUser,
  updatePostForUser,
  updatePostsBulkStatus,
  autoschedulePostForUser,
  autoscheduleProjectPosts,
  getPostAnalyticsForUser,
} from './posts'
import { listHookFrameworks, runHookWorkbench } from './hook-workbench'

export const postsRoutes = new Hono()

// All routes require auth
postsRoutes.use('*', authMiddleware)

postsRoutes.get('/hooks/frameworks', async (c) => {
  const data = listHookFrameworks()
  return c.json(data)
})

// List posts for a project
postsRoutes.get(
  '/projects/:id/posts',
  validateRequest('query', ListPostsQuerySchema),
  async (c) => {
    const user = c.get('user')
    const id = Number(c.req.param('id'))
    const { page, pageSize } = c.req.valid('query')
    const { items, total } = await listProjectPosts({
      userId: user.userId,
      projectId: id,
      page,
      pageSize,
    })
    return c.json({ items, meta: { page, pageSize, total } })
  },
)

// List scheduled posts for the authenticated user
postsRoutes.get(
  '/posts/scheduled',
  validateRequest('query', ListScheduledPostsQuerySchema),
  async (c) => {
    const user = c.get('user')
    const { page, pageSize, status } = c.req.valid('query')
    const { items, total } = await listScheduledPosts({
      userId: user.userId,
      page,
      pageSize,
      status,
    })
    return c.json({ items, meta: { page, pageSize, total } })
  },
)

postsRoutes.get(
  '/posts/analytics',
  validateRequest('query', PostAnalyticsQuerySchema),
  async (c) => {
    const user = c.get('user')
    const { days } = c.req.valid('query')
    const analytics = await getPostAnalyticsForUser({ userId: user.userId, days })
    return c.json(analytics)
  },
)

// Get a single post
postsRoutes.get('/posts/:id', async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const post = await getPostByIdForUser({ userId: user.userId, postId: id })
  return c.json({ post })
})

// Update a post (content/approval)
postsRoutes.patch('/posts/:id', validateRequest('json', UpdatePostRequestSchema), async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const data = c.req.valid('json')
  const post = await updatePostForUser({ userId: user.userId, postId: id, data })
  return c.json({ post })
})

// Publish now (LinkedIn)
postsRoutes.post('/posts/:id/publish', apiRateLimit, async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const post = await publishPostNow({ userId: user.userId, postId: id })
  return c.json({ post })
})

// Auto-schedule a single post into the next available timeslot
postsRoutes.post('/posts/:id/auto-schedule', apiRateLimit, async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const post = await autoschedulePostForUser({ userId: user.userId, postId: id })
  return c.json({ post })
})

// Schedule a post
postsRoutes.post(
  '/posts/:id/schedule',
  apiRateLimit,
  validateRequest('json', SchedulePostRequestSchema),
  async (c) => {
    const user = c.get('user')
    const id = Number(c.req.param('id'))
    const { scheduledAt } = c.req.valid('json')
    const post = await schedulePostForUser({ userId: user.userId, postId: id, scheduledAt })
    return c.json({ post })
  },
)

// Unschedule a post
postsRoutes.delete('/posts/:id/schedule', apiRateLimit, async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const post = await unschedulePostForUser({ userId: user.userId, postId: id })
  return c.json({ post })
})

// Bulk approve/reject posts
postsRoutes.patch(
  '/posts/bulk',
  apiRateLimit,
  validateRequest('json', BulkSetStatusRequestSchema),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')
    const updated = await updatePostsBulkStatus({
      userId: user.userId,
      ids: body.ids,
      status: body.status,
    })
    return c.json({ updated })
  },
)

// Bulk regenerate posts (re-generate content in place and set status to pending)
postsRoutes.post(
  '/posts/bulk/regenerate',
  apiRateLimit,
  validateRequest('json', BulkRegenerateRequestSchema),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')
    logger.info({
      msg: 'Bulk regenerate requested',
      userId: user.userId,
      idsCount: body.ids.length,
      customLen: typeof body.customInstructions === 'string' ? body.customInstructions.length : 0,
      postType: body.postType || null,
      hasOverrides: !!body.overrides,
    })
    const result = await regeneratePostsBulk({
      userId: user.userId,
      ids: body.ids,
      postType: body.postType,
      customInstructions: body.customInstructions,
      overrides: body.overrides,
    })
    logger.info({ msg: 'Bulk regenerate complete', userId: user.userId, updated: result.updated })
    // If the helper still returns a number for some reason
    if (typeof (result as any) === 'number') return c.json({ updated: result, items: [] })
    return c.json(result)
  },
)

postsRoutes.post(
  '/posts/:id/hooks/workbench',
  apiRateLimit,
  validateRequest('json', HookWorkbenchRequestSchema),
  async (c) => {
    const user = c.get('user')
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')
    const result = await runHookWorkbench({ userId: user.userId, postId: id, input: body })
    return c.json(result)
  },
)

// Auto-schedule all approved posts in a project
postsRoutes.post(
  '/projects/:id/posts/auto-schedule',
  apiRateLimit,
  validateRequest('json', AutoScheduleProjectRequestSchema),
  async (c) => {
    const user = c.get('user')
    const id = Number(c.req.param('id'))
    const { limit } = c.req.valid('json')
    const result = await autoscheduleProjectPosts({ userId: user.userId, projectId: id, limit })
    return c.json(result)
  },
)
