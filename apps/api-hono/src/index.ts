import { Hono } from 'hono';
import 'dotenv/config';

// Middleware imports
import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';
import { loggerMiddleware, devLoggerMiddleware } from './middleware/logger';

// Database adapter import
import { getDatabaseAdapter } from './database/adapter';

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
import { oauth } from './routes/oauth';

// Initialize database adapter on startup
const initDatabase = () => {
  try {
    const adapter = getDatabaseAdapter();
    console.log('✅ Database adapter initialized (PostgreSQL via Prisma)');
  } catch (error) {
    console.error('❌ Failed to initialize database adapter:', error);
    process.exit(1);
  }
};

initDatabase();

// Create Hono app
const app = new Hono();

// Global middleware - order matters!
app.use('*', corsMiddleware());
app.use('*', authMiddleware());
app.use('*', loggerMiddleware());
app.use('*', devLoggerMiddleware());
app.use('*', errorHandler()); // Error handler must be last to catch all errors

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
app.route('/oauth', oauth);

// Root endpoint with updated documentation
app.get('/', (c) => {
  return c.json({
    success: true,
    message: 'Content Creation API Server - Enhanced with Validation & Error Handling',
    version: process.env.API_VERSION || 'v2',
    features: [
      'Request validation with Zod schemas',
      'Structured error handling',
      'Service layer consistency',
      'TypeScript DTOs',
      'Result pattern throughout'
    ],
    endpoints: [
      'GET /api/transcripts',
      'POST /api/transcripts',
      'PATCH /api/transcripts/:id',
      'GET /api/insights', 
      'PATCH /api/insights/:id',
      'POST /api/insights/bulk',
      'GET /api/posts',
      'PATCH /api/posts/:id',
      'POST /api/posts/:id/schedule',
      'GET /api/scheduler/events',
      'POST /api/scheduler/events',
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
      'POST /api/publisher/immediate',
      'GET /oauth/linkedin',
      'POST /oauth/linkedin/token'
    ]
  });
});

// Handle 404s
app.notFound(notFoundHandler());

// Server configuration
const port = parseInt(process.env.PORT || '3001', 10);
const host = process.env.HOST || '0.0.0.0';

console.log(`🚀 Starting Enhanced Content Creation API Server...`);
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🛡️  Request validation: Enabled with Zod schemas`);
console.log(`🎯 Error handling: Enhanced with custom error classes`);
console.log(`⚡ Service consistency: All routes use service layer`);
console.log(`🔗 CORS enabled for: ${process.env.ALLOWED_ORIGINS || 'http://localhost:3000'}`);

const server = Bun.serve({
  fetch: app.fetch,
  port,
  hostname: host,
});

console.log(`🌟 Server is running at http://${server.hostname}:${server.port}`);
console.log(`❤️  Health check: http://${server.hostname}:${server.port}/health`);

// No export - let our explicit Bun.serve handle everything