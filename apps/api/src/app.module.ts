import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './modules/database';
import { SharedModule } from './modules/shared/shared.module';
import { CommonModule } from './common/common.module';
import { QueueModule } from './modules/queue/queue.module';
import { AIModule } from './modules/ai/ai.module';
import { TranscriptModule } from './modules/transcripts';
import { InsightModule } from './modules/insights';
import { PostModule } from './modules/posts';
import { SchedulerModule } from './modules/scheduler';
import { PromptsModule } from './modules/prompts';
import { SidebarModule } from './modules/sidebar';
import { DashboardModule } from './modules/dashboard';
import { TranscriptionModule } from './modules/transcription';
import { PublisherModule } from './modules/publisher';
import { OAuthModule } from './modules/oauth';
import { SocialMediaModule } from './modules/social-media';
import { IntegrationsModule } from './modules/integrations';
import { LinkedInModule } from './modules/linkedin';
import { XModule } from './modules/x';
import { ContentProcessingModule } from './modules/content-processing/content-processing.module';
import { AuthGuard } from './common/guards/auth.guard';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // Event emitter for real-time updates
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 10,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    
    // Core modules (Global and Database)
    DatabaseModule,
    SharedModule,  // Global module providing ID generation and utilities
    CommonModule,  // Global common module with shared services (includes caching)
    QueueModule,   // Queue management for background jobs
    AIModule,      // AI processing module for transcripts and insights
    ContentProcessingModule, // Automated content processing pipeline
    
    // Integration modules
    IntegrationsModule,  // Shared types and interfaces for integrations
    LinkedInModule,      // LinkedIn API integration
    XModule,            // X (Twitter) API integration
    
    // Feature modules
    TranscriptModule,
    InsightModule,
    PostModule,
    SchedulerModule,
    PromptsModule,
    SidebarModule,
    DashboardModule,
    TranscriptionModule,
    PublisherModule,
    OAuthModule,
    SocialMediaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
