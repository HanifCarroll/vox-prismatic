import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorCode } from '@/utils/errors'
import { authMiddleware } from '@/modules/auth/auth.middleware'
import { projectsRoutes } from '../projects.routes'
import { makeAuthenticatedRequest } from '@/modules/auth/__tests__/helpers'

// Mock the database module
vi.mock('@/db', () => ({
  db: {
    query: {
      contentProjects: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    execute: vi.fn(),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({ returning: vi.fn() })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({ returning: vi.fn() })),
    })),
  },
}))

// Mock rate limiter to no-op
vi.mock('@/middleware/rate-limit', () => ({
  apiRateLimit: vi.fn((_c: any, next: any) => next()),
}))

// Mock AI-backed modules to avoid network calls
vi.mock('@/modules/insights/insights', () => ({
  generateAndPersist: vi.fn(async () => ({ count: 3 })),
}))

vi.mock('@/modules/posts/posts', async () => ({
  // Only mock the AI drafts generator used in SSE pipeline
  generateDraftsFromInsights: vi.fn(async () => ({ count: 5 })),
}))

describe('Projects Integration Tests', () => {
  let app: Hono
  let mockDb: any

  beforeEach(async () => {
    vi.clearAllMocks()

    const { db } = await import('@/db')
    mockDb = db

    app = new Hono()
    // Mount protected routes under /projects
    app.use('/projects/*', authMiddleware)
    app.route('/projects', projectsRoutes)
  })

  describe('Create Project', () => {
    it('creates a project with transcript and returns it', async () => {
      const now = new Date()
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 10,
              userId: 1,
              title: 'My Project',
              sourceUrl: null,
              transcript: 'Some transcript',
              currentStage: 'processing',
              createdAt: now,
              updatedAt: now,
            },
          ]),
        }),
      })

      const res = await makeAuthenticatedRequest(
        app,
        '/projects',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'My Project', transcript: 'Some transcript' }),
        },
        1,
      )

      expect(res.status).toBe(201)
      const json = (await res.json()) as any
      expect(json.project).toMatchObject({
        id: 10,
        userId: 1,
        title: 'My Project',
        transcript: 'Some transcript',
        currentStage: 'processing',
      })
    })

    it('validates that either transcript or sourceUrl is required', async () => {
      const res = await makeAuthenticatedRequest(
        app,
        '/projects',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Missing content' }),
        },
        1,
      )

      expect(res.status).toBe(400)
      const json = (await res.json()) as any
      expect(json.code).toBe(ErrorCode.VALIDATION_ERROR)
    })
  })

  describe('List Projects', () => {
    it('lists user projects with pagination meta', async () => {
      const now = new Date()
      mockDb.query.contentProjects.findMany.mockResolvedValue([
        {
          id: 1,
          userId: 1,
          title: 'P1',
          sourceUrl: null,
          transcript: 't',
          currentStage: 'processing',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 2,
          userId: 1,
          title: 'P2',
          sourceUrl: 'https://example.com',
          transcript: null,
          currentStage: 'posts',
          createdAt: now,
          updatedAt: now,
        },
      ])
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: '2' }]),
        }),
      })

      const res = await makeAuthenticatedRequest(app, '/projects?page=1&pageSize=10', { method: 'GET' }, 1)
      expect(res.status).toBe(200)
      const json = (await res.json()) as any
      expect(json.items).toHaveLength(2)
      expect(json.meta).toMatchObject({ page: 1, pageSize: 10, total: 2 })
    })

    it('supports text search and multiple stage filters', async () => {
      const now = new Date()
      mockDb.query.contentProjects.findMany.mockResolvedValue([
        {
          id: 3,
          userId: 1,
          title: 'Project Alpha',
          sourceUrl: null,
          transcript: 't',
          currentStage: 'posts',
          createdAt: now,
          updatedAt: now,
        },
      ])
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: '1' }]),
        }),
      })

      const res = await makeAuthenticatedRequest(
        app,
        '/projects?q=alpha&stage=processing&stage=posts&page=1&pageSize=10',
        { method: 'GET' },
        1,
      )
      expect(res.status).toBe(200)
      const json = (await res.json()) as any
      expect(json.items).toHaveLength(1)
      expect(json.meta.total).toBe(1)
    })
  })

  describe('Get Project', () => {
    it('returns a project owned by the user', async () => {
      const now = new Date()
      mockDb.query.contentProjects.findFirst.mockResolvedValue({
        id: 123,
        userId: 1,
        title: 'Detail',
        sourceUrl: null,
        transcript: 't',
        currentStage: 'processing',
        createdAt: now,
        updatedAt: now,
      })

      const res = await makeAuthenticatedRequest(app, '/projects/123', { method: 'GET' }, 1)
      expect(res.status).toBe(200)
      const json = (await res.json()) as any
      expect(json.project.id).toBe(123)
    })

    it('returns 404 when project not found', async () => {
      mockDb.query.contentProjects.findFirst.mockResolvedValue(null)
      const res = await makeAuthenticatedRequest(app, '/projects/999', { method: 'GET' }, 1)
      expect(res.status).toBe(404)
    })

    it('returns 403 when accessing another user project', async () => {
      const now = new Date()
      mockDb.query.contentProjects.findFirst.mockResolvedValue({
        id: 50,
        userId: 2, // different user
        title: 'Other user',
        sourceUrl: null,
        transcript: 't',
        currentStage: 'processing',
        createdAt: now,
        updatedAt: now,
      })
      const res = await makeAuthenticatedRequest(app, '/projects/50', { method: 'GET' }, 1)
      expect(res.status).toBe(403)
      const json = (await res.json()) as any
      expect(json.code).toBe(ErrorCode.FORBIDDEN)
    })
  })

  describe('Update Stage', () => {
    it('advances project stage from processing to posts', async () => {
      const now = new Date()
      mockDb.query.contentProjects.findFirst.mockResolvedValue({
        id: 44,
        userId: 1,
        title: 'Stage Test',
        sourceUrl: null,
        transcript: 't',
        currentStage: 'processing',
        createdAt: now,
        updatedAt: now,
      })
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 44,
                userId: 1,
                title: 'Stage Test',
                sourceUrl: null,
                transcript: 't',
                currentStage: 'posts',
                createdAt: now,
                updatedAt: now,
              },
            ]),
          }),
        }),
      })

      const res = await makeAuthenticatedRequest(
        app,
        '/projects/44/stage',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nextStage: 'posts' }),
        },
        1,
      )

      expect(res.status).toBe(200)
      const json = (await res.json()) as any
      expect(json.project.currentStage).toBe('posts')
    })

    it('rejects invalid stage transitions', async () => {
      const now = new Date()
      mockDb.query.contentProjects.findFirst.mockResolvedValue({
        id: 45,
        userId: 1,
        title: 'Invalid Stage',
        sourceUrl: null,
        transcript: 't',
        currentStage: 'processing',
        createdAt: now,
        updatedAt: now,
      })

      const res = await makeAuthenticatedRequest(
        app,
        '/projects/45/stage',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nextStage: 'ready' }), // skipping steps
        },
        1,
      )

      expect(res.status).toBe(422)
      const json = (await res.json()) as any
      expect(json.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION)
    })
  })

  describe('Update Project', () => {
    it('updates title and transcript', async () => {
      const now = new Date()
      mockDb.query.contentProjects.findFirst.mockResolvedValue({
        id: 70,
        userId: 1,
        title: 'Old Title',
        sourceUrl: null,
        transcript: 'old',
        currentStage: 'processing',
        createdAt: now,
        updatedAt: now,
      })
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 70,
                userId: 1,
                title: 'New Title',
                sourceUrl: null,
                transcript: 'new',
                currentStage: 'processing',
                createdAt: now,
                updatedAt: now,
              },
            ]),
          }),
        }),
      })

      const res = await makeAuthenticatedRequest(
        app,
        '/projects/70',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Title', transcript: 'new' }),
        },
        1,
      )
      expect(res.status).toBe(200)
      const json = (await res.json()) as any
      expect(json.project.title).toBe('New Title')
    })

    it('returns 404 when updating a missing project', async () => {
      mockDb.query.contentProjects.findFirst.mockResolvedValue(null)
      const res = await makeAuthenticatedRequest(
        app,
        '/projects/9999',
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'x' }) },
        1,
      )
      expect(res.status).toBe(404)
    })

    it('returns 403 when updating another user project', async () => {
      const now = new Date()
      mockDb.query.contentProjects.findFirst.mockResolvedValue({
        id: 71,
        userId: 2,
        title: 'Other',
        sourceUrl: null,
        transcript: 't',
        currentStage: 'processing',
        createdAt: now,
        updatedAt: now,
      })
      const res = await makeAuthenticatedRequest(
        app,
        '/projects/71',
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'x' }) },
        1,
      )
      expect(res.status).toBe(403)
    })
  })

  describe('Delete Project', () => {
    it('deletes a project the user owns', async () => {
      const now = new Date()
      mockDb.query.contentProjects.findFirst.mockResolvedValue({
        id: 80,
        userId: 1,
        title: 'Delete me',
        sourceUrl: null,
        transcript: 't',
        currentStage: 'processing',
        createdAt: now,
        updatedAt: now,
      })
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 80 }]) }),
      })

      const res = await makeAuthenticatedRequest(app, '/projects/80', { method: 'DELETE' }, 1)
      expect(res.status).toBe(204)
    })

    it('returns 404 when deleting missing project', async () => {
      mockDb.query.contentProjects.findFirst.mockResolvedValue(null)
      const res = await makeAuthenticatedRequest(app, '/projects/12345', { method: 'DELETE' }, 1)
      expect(res.status).toBe(404)
    })

    it('returns 403 when deleting someone else’s project', async () => {
      const now = new Date()
      mockDb.query.contentProjects.findFirst.mockResolvedValue({
        id: 81,
        userId: 2,
        title: 'Not yours',
        sourceUrl: null,
        transcript: 't',
        currentStage: 'processing',
        createdAt: now,
        updatedAt: now,
      })
      const res = await makeAuthenticatedRequest(app, '/projects/81', { method: 'DELETE' }, 1)
      expect(res.status).toBe(403)
    })
  })

  describe('Process Project (SSE)', () => {
    it('streams progress events and advances stage', async () => {
      const now = new Date()
      mockDb.query.contentProjects.findFirst.mockResolvedValue({
        id: 90,
        userId: 1,
        title: 'Process me',
        sourceUrl: null,
        transcript: 't',
        currentStage: 'processing',
        createdAt: now,
        updatedAt: now,
      })
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 90, currentStage: 'posts' }]) }),
        }),
      })

      const res = await makeAuthenticatedRequest(app, '/projects/90/process', { method: 'POST' }, 1)
      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toContain('event: started')
      expect(text).toContain('event: insights_ready')
      expect(text).toContain('event: posts_ready')
      expect(text).toContain('event: complete')
    })
  })
})
