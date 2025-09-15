import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authMiddleware } from '@/modules/auth/auth.middleware'
import { transcriptsRoutes } from '../transcripts.routes'
import { makeAuthenticatedRequest } from '@/modules/auth/__tests__/helpers'

// Mock DB
vi.mock('@/db', () => ({
  db: {
    query: {
      contentProjects: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({ returning: vi.fn() })),
      })),
    })),
  },
}))

// Rate limit no-op
vi.mock('@/middleware/rate-limit', () => ({ apiRateLimit: vi.fn((_c: any, next: any) => next()) }))

// Mock AI to avoid network calls
vi.mock('@/modules/ai/ai', () => ({
  generateJson: vi.fn(async ({ schema }: any) => {
    // Return a deterministic cleaned transcript
    const cleaned = 'Hello world Test'
    return schema.parse({ transcript: cleaned, length: cleaned.length })
  }),
}))

describe('Transcripts Integration Tests', () => {
  let app: Hono
  let mockDb: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const { db } = await import('@/db')
    mockDb = db

    app = new Hono()
    app.route('/transcripts', transcriptsRoutes)

    // Add a protected dummy route for sanity
    app.get('/protected/ping', authMiddleware, (c) => c.text('ok'))
  })

  describe('Preview normalization', () => {
    it('returns cleaned transcript JSON', async () => {
      const res = await makeAuthenticatedRequest(
        app,
        '/transcripts/preview',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: '<h1>Hello</h1> world\n\n<b>Test</b>' }),
        },
      )
      expect(res.status).toBe(200)
      const json = (await res.json()) as any
      expect(json.transcript).toBe('Hello world Test')
      expect(json.length).toBe(json.transcript.length)
    })
  })

  describe('Get transcript', () => {
    it('returns transcript for owned project', async () => {
      const now = new Date()
      mockDb.query.contentProjects.findFirst.mockResolvedValue({
        id: 100,
        userId: 1,
        title: 'P',
        transcriptOriginal: 'Some text',
        currentStage: 'processing',
        createdAt: now,
        updatedAt: now,
      })
      const res = await makeAuthenticatedRequest(app, '/transcripts/100', { method: 'GET' }, 1)
      expect(res.status).toBe(200)
      const json = (await res.json()) as any
      expect(json.transcript).toBe('Some text')
    })

    it('returns 403 for other user project', async () => {
      mockDb.query.contentProjects.findFirst.mockResolvedValue({ id: 101, userId: 2 })
      const res = await makeAuthenticatedRequest(app, '/transcripts/101', { method: 'GET' }, 1)
      expect(res.status).toBe(403)
    })

    it('returns 404 when project missing', async () => {
      mockDb.query.contentProjects.findFirst.mockResolvedValue(null)
      const res = await makeAuthenticatedRequest(app, '/transcripts/999', { method: 'GET' }, 1)
      expect(res.status).toBe(404)
    })
  })

  describe('Update transcript', () => {
    it('updates transcript content and returns original transcript', async () => {
      const now = new Date()
      mockDb.query.contentProjects.findFirst.mockResolvedValue({ id: 110, userId: 1, transcriptOriginal: 'Old', createdAt: now, updatedAt: now })
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 110, userId: 1, transcriptOriginal: 'Hello world', transcriptCleaned: 'Hello world', updatedAt: now }]) }),
        }),
      })

      const res = await makeAuthenticatedRequest(
        app,
        '/transcripts/110',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: '<h1>Hello</h1> world' }),
        },
        1,
      )
      expect(res.status).toBe(200)
      const json = (await res.json()) as any
      expect(json.transcript).toBe('Hello world')
    })
  })
})
