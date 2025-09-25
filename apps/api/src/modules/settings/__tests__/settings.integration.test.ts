import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeAuthenticatedRequest } from '@/modules/auth/__tests__/helpers'
import { settingsRoutes } from '../index'

// Mock DB and password utils
vi.mock('@/db', () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
      authKeys: { findFirst: vi.fn() },
      authSessions: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({ values: vi.fn(() => Promise.resolve([{ id: 1 }])) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn() })) })) })),
  },
}))

vi.mock('@/utils/password', async (importOriginal) => {
  const actual = await (importOriginal as any)()
  return {
    ...actual,
    verifyPassword: vi.fn().mockResolvedValue(true),
    hashPassword: vi.fn().mockResolvedValue('hashed_new'),
    validatePasswordStrength: vi.fn((pwd: string) => ({
      isValid: pwd.length >= 8,
      errors: pwd.length >= 8 ? [] : ['too short'],
    })),
  }
})

describe('Settings Integration Tests', () => {
  let app: Hono
  let mockDb: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const { db } = await import('@/db')
    mockDb = db
    app = new Hono()
    app.route('/api/settings', settingsRoutes)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    mockDb.query.authSessions.findFirst.mockResolvedValue({
      id: 'test-session-1',
      userId: 1,
      expiresAt,
      createdAt: new Date(),
    })
    mockDb.query.users.findFirst.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  })

  it('returns profile', async () => {
    const now = new Date()
    mockDb.query.users.findFirst.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      name: 'A',
      createdAt: now,
      updatedAt: now,
    })
    const res = await makeAuthenticatedRequest(app, '/api/settings/profile', { method: 'GET' }, 1)
    expect(res.status).toBe(200)
    const json = (await res.json()) as any
    expect(json.user.email).toBe('a@b.com')
    expect(json.user.passwordHash).toBeUndefined()
  })

  it('updates profile name and email lowercased', async () => {
    const now = new Date()
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi
          .fn()
          .mockReturnValue({
            returning: vi
              .fn()
              .mockResolvedValue([
                { id: 1, email: 'c@d.com', name: 'New', createdAt: now, updatedAt: now },
              ]),
          }),
      }),
    })
    const res = await makeAuthenticatedRequest(
      app,
      '/api/settings/profile',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New', email: 'C@D.com' }),
      },
      1,
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as any
    expect(json.user.email).toBe('c@d.com')
  })

  it('updates password with verification', async () => {
    const now = new Date()
    mockDb.query.users.findFirst.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      name: 'A',
      createdAt: now,
      updatedAt: now,
    })
    mockDb.query.authKeys.findFirst.mockResolvedValue({ id: 'email:a@b.com', userId: 1, hashedPassword: 'old' })
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi
          .fn()
          .mockReturnValue({
            returning: vi
              .fn()
              .mockResolvedValue([
                { id: 1, email: 'a@b.com', name: 'A', createdAt: now, updatedAt: now },
              ]),
          }),
      }),
    })
    const res = await makeAuthenticatedRequest(
      app,
      '/api/settings/password',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: 'old', newPassword: 'newpassword' }),
      },
      1,
    )
    expect(res.status).toBe(200)
  })
})
