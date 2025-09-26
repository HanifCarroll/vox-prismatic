import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorCode } from '@/utils/errors'
import { authMiddleware } from '../auth.middleware'
import { authRoutes } from '../auth.routes'
import {
  createLoginBody,
  createRegisterBody,
  makeAuthenticatedRequest,
  createTestUser,
  TEST_PASSWORDS,
} from './helpers'

// Mock the database module
vi.mock('@/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
      authSessions: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    delete: vi.fn(() => ({ where: vi.fn() })),
  },
}))

// Mock lucia cookie/session helpers to avoid adapter complexity in tests
vi.mock('../lucia', () => ({
  createSessionAndSetCookie: (c: any, userId: number) => {
    // Set a deterministic session id cookie per user
    c.header('Set-Cookie', `auth_session=test-session-${userId}; Path=/; HttpOnly; SameSite=Lax`, { append: true })
  },
  readSessionId: (c: any) => {
    const cookie = c.req.header('Cookie') || ''
    const m = cookie.match(/auth_session=([^;]+)/)
    return m ? m[1] : null
  },
  setCookie: () => {},
  deleteCookie: () => {},
}))

// Mock password utilities
vi.mock('@/utils/password', () => ({
  hashPassword: vi.fn((password: string) => Promise.resolve(`hashed_${password}`)),
  verifyPassword: vi.fn((password: string, hash: string) =>
    Promise.resolve(hash === `hashed_${password}`),
  ),
  validatePasswordStrength: vi.fn((password: string) => {
    if (password.length < 8) {
      return { isValid: false, errors: ['Password must be at least 8 characters'] }
    }
    if (!/[!@#$%^&*]/.test(password)) {
      return { isValid: false, errors: ['Password must contain at least one special character'] }
    }
    return { isValid: true, errors: [] }
  }),
}))

// Mock rate limiting middleware
vi.mock('@/middleware/rate-limit', () => ({
  loginRateLimit: vi.fn((_c, next) => next()),
  registrationRateLimit: vi.fn((_c, next) => next()),
}))

describe('Auth Integration Tests', () => {
  let app: Hono
  let mockDb: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // Get mocked db
    const { db } = await import('@/db')
    mockDb = db

    // Create fresh Hono app for each test
    app = new Hono()
    app.route('/auth', authRoutes)

    // Add a protected route for testing middleware
    app.get('/protected/data', authMiddleware, (c) => {
      const user = c.get('user')
      return c.json({ message: 'Protected data', userId: user.userId })
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('User Registration Flow', () => {
    it('should successfully register a new user and set session cookie', async () => {
      // Mock database responses
      mockDb.query.users.findFirst.mockResolvedValue(null)
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            createTestUser({ id: 1, email: 'newuser@example.com', name: 'New User' }),
          ]),
        }),
      })

      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: createRegisterBody({
          email: 'newuser@example.com',
          password: TEST_PASSWORDS.valid,
        }),
      })

      expect(res.status).toBe(201)
      const json = (await res.json()) as any
      const setCookie = res.headers.get('set-cookie') || ''
      expect(setCookie).toContain('auth_session=')
      expect(json.user).toMatchObject({
        email: 'newuser@example.com',
        name: 'New User',
      })
      expect(json.user.password).toBeUndefined()
      expect(json.user.passwordHash).toBeUndefined()
    })

    it('should reject registration with duplicate email', async () => {
      // Mock existing user
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 1,
        email: 'existing@example.com',
        name: 'Existing User',
      })

      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: createRegisterBody({ email: 'existing@example.com' }),
      })

      expect(res.status).toBe(409)
      const json = (await res.json()) as any
      expect(json.error).toBe('Email already registered')
      expect(json.code).toBe(ErrorCode.EMAIL_ALREADY_EXISTS)
    })

    it('should reject registration with weak password', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null)

      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: createRegisterBody({ password: TEST_PASSWORDS.weak }),
      })

      expect(res.status).toBe(400)
      const json = (await res.json()) as any
      // Zod validation catches this first (password too short)
      expect(json.error).toBe('Password must be at least 8 characters')
      expect(json.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(json.details).toBeDefined()
      expect(json.details.errors).toHaveLength(1)
      expect(json.details.errors[0].field).toBe('password')
    })

    it('should reject registration with invalid email format', async () => {
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: createRegisterBody({ email: 'not-an-email' }),
      })

      expect(res.status).toBe(400)
      const json = (await res.json()) as any
      expect(json.error).toBe('Invalid email format')
      expect(json.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(json.details).toBeDefined()
      expect(json.details.errors[0].field).toBe('email')
    })

    it('should reject registration with password missing special characters', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null)

      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: createRegisterBody({ password: TEST_PASSWORDS.noSpecial }),
      })

      expect(res.status).toBe(400)
      const json = (await res.json()) as any
      // Our custom validation catches this (no special characters)
      expect(json.error).toBe('Password does not meet requirements')
      expect(json.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(json.details).toBeDefined()
      expect(json.details.errors).toContain('Password must contain at least one special character')
    })
  })

  describe('User Login Flow', () => {
    it('should successfully login with valid credentials', async () => {
      // Mock user exists with correct password
      mockDb.query.users.findFirst.mockResolvedValue(
        createTestUser({ id: 1, email: 'testuser@example.com', name: 'Test User' }),
      )
      // Return auth key for email
      mockDb.query.authKeys = { findFirst: vi.fn().mockResolvedValue({ id: 'email:testuser@example.com', userId: 1, hashedPassword: `hashed_${TEST_PASSWORDS.valid}` }) }

      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: createLoginBody({
          email: 'testuser@example.com',
          password: TEST_PASSWORDS.valid,
        }),
      })

      expect(res.status).toBe(200)
      const json = (await res.json()) as any
      const setCookie = res.headers.get('set-cookie') || ''
      expect(setCookie).toContain('auth_session=')
      expect(json.user).toMatchObject({
        email: 'testuser@example.com',
        name: 'Test User',
      })
      expect(json.user.passwordHash).toBeUndefined()
    })

    it('should reject login with wrong password', async () => {
      // Mock user exists but password doesn't match
      mockDb.query.users.findFirst.mockResolvedValue(
        createTestUser({ id: 1, email: 'testuser@example.com', name: 'Test User' }),
      )

      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: createLoginBody({
          email: 'testuser@example.com',
          password: 'WrongPassword123!',
        }),
      })

      expect(res.status).toBe(401)
      const json = (await res.json()) as any
      expect(json.error).toBe('Invalid credentials')
      expect(json.code).toBe(ErrorCode.INVALID_CREDENTIALS)
    })

    it('should reject login for non-existent user', async () => {
      // Mock user doesn't exist
      mockDb.query.users.findFirst.mockResolvedValue(null)

      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: createLoginBody({
          email: 'nonexistent@example.com',
          password: TEST_PASSWORDS.valid,
        }),
      })

      expect(res.status).toBe(401)
      const json = (await res.json()) as any
      expect(json.error).toBe('Invalid credentials')
      expect(json.code).toBe(ErrorCode.INVALID_CREDENTIALS)
    })
  })

  describe('Protected Routes Access', () => {
    it('should allow access with valid session cookie', async () => {
      // Mock session lookup to return a valid session for our test cookie
      mockDb.query.authSessions.findFirst.mockResolvedValue({ id: 'test-session-1', userId: 1, expiresAt: new Date(Date.now() + 60_000) })
      mockDb.query.users.findFirst.mockResolvedValue(createTestUser({ id: 1 }))
      const res = await makeAuthenticatedRequest(app, '/protected/data')

      expect(res.status).toBe(200)
      const json = (await res.json()) as any
      expect(json.message).toBe('Protected data')
      expect(json.userId).toBe(1)
    })

    it('should reject access without token', async () => {
      const res = await app.request('/protected/data')

      expect(res.status).toBe(401)
      const json = (await res.json()) as any
      expect(json.error).toBe('Authentication required')
      expect(json.code).toBe(ErrorCode.UNAUTHORIZED)
    })
  })

  describe('Complete User Journey', () => {
    it('should handle full registration → login → access protected resource flow', async () => {
      // Step 1: Register - Mock successful registration
      mockDb.query.users.findFirst.mockResolvedValueOnce(null)
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            createTestUser({ id: 1, email: 'journey@example.com', name: 'Journey User' }),
          ]),
        }),
      })

      const registerRes = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: createRegisterBody({
          email: 'journey@example.com',
          password: TEST_PASSWORDS.valid,
        }),
      })

      expect(registerRes.status).toBe(201)
      const registerJson = (await registerRes.json()) as any
      const setCookie1 = registerRes.headers.get('set-cookie') || ''
      expect(setCookie1).toContain('auth_session=')

      // Step 2: Login with same credentials - Mock successful login
      mockDb.query.users.findFirst.mockResolvedValueOnce(
        createTestUser({ id: 1, email: 'journey@example.com', name: 'Journey User' }),
      )
      mockDb.query.authKeys = { findFirst: vi.fn().mockResolvedValue({ id: 'email:journey@example.com', userId: 1, hashedPassword: `hashed_${TEST_PASSWORDS.valid}` }) }

      const loginRes = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: createLoginBody({
          email: 'journey@example.com',
          password: TEST_PASSWORDS.valid,
        }),
      })

      expect(loginRes.status).toBe(200)
      const loginJson = (await loginRes.json()) as any
      const setCookie2 = loginRes.headers.get('set-cookie') || ''
      expect(setCookie2).toContain('auth_session=')

      // Step 3: Access protected resource with first token
      mockDb.query.authSessions.findFirst.mockResolvedValue({ id: 'test-session-1', userId: 1, expiresAt: new Date(Date.now() + 60_000) })
      mockDb.query.users.findFirst.mockResolvedValue(createTestUser({ id: 1 }))
      const protectedRes1 = await app.request('/protected/data', {
        headers: { Cookie: 'auth_session=test-session-1' },
      })

      expect(protectedRes1.status).toBe(200)

      // Step 4: Access protected resource with second token
      mockDb.query.authSessions.findFirst.mockResolvedValue({ id: 'test-session-1', userId: 1, expiresAt: new Date(Date.now() + 60_000) })
      mockDb.query.users.findFirst.mockResolvedValue(createTestUser({ id: 1 }))
      const protectedRes2 = await app.request('/protected/data', {
        headers: { Cookie: 'auth_session=test-session-1' },
      })

      expect(protectedRes2.status).toBe(200)
    })
  })
})
