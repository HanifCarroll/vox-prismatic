import type { Hono } from 'hono'

export interface TestUser {
  id: number
  email: string
  name: string
  linkedinToken: string | null
  createdAt: Date
  updatedAt: Date
  isAdmin: boolean
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  subscriptionStatus: string
  subscriptionPlan: string
  subscriptionCurrentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  trialEndsAt: Date | null
  trialNotes: string | null
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
    linkedinToken: null,
    createdAt: now,
    updatedAt: now,
    isAdmin: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: 'inactive',
    subscriptionPlan: 'pro',
    subscriptionCurrentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    trialEndsAt: null,
    trialNotes: null,
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
  return app.request(path, {
    ...options,
    headers: {
      ...options.headers,
      Cookie: `auth_session=test-session-${userId}`,
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
