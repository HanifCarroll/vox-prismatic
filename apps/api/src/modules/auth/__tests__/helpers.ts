import type { Hono } from 'hono'
import { generateToken } from '../auth'

export interface TestUser {
  id: number
  email: string
  name: string
  passwordHash: string
  linkedinToken: string | null
  createdAt: Date
  updatedAt: Date
}

export interface TestUserWithPassword extends TestUser {
  password: string
}

/**
 * Creates a test user object with default values
 */
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const now = new Date()
  return {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: '$2b$10$mockHashedPassword',
    linkedinToken: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createTestUserWithPassword(
  overrides: Partial<TestUserWithPassword> = {},
): TestUserWithPassword {
  const baseUser = createTestUser(overrides)
  return {
    ...baseUser,
    password: 'SecurePass123!',
    ...overrides,
  }
}

/**
 * Makes an authenticated request with a valid JWT token
 */
export async function makeAuthenticatedRequest(
  app: Hono,
  path: string,
  options: RequestInit = {},
  userId = 1,
): Promise<Response> {
  const token = await generateToken({
    userId,
    email: 'test@example.com',
    name: 'Test User',
  })

  return app.request(path, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}

/**
 * Creates request body for registration
 */
export function createRegisterBody(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    email: 'newuser@example.com',
    name: 'New User',
    password: 'ValidPass123!',
    ...overrides,
  })
}

/**
 * Creates request body for login
 */
export function createLoginBody(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    email: 'test@example.com',
    password: 'SecurePass123!',
    ...overrides,
  })
}

/**
 * Common test passwords for different scenarios
 */
export const TEST_PASSWORDS = {
  valid: 'ValidPass123!',
  weak: 'weak',
  noUppercase: 'validpass123!',
  noLowercase: 'VALIDPASS123!',
  noNumber: 'ValidPass!',
  noSpecial: 'ValidPass123',
  tooShort: 'Val1!',
} as const
