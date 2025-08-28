import { Module } from '@nestjs/common';
import { TranscriptController } from './transcript.controller';
import { TranscriptService } from './transcript.service';
import { TranscriptRepository } from './transcript.repository';
import { TranscriptStateService } from './services/transcript-state.service';
import { DatabaseModule } from '../database';
import { SharedModule } from '../shared/shared.module';
import { AIModule } from '../ai/ai.module';
import { JobStatusModule } from '../job-status/job-status.module';

@Module({
  imports: [
    DatabaseModule, 
    SharedModule, 
    AIModule, 
    JobStatusModule
  ],
  controllers: [TranscriptController],
  providers: [TranscriptService, TranscriptRepository, TranscriptStateService],
  exports: [TranscriptService, TranscriptRepository, TranscriptStateService],
})
export class TranscriptModule {}