import {
  BulkRegenerateRequestSchema,
  BulkSetStatusRequestSchema,
  ListPostsQuerySchema,
  ListScheduledPostsQuerySchema,
  SchedulePostRequestSchema,
  UpdatePostRequestSchema,
} from '@content/shared-types'
import { Hono } from 'hono'
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
} from './posts'

export const postsRoutes = new Hono()

// All routes require auth
postsRoutes.use('*', authMiddleware)

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
    const result = await regeneratePostsBulk({ userId: user.userId, ids: body.ids })
    // If the helper still returns a number for some reason
    if (typeof (result as any) === 'number') return c.json({ updated: result, items: [] })
    return c.json(result)
  },
)
