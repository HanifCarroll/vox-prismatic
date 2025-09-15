/**
 * Crypto utilities for validating entropy and generating secure tokens
 */

/**
 * Calculate Shannon entropy of a string
 * Higher entropy means more randomness/unpredictability
 * @param str - String to calculate entropy for
 * @returns Entropy value in bits
 */
export function calculateEntropy(str: string): number {
  if (!str || str.length === 0) {
    return 0
  }

  // Count frequency of each character
  const charFrequency = new Map<string, number>()
  for (const char of str) {
    charFrequency.set(char, (charFrequency.get(char) || 0) + 1)
  }

  // Calculate entropy using Shannon's formula
  let entropy = 0
  const length = str.length

  for (const count of charFrequency.values()) {
    const probability = count / length
    entropy -= probability * Math.log2(probability)
  }

  // Return total entropy (bits per character * length)
  return entropy * length
}

/**
 * Check if a string has sufficient entropy for cryptographic use
 * @param secret - Secret string to validate
 * @param minBits - Minimum required entropy in bits (default: 128 for strong security)
 * @returns Object with validation result and details
 */
export function validateSecretEntropy(
  secret: string,
  minBits: number = 128,
): {
  isValid: boolean
  entropy: number
  minRequired: number
  errors: string[]
} {
  const errors: string[] = []

  if (!secret) {
    errors.push('Secret is empty or undefined')
    return {
      isValid: false,
      entropy: 0,
      minRequired: minBits,
      errors,
    }
  }

  // Check minimum length (at least 32 characters for good entropy)
  if (secret.length < 32) {
    errors.push(`Secret must be at least 32 characters long (got ${secret.length})`)
  }

  // Calculate entropy
  const entropy = calculateEntropy(secret)

  // Check if entropy meets minimum requirement
  if (entropy < minBits) {
    errors.push(
      `Secret has insufficient entropy: ${entropy.toFixed(2)} bits (minimum required: ${minBits} bits). ` +
        `Use a longer, more random secret with mixed characters.`,
    )
  }

  // Check for common weak patterns
  if (secret.includes('secret') || secret.includes('password') || secret.includes('123456')) {
    errors.push('Secret contains common weak patterns')
  }

  // Check character diversity
  const hasUppercase = /[A-Z]/.test(secret)
  const hasLowercase = /[a-z]/.test(secret)
  const hasNumbers = /[0-9]/.test(secret)
  const hasSpecial = /[^A-Za-z0-9]/.test(secret)

  const diversityCount = [hasUppercase, hasLowercase, hasNumbers, hasSpecial].filter(Boolean).length

  if (diversityCount < 3) {
    errors.push(
      'Secret should contain at least 3 different character types (uppercase, lowercase, numbers, special characters)',
    )
  }

  return {
    isValid: errors.length === 0,
    entropy,
    minRequired: minBits,
    errors,
  }
}

/**
 * Generate a cryptographically secure random string
 * @param length - Length of the string to generate
 * @param charset - Character set to use (default: alphanumeric + special)
 * @returns Random string
 */
export function generateSecureToken(
  length: number = 64,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?',
): string {
  if (typeof crypto === 'undefined') {
    throw new Error('Crypto API is not available')
  }

  const result: string[] = []
  const charsetLength = charset.length
  const randomValues = new Uint32Array(length)

  crypto.getRandomValues(randomValues)

  for (let i = 0; i < length; i++) {
    result.push(charset[randomValues[i] % charsetLength])
  }

  return result.join('')
}
