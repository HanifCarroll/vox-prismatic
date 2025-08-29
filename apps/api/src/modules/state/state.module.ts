import { Module } from '@nestjs/common';
import { TranscriptStateService } from '../transcripts/services/transcript-state.service';
import { InsightStateService } from '../insights/services/insight-state.service';
import { TranscriptRepository } from '../transcripts/transcript.repository';
import { InsightRepository } from '../insights/insight.repository';
import { DatabaseModule } from '../database/database.module';
import { SharedModule } from '../shared/shared.module';

/**
 * StateModule provides shared state management services
 * that are used across multiple modules to avoid circular dependencies.
 * 
 * This module exports state services that track and manage the lifecycle
 * of transcripts and insights throughout the application.
 */
@Module({
  imports: [DatabaseModule, SharedModule],
  providers: [
    TranscriptStateService,
    InsightStateService,
    TranscriptRepository,
    InsightRepository
  ],
  exports: [TranscriptStateService, InsightStateService],
})
export class StateModule {}