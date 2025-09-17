import { zValidator } from '@hono/zod-validator'
import type { ZodSchema } from 'zod'
import { ValidationException } from '@/utils/errors'

/**
 * Custom Zod validator that throws our ValidationException instead of returning Zod errors
 * This ensures consistent error format across the API
 */
export function validateRequest<T extends ZodSchema>(
  target: 'json' | 'query' | 'param' | 'header' | 'cookie',
  schema: T,
) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      // Extract the first error message as the main error message
      const firstError = result.error.issues[0]
      const message = firstError?.message || 'Validation failed'

      // Include all validation errors in details
      const details = {
        errors: result.error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      }

      throw new ValidationException(message, details)
    }
  })
}
