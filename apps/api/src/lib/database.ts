import { initDatabase } from '../database/connection.ts';

/**
 * Initialize database connection for API server
 * Wraps the shared database initialization with server-specific configuration
 */
export function initApiDatabase() {
  try {
    initDatabase();
    console.log('✅ Database connection initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

/**
 * Middleware to ensure database is initialized for each request
 * This ensures database connection is available even if the server
 * restarts or encounters connection issues
 */
export function databaseMiddleware() {
  return async (c: any, next: any) => {
    try {
      // Ensure database is connected
      initDatabase();
      await next();
    } catch (error) {
      console.error('Database middleware error:', error);
      return c.json(
        { 
          success: false, 
          error: 'Database connection failed' 
        }, 
        500
      );
    }
  };
}