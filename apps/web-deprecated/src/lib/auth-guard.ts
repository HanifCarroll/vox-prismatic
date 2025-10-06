import { toast } from 'sonner'
import type { ApiError } from '@/lib/client/base'

function isApiError(error: unknown): error is ApiError {
  return (
    !!error &&
    typeof error === 'object' &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
  )
}

const WARNING_TITLE = 'Trouble verifying your session'
let hasWarned = false

function showWarning(message: string) {
  if (typeof window === 'undefined') {
    return
  }
  if (hasWarned) {
    return
  }
  hasWarned = true
  queueMicrotask(() => {
    toast.warning(WARNING_TITLE, {
      description: message,
      duration: 8000,
    })
  })
}

function resolveMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.status >= 500) {
      return 'Our servers took too long to respond. Try again in a moment.'
    }
    if (error.status === 0) {
      return 'The request was blocked. Check your connection and try again.'
    }
    return error.error || 'The session check did not complete.'
  }
  if (error instanceof Error) {
    return error.message || 'The session check did not complete.'
  }
  return 'The session check did not complete.'
}

/**
 * Handles an error thrown during an authentication guard.
 * Returns true when the caller should redirect to the login screen.
 */
export function handleAuthGuardError(error: unknown): boolean {
  if (isApiError(error) && (error.status === 401 || error.status === 419)) {
    return true
  }

  const message = resolveMessage(error)
  showWarning(message)
  if (typeof window === 'undefined') {
    console.warn('[auth] Session check failed:', error)
  }
  return false
}

export function resetAuthGuardWarning() {
  hasWarned = false
}
