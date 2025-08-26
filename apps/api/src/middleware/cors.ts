import { cors } from 'hono/cors';

/**
 * CORS middleware configuration for API server
 * Allows requests from the Next.js frontend, desktop app, and configured origins
 */
export function corsMiddleware() {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim());

  // In development, be more permissive for Tauri apps
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  return cors({
    origin: isDevelopment ? 
      // Development: Allow configured origins plus any tauri:// scheme
      (origin) => {
        if (!origin) return '*'; // Allow requests with no origin (like from desktop apps)
        if (origin.startsWith('tauri://')) return origin; // Allow any Tauri app
        if (origin.startsWith('http://tauri.')) return origin; // Tauri localhost variants
        if (origin.startsWith('https://tauri.')) return origin; // Tauri localhost variants
        if (allowedOrigins.includes(origin)) return origin;
        // Return the origin if it's in the allowed list, otherwise return false
        return false;
      } :
      // Production: Strict origin checking
      allowedOrigins,
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Cache-Control'
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    exposeHeaders: ['Content-Length', 'X-Request-ID'],
    maxAge: 86400, // 24 hours
    credentials: true,
  });
}