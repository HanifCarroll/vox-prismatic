import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApiInfo() {
    return {
      success: true,
      message: 'Content Creation API Server - NestJS Migration',
      version: process.env.API_VERSION || 'v2',
      features: [
        'NestJS framework with dependency injection',
        'Structured error handling with exception filters',
        'Request validation with class-validator',
        'Auto-generated Swagger documentation',
        'PostgreSQL with Prisma ORM',
        'Service layer consistency',
        'TypeScript throughout'
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
      ]
    };
  }

  getHealth() {
    return {
      success: true,
      message: 'Content Creation API Server is healthy',
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || 'v2',
      environment: process.env.NODE_ENV || 'development'
    };
  }
}
