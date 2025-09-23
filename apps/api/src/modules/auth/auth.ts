import { eq } from 'drizzle-orm'
// JWT removed: using Lucia sessions
import { db } from '@/db'
import { authKeys, users } from '@/db/schema'
import {
  ConflictException,
  ErrorCode,
  UnauthorizedException,
  ValidationException,
} from '@/utils/errors'
import { hashPassword, validatePasswordStrength, verifyPassword } from '@/utils/password'

// Using Lucia sessions instead of JWT

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

// ============= Auth Functions =============

/**
 * Register a new user
 */
export async function registerUser(data: RegisterDto): Promise<UserDto> {
  // Normalize email
  const normalizedEmail = data.email.trim().toLowerCase()

  // Validate password strength using the robust validation function
  const passwordValidation = validatePasswordStrength(data.password)
  if (!passwordValidation.isValid) {
    throw new ValidationException('Password does not meet requirements', {
      errors: passwordValidation.errors,
    })
  }

  // Check if email already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  })

  if (existingUser) {
    throw new ConflictException('Email already registered', ErrorCode.EMAIL_ALREADY_EXISTS)
  }

  // Create the user
  let createdUser
  try {
    ;[createdUser] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        name: data.name,
      })
      .returning()
  } catch (error: any) {
    // Handle unique constraint violation (e.g., duplicate email) under concurrency
    const code = error?.code || error?.cause?.code
    if (code === '23505' || /duplicate key/i.test(String(error?.message))) {
      throw new ConflictException('Email already registered', ErrorCode.EMAIL_ALREADY_EXISTS)
    }
    throw error
  }

  // Hash the password and create auth key for email/password
  const keyId = `email:${normalizedEmail}`
  const passwordHash = await hashPassword(data.password)
  try {
    await db.insert(authKeys).values({
      id: keyId,
      userId: createdUser.id,
      hashedPassword: passwordHash,
      primaryKey: true,
    })
  } catch {
    // If key insert fails, best effort cleanup user could be performed. For now, surface error upstream.
  }

  // Return user without sensitive data
  return createdUser
}

/**
 * Login a user with email and password
 */
export async function loginUser(data: LoginDto): Promise<UserDto> {
  // Normalize email
  const normalizedEmail = data.email.trim().toLowerCase()

  // Find user by email
  const user = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  })

  if (!user) {
    // Use generic message to avoid revealing whether email exists
    throw new UnauthorizedException('Invalid credentials', ErrorCode.INVALID_CREDENTIALS)
  }

  // Verify password using auth_keys
  const keyId = `email:${normalizedEmail}`
  const key = await db.query.authKeys.findFirst({ where: eq(authKeys.id, keyId) })
  const isPasswordValid = !!key?.hashedPassword && (await verifyPassword(data.password, key.hashedPassword))

  if (!isPasswordValid) {
    // Use same message as above to avoid revealing password validity
    throw new UnauthorizedException('Invalid credentials', ErrorCode.INVALID_CREDENTIALS)
  }

  return user
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

  return user
}
