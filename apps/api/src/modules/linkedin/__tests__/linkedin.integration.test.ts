import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { linkedinRoutes } from '../linkedin.routes'
import { makeAuthenticatedRequest } from '@/modules/auth/__tests__/helpers'

// Mock DB
vi.mock('@/db', () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({ returning: vi.fn() })),
      })),
    })),
  },
}))

// Rate limiter passthrough
vi.mock('@/middleware/rate-limit', () => ({ apiRateLimit: vi.fn((_c: any, next: any) => next()) }))

describe('LinkedIn OAuth Integration Tests', () => {
  let app: Hono
  let mockDb: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const { db } = await import('@/db')
    mockDb = db
    app = new Hono()
    app.route('/api/linkedin', linkedinRoutes)
  })

  it('returns auth URL with state and client_id', async () => {
    const res = await makeAuthenticatedRequest(app, '/api/linkedin/auth', { method: 'GET' }, 1)
    expect(res.status).toBe(200)
    const json = (await res.json()) as any
    expect(json.url).toContain('linkedin.com/oauth/v2/authorization')
    expect(json.url).toContain('client_id=')
    expect(json.url).toContain('state=')
  })

  it('handles callback and stores token', async () => {
    // First get state
    const pre = await makeAuthenticatedRequest(app, '/api/linkedin/auth', { method: 'GET' }, 1)
    const { url } = (await pre.json()) as any
    const state = new URL(url).searchParams.get('state')!

    // Mock user and token exchange
    mockDb.query.users.findFirst.mockResolvedValue({ id: 1 })
    const fetchSpy = vi
      .spyOn(globalThis as any, 'fetch')
      .mockImplementation(async (url: any) => {
        if (String(url).includes('accessToken')) {
          return { ok: true, json: async () => ({ access_token: 'token' }) } as any
        }
        if (String(url).includes('/v2/userinfo')) {
          return { ok: true, json: async () => ({ sub: 'abc123' }) } as any
        }
        throw new Error('unexpected fetch url: ' + url)
      })

    const res = await makeAuthenticatedRequest(app, `/api/linkedin/callback?code=abc&state=${encodeURIComponent(state)}`, { method: 'GET' }, 1)
    expect(res.status).toBe(200)
    const json = (await res.json()) as any
    expect(json.connected).toBe(true)
    fetchSpy.mockRestore()
  })

  it('reports status and disconnects', async () => {
    mockDb.query.users.findFirst.mockResolvedValueOnce({ id: 1, linkedinToken: 'token', linkedinId: 'abc123' })
    const status = await makeAuthenticatedRequest(app, '/api/linkedin/status', { method: 'GET' }, 1)
    expect(status.status).toBe(200)
    const statusJson = (await status.json()) as any
    expect(statusJson.connected).toBe(true)

    mockDb.query.users.findFirst.mockResolvedValueOnce({ id: 1 })
    const after = await makeAuthenticatedRequest(app, '/api/linkedin/disconnect', { method: 'POST' }, 1)
    expect(after.status).toBe(200)
    const afterJson = (await after.json()) as any
    expect(afterJson.connected).toBe(false)
  })
})
