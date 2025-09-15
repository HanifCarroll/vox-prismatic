import { Hono } from 'hono'
import { authMiddleware } from '@/modules/auth/auth.middleware'
import { validateRequest } from '@/middleware/validation'
import { apiRateLimit } from '@/middleware/rate-limit'
import { BulkRegenerateRequestSchema, BulkSetStatusRequestSchema, ListPostsQuerySchema, UpdatePostRequestSchema } from '@content/shared-types'
import { getPostByIdForUser, listProjectPosts, publishPostNow, regeneratePostsBulk, updatePostForUser, updatePostsBulkStatus } from './posts'

export const postsRoutes = new Hono()

// All routes require auth
postsRoutes.use('*', authMiddleware)

// List posts for a project
postsRoutes.get('/projects/:id/posts', validateRequest('query', ListPostsQuerySchema), async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const { page, pageSize } = c.req.valid('query')
  const { items, total } = await listProjectPosts({ userId: user.userId, projectId: id, page, pageSize })
  return c.json({ items, meta: { page, pageSize, total } })
})

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

// Bulk approve/reject posts
postsRoutes.patch('/posts/bulk', apiRateLimit, validateRequest('json', BulkSetStatusRequestSchema), async (c) => {
  const user = c.get('user')
  const body = c.req.valid('json')
  const updated = await updatePostsBulkStatus({ userId: user.userId, ids: body.ids, status: body.status })
  return c.json({ updated })
})

// Bulk regenerate posts (re-generate content in place and set status to pending)
postsRoutes.post('/posts/bulk/regenerate', apiRateLimit, validateRequest('json', BulkRegenerateRequestSchema), async (c) => {
  const user = c.get('user')
  const body = c.req.valid('json')
  const updated = await regeneratePostsBulk({ userId: user.userId, ids: body.ids })
  return c.json({ updated })
})
