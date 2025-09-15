import bcrypt from 'bcrypt'

const SALT_ROUNDS = 10

/**
 * Hashes a plain text password using bcrypt
 * @param password - Plain text password to hash
 * @returns Promise<string> - The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long')
  }

  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Compares a plain text password with a hashed password
 * @param password - Plain text password to verify
 * @param hashedPassword - Previously hashed password to compare against
 * @returns Promise<boolean> - True if passwords match, false otherwise
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  if (!password || !hashedPassword) {
    return false
  }

  return bcrypt.compare(password, hashedPassword)
}

/**
 * Validates password strength
 * @param password - Password to validate
 * @returns Object with isValid boolean and array of error messages
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (password.length > 72) {
    // bcrypt has a maximum password length of 72 bytes
    errors.push('Password must not exceed 72 characters')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
