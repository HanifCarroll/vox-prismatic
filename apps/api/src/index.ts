import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import 'dotenv/config';

// Middleware imports
import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';
import { loggerMiddleware, devLoggerMiddleware } from './middleware/logger';
import { databaseMiddleware, initApiDatabase } from './lib/database';

// Route imports
import transcripts from './routes/transcripts';
import insights from './routes/insights';
import posts from './routes/posts';
import scheduler from './routes/scheduler';
import dashboard from './routes/dashboard';
import sidebar from './routes/sidebar';
import prompts from './routes/prompts';
import transcribe from './routes/transcribe';
import socialMedia from './routes/social-media';
import { publisher } from './routes/publisher';

// Initialize database on startup
initApiDatabase();

// Create Hono app
const app = new Hono();

// Global middleware
app.use('*', errorHandler());
app.use('*', corsMiddleware());
app.use('*', authMiddleware());
app.use('*', loggerMiddleware());
app.use('*', devLoggerMiddleware());
app.use('*', databaseMiddleware());

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    success: true,
    message: 'Content Creation API Server is healthy',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || 'v1',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.route('/api/transcripts', transcripts);
app.route('/api/insights', insights);
app.route('/api/posts', posts);
app.route('/api/scheduler', scheduler);
app.route('/api/dashboard', dashboard);
app.route('/api/sidebar', sidebar);
app.route('/api/prompts', prompts);
app.route('/api/transcribe', transcribe);
app.route('/api/social-media', socialMedia);
app.route('/api/publisher', publisher);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    success: true,
    message: 'Content Creation API Server',
    version: process.env.API_VERSION || 'v1',
    documentation: '/health',
    endpoints: [
      'GET /api/transcripts',
      'GET /api/insights', 
      'GET /api/posts',
      'GET /api/scheduler/events',
      'GET /api/dashboard/stats',
      'GET /api/sidebar/counts',
      'GET /api/prompts',
      'POST /api/transcribe',
      'GET /api/social-media/linkedin/auth',
      'POST /api/social-media/linkedin/post',
      'GET /api/social-media/x/auth',
      'POST /api/social-media/x/tweet',
      'POST /api/publisher/process',
      'GET /api/publisher/queue',
      'POST /api/publisher/retry/:id',
      'GET /api/publisher/status',
      'POST /api/publisher/immediate'
    ]
  });
});

// Handle 404s
app.notFound(notFoundHandler());

// Server configuration
const port = parseInt(process.env.PORT || '3001', 10);
const host = process.env.HOST || 'localhost';

console.log(`🚀 Starting Content Creation API Server...`);
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔗 CORS enabled for: ${process.env.ALLOWED_ORIGINS || 'http://localhost:3000'}`);

serve({
  fetch: app.fetch,
  port,
  hostname: host,
}, (info) => {
  console.log(`🌟 Server is running at http://${info.address}:${info.port}`);
  console.log(`❤️  Health check: http://${info.address}:${info.port}/health`);
});

export default app;