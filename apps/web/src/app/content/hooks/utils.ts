/**
 * Utility functions for server actions and error handling
 */

/**
 * Converts an object to FormData for server action consumption
 */
export function objectToFormData(data: Record<string, any>): FormData {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Handle different value types appropriately
      if (value instanceof File) {
        formData.append(key, value);
      } else if (Array.isArray(value)) {
        // Handle arrays by appending each item or JSON stringifying
        formData.append(key, JSON.stringify(value));
      } else if (typeof value === 'object') {
        // Handle objects by JSON stringifying
        formData.append(key, JSON.stringify(value));
      } else {
        // Handle primitives
        formData.append(key, String(value));
      }
    }
  });
  
  return formData;
}

/**
 * Extracts error message from various error types
 */
export function getErrorMessage(error: unknown, fallback: string = 'Unknown error'): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return fallback;
}

/**
 * Handles server action result and extracts error message
 */
export function handleServerActionResult<T>(
  result: { success: boolean; error?: unknown; data?: T },
  fallback: string = 'Operation failed'
): { success: boolean; error?: string; data?: T } {
  if (!result.success && result.error) {
    return {
      success: false,
      error: getErrorMessage(result.error, fallback),
      data: result.data
    };
  }
  
  return {
    success: result.success,
    data: result.data
  };
}

/**
 * Creates a standardized error handler for server action hooks
 */
export function createErrorHandler(
  setError: (error: string) => void,
  fallback: string = 'Operation failed'
) {
  return (error: unknown) => {
    const errorMessage = getErrorMessage(error, fallback);
    setError(errorMessage);
  };
}