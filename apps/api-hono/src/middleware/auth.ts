import { Context } from 'hono';
import { generateId } from '../lib/id-generator';

/**
 * Authentication middleware (placeholder for future implementation)
 * Currently allows all requests through but provides structure for future auth
 */
export function authMiddleware() {
  return async (c: Context, next: Function) => {
    // TODO: Implement authentication logic
    // For now, we'll skip authentication to keep the migration simple
    // Future implementation could include:
    // - JWT token validation
    // - API key validation  
    // - Session validation
    
    // Add request ID for logging
    c.set('requestId', generateRequestId());
    
    await next();
  };
}

/**
 * Generate unique request ID for tracing
 */
function generateRequestId(): string {
  return generateId('req');
}

/**
 * Optional middleware for protected routes (future use)
 */
export function requireAuth() {
  return async (c: Context, next: Function) => {
    // TODO: Implement actual authentication check
    // For now, just proceed
    await next();
  };
}