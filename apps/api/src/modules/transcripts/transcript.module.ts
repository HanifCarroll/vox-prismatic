import { Module } from '@nestjs/common';
import { TranscriptController } from './transcript.controller';
import { TranscriptService } from './transcript.service';
import { TranscriptRepository } from './transcript.repository';
import { DatabaseModule } from '../database';
import { SharedModule } from '../shared/shared.module';
import { AIModule } from '../ai/ai.module';
import { JobStatusModule } from '../job-status/job-status.module';
import { StateModule } from '../state/state.module';

@Module({
  imports: [
    DatabaseModule, 
    SharedModule, 
    AIModule, 
    JobStatusModule,
    StateModule
  ],
  controllers: [TranscriptController],
  providers: [TranscriptService, TranscriptRepository],
  exports: [TranscriptService, TranscriptRepository],
})
export class TranscriptModule {}