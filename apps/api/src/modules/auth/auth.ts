import { eq } from 'drizzle-orm'
import { jwtVerify, SignJWT } from 'jose'
import { env } from '@/config/env'
import { db } from '@/db'
import { users } from '@/db/schema'
import { ConflictException, ErrorCode, UnauthorizedException, ValidationException } from '@/utils/errors'
import { hashPassword, validatePasswordStrength, verifyPassword } from '@/utils/password'

// Constants
const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET)
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN || '7d'

// Types
export interface RegisterDto {
  email: string
  name: string
  password: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface UserDto {
  id: number
  email: string
  name: string
  createdAt: Date
}

export interface JWTPayload {
  userId: number
  email: string
  name?: string
}

// ============= Auth Functions =============

/**
 * Register a new user
 */
export async function registerUser(data: RegisterDto): Promise<UserDto> {
  // Validate password strength using the robust validation function
  const passwordValidation = validatePasswordStrength(data.password)
  if (!passwordValidation.isValid) {
    throw new ValidationException(
      'Password does not meet requirements',
      { errors: passwordValidation.errors },
    )
  }

  // Check if email already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  })

  if (existingUser) {
    throw new ConflictException('Email already registered', ErrorCode.EMAIL_ALREADY_EXISTS)
  }

  // Hash the password using the secure utility function
  const passwordHash = await hashPassword(data.password)

  // Create the user
  const [createdUser] = await db
    .insert(users)
    .values({
      email: data.email,
      name: data.name,
      passwordHash,
    })
    .returning()

  // Return user without sensitive data
  const { passwordHash: _, ...userDto } = createdUser
  return userDto
}

/**
 * Login a user with email and password
 */
export async function loginUser(data: LoginDto): Promise<UserDto> {
  // Find user by email
  const user = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  })

  if (!user) {
    // Use generic message to avoid revealing whether email exists
    throw new UnauthorizedException('Invalid credentials', ErrorCode.INVALID_CREDENTIALS)
  }

  // Verify password using the secure utility function
  const isPasswordValid = await verifyPassword(data.password, user.passwordHash)

  if (!isPasswordValid) {
    // Use same message as above to avoid revealing password validity
    throw new UnauthorizedException('Invalid credentials', ErrorCode.INVALID_CREDENTIALS)
  }

  // Return user without sensitive data
  const { passwordHash: _, ...userDto } = user
  return userDto
}

/**
 * Get a user by their ID (for middleware verification)
 */
export async function getUserById(userId: number): Promise<UserDto | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user) {
    return null
  }

  // Return user without sensitive data
  const { passwordHash: _, ...userDto } = user
  return userDto
}

// ============= JWT Functions =============

/**
 * Generate a JWT token
 */
export async function generateToken(payload: JWTPayload): Promise<string> {
  const jwt = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET)

  return jwt
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    // Validate the payload has our required fields
    if (!payload.userId || !payload.email) {
      throw new UnauthorizedException('Invalid token', ErrorCode.INVALID_TOKEN)
    }
    return {
      userId: payload.userId as number,
      email: payload.email as string,
      name: payload.name as string | undefined,
    }
  } catch (error) {
    throw new UnauthorizedException('Invalid or expired token', ErrorCode.TOKEN_EXPIRED)
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}
