import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ContentProcessingService } from './content-processing.service';
import { ContentProcessingController } from './content-processing.controller';
import { SSEController } from './sse.controller';
import { SSEEventsService } from './sse-events.service';

import { AIModule } from '../ai/ai.module';
import { TranscriptModule } from '../transcripts/transcript.module';
import { InsightModule } from '../insights/insight.module';
import { PostModule } from '../posts/post.module';
import { DatabaseModule } from '../database/database.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    ConfigModule,
    QueueModule,
    AIModule,
    TranscriptModule,
    InsightModule,
    PostModule,
    DatabaseModule,
  ],
  providers: [ContentProcessingService, SSEEventsService],
  controllers: [ContentProcessingController, SSEController],
  exports: [ContentProcessingService],
})
export class ContentProcessingModule {}