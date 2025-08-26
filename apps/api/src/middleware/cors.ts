import { cors } from 'hono/cors';

/**
 * CORS middleware configuration for API server
 * Allows requests from the Next.js frontend and configured origins
 */
export function corsMiddleware() {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim());

  return cors({
    origin: allowedOrigins,
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    exposeHeaders: ['Content-Length', 'X-Request-ID'],
    maxAge: 86400, // 24 hours
    credentials: true,
  });
}