import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { postsRoutes } from '../posts.routes'
import { makeAuthenticatedRequest } from '@/modules/auth/__tests__/helpers'

// Mock DB
vi.mock('@/db', () => ({
  db: {
    query: {
      posts: { findFirst: vi.fn(), findMany: vi.fn() },
      contentProjects: { findFirst: vi.fn() },
      users: { findFirst: vi.fn() },
    },
    execute: vi.fn(),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn() })) })) })),
  },
}))

// Rate limit no-op
vi.mock('@/middleware/rate-limit', () => ({ apiRateLimit: vi.fn((_c: any, next: any) => next()) }))

describe('Posts Integration Tests', () => {
  let app: Hono
  let mockDb: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const { db } = await import('@/db')
    mockDb = db
    app = new Hono()
    app.route('/api', postsRoutes)
  })

  describe('List posts', () => {
    it('lists posts for owned project with meta', async () => {
      const now = new Date()
      mockDb.query.contentProjects.findFirst.mockResolvedValue({ id: 1, userId: 1 })
      mockDb.query.posts.findMany.mockResolvedValue([
        { id: 10, projectId: 1, content: 'A', platform: 'LinkedIn', isApproved: false, createdAt: now, updatedAt: now },
      ])
      mockDb.execute.mockResolvedValue({ rows: [{ count: '1' }] })

      const res = await makeAuthenticatedRequest(app, '/api/projects/1/posts?page=1&pageSize=10', { method: 'GET' }, 1)
      expect(res.status).toBe(200)
      const json = (await res.json()) as any
      expect(json.items).toHaveLength(1)
      expect(json.meta.total).toBe(1)
    })
  })

  describe('Get post', () => {
    it('gets a post detail when owned', async () => {
      mockDb.query.posts.findFirst.mockResolvedValue({ id: 20, projectId: 2, content: 'X', platform: 'LinkedIn', isApproved: false })
      mockDb.query.contentProjects.findFirst.mockResolvedValue({ id: 2, userId: 1 })
      const res = await makeAuthenticatedRequest(app, '/api/posts/20', { method: 'GET' }, 1)
      expect(res.status).toBe(200)
    })

    it('403 when accessing other user post', async () => {
      mockDb.query.posts.findFirst.mockResolvedValue({ id: 21, projectId: 3 })
      mockDb.query.contentProjects.findFirst.mockResolvedValue({ id: 3, userId: 2 })
      const res = await makeAuthenticatedRequest(app, '/api/posts/21', { method: 'GET' }, 1)
      expect(res.status).toBe(403)
    })
  })

  describe('Update post', () => {
    it('updates content and approval', async () => {
      const now = new Date()
      mockDb.query.posts.findFirst.mockResolvedValue({ id: 30, projectId: 4, content: 'old', isApproved: false })
      mockDb.query.contentProjects.findFirst.mockResolvedValue({ id: 4, userId: 1 })
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 30, content: 'new', isApproved: true, updatedAt: now }]) }),
        }),
      })

      const res = await makeAuthenticatedRequest(
        app,
        '/api/posts/30',
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: 'new', isApproved: true }) },
        1,
      )
      expect(res.status).toBe(200)
      const json = (await res.json()) as any
      expect(json.post.content).toBe('new')
      expect(json.post.isApproved).toBe(true)
    })
  })

  describe('Publish now', () => {
    it('fails if not approved', async () => {
      mockDb.query.posts.findFirst.mockResolvedValue({ id: 40, projectId: 5, isApproved: false })
      mockDb.query.contentProjects.findFirst.mockResolvedValue({ id: 5, userId: 1 })
      const res = await makeAuthenticatedRequest(app, '/api/posts/40/publish', { method: 'POST' }, 1)
      expect(res.status).toBe(422)
    })

    it('publishes when approved and token present', async () => {
      const now = new Date()
      mockDb.query.posts.findFirst.mockResolvedValue({ id: 41, projectId: 6, isApproved: true, content: 'go', platform: 'LinkedIn' })
      mockDb.query.contentProjects.findFirst.mockResolvedValue({ id: 6, userId: 1 })
      mockDb.query.users.findFirst = vi.fn().mockResolvedValue({ id: 1, linkedinToken: 'token' })
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 41, publishedAt: now }]) }),
        }),
      })
      const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: true } as any)

      const res = await makeAuthenticatedRequest(app, '/api/posts/41/publish', { method: 'POST' }, 1)
      expect(res.status).toBe(200)
      const json = (await res.json()) as any
      expect(json.post.publishedAt).toBeTruthy()
      fetchSpy.mockRestore()
    })

    it('requires LinkedIn token', async () => {
      mockDb.query.posts.findFirst.mockResolvedValue({ id: 42, projectId: 7, isApproved: true, content: 'ok' })
      mockDb.query.contentProjects.findFirst.mockResolvedValue({ id: 7, userId: 1 })
      mockDb.query.users.findFirst = vi.fn().mockResolvedValue({ id: 1, linkedinToken: null })
      const res = await makeAuthenticatedRequest(app, '/api/posts/42/publish', { method: 'POST' }, 1)
      expect(res.status).toBe(400)
    })
  })
})

