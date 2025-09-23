import { describe, expect, it } from 'vitest'
import { validatePasswordStrength } from '@/utils/password'
import { TEST_PASSWORDS } from './helpers'

describe('Auth Utility Functions', () => {

  describe('validatePasswordStrength', () => {
    it('should accept a strong password with all requirements', () => {
      const result = validatePasswordStrength(TEST_PASSWORDS.valid)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject passwords that are too short', () => {
      const result = validatePasswordStrength(TEST_PASSWORDS.tooShort)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('should reject passwords without uppercase letters', () => {
      const result = validatePasswordStrength(TEST_PASSWORDS.noUppercase)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    it('should reject passwords without lowercase letters', () => {
      const result = validatePasswordStrength(TEST_PASSWORDS.noLowercase)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('should reject passwords without numbers', () => {
      const result = validatePasswordStrength(TEST_PASSWORDS.noNumber)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('should reject passwords without special characters', () => {
      const result = validatePasswordStrength(TEST_PASSWORDS.noSpecial)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one special character')
    })

    it('should provide all applicable error messages for weak passwords', () => {
      const result = validatePasswordStrength(TEST_PASSWORDS.weak)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
      expect(result.errors).toContain('Password must be at least 8 characters long')
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })
  })
})
