import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ContentProcessingService } from './content-processing.service';
import { ContentProcessingController } from './content-processing.controller';

import { AIModule } from '../ai/ai.module';
import { TranscriptModule } from '../transcripts/transcript.module';
import { InsightModule } from '../insights/insight.module';
import { PostModule } from '../posts/post.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    ConfigModule,
    AIModule,
    TranscriptModule,
    InsightModule,
    PostModule,
    DatabaseModule,
  ],
  providers: [ContentProcessingService],
  controllers: [ContentProcessingController],
  exports: [ContentProcessingService],
})
export class ContentProcessingModule {}