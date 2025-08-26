import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './modules/database';
import { SharedModule } from './modules/shared/shared.module';
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
import { AuthGuard } from './common/guards/auth.guard';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // Core modules (Global and Database)
    DatabaseModule,
    SharedModule,  // Global module providing ID generation and utilities
    AIModule,      // AI processing module for transcripts and insights
    
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
