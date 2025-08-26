import { Context, Next } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../errors/api-errors';

type ValidationTarget = 'body' | 'query' | 'params' | 'form';

/**
 * Middleware to validate incoming requests against Zod schemas
 * Supports validation of body, query params, path params, and form data
 */
export function validateRequest(schemas: Partial<Record<ValidationTarget, z.ZodSchema>>) {
  return async (c: Context, next: Next) => {
    try {
      const validatedData: Record<string, any> = {};

      // Validate request body
      if (schemas.body) {
        const body = await c.req.json().catch(() => null);
        const result = schemas.body.safeParse(body);
        if (!result.success) {
          throw new ValidationError('Request body validation failed', result.error.issues);
        }
        validatedData.body = result.data;
      }

      // Validate query parameters
      if (schemas.query) {
        const query = c.req.query();
        const result = schemas.query.safeParse(query);
        if (!result.success) {
          throw new ValidationError('Query parameters validation failed', result.error.issues);
        }
        validatedData.query = result.data;
      }

      // Validate path parameters
      if (schemas.params) {
        const params = c.req.param();
        const result = schemas.params.safeParse(params);
        if (!result.success) {
          throw new ValidationError('Path parameters validation failed', result.error.issues);
        }
        validatedData.params = result.data;
      }

      // Validate form data
      if (schemas.form) {
        const formData = await c.req.formData().catch(() => null);
        if (!formData) {
          throw new ValidationError('Form data is required');
        }
        
        const formObj = Object.fromEntries(formData);
        const result = schemas.form.safeParse(formObj);
        if (!result.success) {
          throw new ValidationError('Form data validation failed', result.error.issues);
        }
        validatedData.form = result.data;
      }

      // Store validated data in context for route handlers to access
      c.set('validated', validatedData);
      
      await next();
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Request validation failed');
    }
  };
}

/**
 * Helper function to retrieve validated data from context
 * Type-safe retrieval of validated request data
 */
export function getValidated<T = any>(c: Context, target: ValidationTarget): T {
  const validated = c.get('validated') || {};
  return validated[target];
}