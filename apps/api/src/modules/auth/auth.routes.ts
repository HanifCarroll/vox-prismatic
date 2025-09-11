import { Hono } from 'hono'
import { z } from 'zod'
import { loginRateLimit, registrationRateLimit } from '@/middleware/rate-limit'
import { validateRequest } from '@/middleware/validation'
import { ErrorCode, UnauthorizedException } from '@/utils/errors'
import { extractBearerToken, generateToken, loginUser, registerUser, verifyToken } from './auth'

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long'),
})

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

// Create the auth routes
export const authRoutes = new Hono()

/**
 * POST /auth/register
 * Register a new user
 */
authRoutes.post(
  '/register',
  registrationRateLimit,
  validateRequest('json', registerSchema),
  async (c) => {
    const data = c.req.valid('json')

    // Register the user
    const user = await registerUser(data)

    // Generate JWT token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    })

    return c.json(
      {
        user,
        token,
      },
      201,
    )
  },
)

/**
 * POST /auth/login
 * Login with email and password
 */
authRoutes.post('/login', loginRateLimit, validateRequest('json', loginSchema), async (c) => {
  const data = c.req.valid('json')

  // Authenticate the user
  const user = await loginUser(data)

  // Generate JWT token
  const token = await generateToken({
    userId: user.id,
    email: user.email,
    name: user.name,
  })

  return c.json({
    user,
    token,
  })
})

/**
 * GET /auth/me
 * Get current user information
 * Requires valid JWT token in Authorization header
 */
authRoutes.get('/me', async (c) => {
  // Extract and verify token
  const token = extractBearerToken(c.req.header('Authorization'))

  if (!token) {
    throw new UnauthorizedException('Authorization header required', ErrorCode.NO_AUTH_HEADER)
  }

  // Verify and decode the token
  const payload = await verifyToken(token)

  // For MVP, we trust the JWT payload
  // In production, you might want to fetch fresh user data from DB
  return c.json({
    user: {
      id: payload.userId,
      email: payload.email,
      name: payload.name,
    },
  })
})
