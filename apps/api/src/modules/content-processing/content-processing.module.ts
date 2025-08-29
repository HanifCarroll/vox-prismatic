import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { ContentProcessingService } from './content-processing.service';
import { ContentProcessingController } from './content-processing.controller';
import { PipelineController } from './pipeline.controller';
import { SSEController } from './sse.controller';
import { SSEEventsService } from './sse-events.service';
import { PipelineOrchestratorService } from './services/pipeline-orchestrator.service';
import { PipelineMetricsService } from './services/pipeline-metrics.service';
import { TranscriptProcessorService } from './services/transcript-processor.service';
import { InsightGeneratorService } from './services/insight-generator.service';
import { PostComposerService } from './services/post-composer.service';
import { ProcessingStateMachine } from '../processing-job/state-machines/processing-state-machine';
import { TranscriptStateMachine } from '../processing-job/state-machines/transcript-state-machine';

import { AIModule } from '../ai/ai.module';
import { TranscriptModule } from '../transcripts/transcript.module';
import { InsightModule } from '../insights/insight.module';
import { PostModule } from '../posts/post.module';
import { DatabaseModule } from '../database/database.module';
import { QueueModule } from '../queue/queue.module';
import { StateModule } from '../state/state.module';

@Module({
  imports: [
    ConfigModule,
    QueueModule,
    AIModule,
    TranscriptModule,
    InsightModule,
    PostModule,
    DatabaseModule,
    StateModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    ContentProcessingService,
    SSEEventsService,
    PipelineOrchestratorService,
    PipelineMetricsService,
    TranscriptProcessorService,
    InsightGeneratorService,
    PostComposerService,
    ProcessingStateMachine,
    TranscriptStateMachine,
  ],
  controllers: [ContentProcessingController, PipelineController, SSEController],
  exports: [
    ContentProcessingService,
    PipelineOrchestratorService,
    PipelineMetricsService,
  ],
})
export class ContentProcessingModule {}