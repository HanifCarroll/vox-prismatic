import { Hono } from 'hono'
import {
  CreateProjectRequestSchema,
  ListProjectsQuerySchema,
  UpdateProjectRequestSchema,
  UpdateProjectStageRequestSchema,
} from '@content/shared-types'
import { validateRequest } from '@/middleware/validation'
import { authMiddleware } from '@/modules/auth/auth.middleware'
import { apiRateLimit } from '@/middleware/rate-limit'
import {
  createProject,
  deleteProject,
  getProjectByIdForUser,
  listProjects,
  processProject,
  updateProject,
  updateProjectStage,
} from './projects'

export const projectsRoutes = new Hono()

// All projects routes require auth
projectsRoutes.use('*', authMiddleware)

/**
 * POST /projects
 * Create a new content project
 */
projectsRoutes.post('/', apiRateLimit, validateRequest('json', CreateProjectRequestSchema), async (c) => {
  const user = c.get('user')
  const body = c.req.valid('json')

  const project = await createProject(user.userId, body)
  return c.json({ project }, 201)
})

/**
 * GET /projects
 * List projects with pagination and optional stage filter
 */
projectsRoutes.get('/', validateRequest('query', ListProjectsQuerySchema), async (c) => {
  const user = c.get('user')
  const { page, pageSize, stage, q } = c.req.valid('query')
  const stages = Array.isArray(stage) ? stage : stage ? [stage] : undefined

  const { items, total } = await listProjects({ userId: user.userId, page, pageSize, stages, q })
  return c.json({ items, meta: { page, pageSize, total } })
})

/**
 * GET /projects/:id
 * Get a single project
 */
projectsRoutes.get('/:id', async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const project = await getProjectByIdForUser(id, user.userId)
  return c.json({ project })
})

/**
 * PUT /projects/:id/stage
 * Update project stage (enforces allowed transitions)
 */
projectsRoutes.put(
  '/:id/stage',
  validateRequest('json', UpdateProjectStageRequestSchema),
  async (c) => {
    const user = c.get('user')
    const id = Number(c.req.param('id'))
    const { nextStage } = c.req.valid('json')

    const project = await updateProjectStage({ id, userId: user.userId, nextStage })
    return c.json({ project })
  },
)

/**
 * PATCH /projects/:id
 * Update editable project fields
 */
projectsRoutes.patch(
  '/:id',
  validateRequest('json', UpdateProjectRequestSchema),
  async (c) => {
    const user = c.get('user')
    const id = Number(c.req.param('id'))
    const data = c.req.valid('json')
    const project = await updateProject({ id, userId: user.userId, data })
    return c.json({ project })
  },
)

/**
 * DELETE /projects/:id
 * Delete a project
 */
projectsRoutes.delete('/:id', async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  await deleteProject({ id, userId: user.userId })
  return c.body(null, 204)
})

/**
 * POST /projects/:id/process (SSE)
 * Synchronous processing with progress SSE
 */
projectsRoutes.post('/:id/process', apiRateLimit, async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const stream = await processProject({ id, userId: user.userId })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})
