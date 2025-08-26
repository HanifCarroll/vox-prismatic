import { Module } from '@nestjs/common';
import { TranscriptController } from './transcript.controller';
import { TranscriptService } from './transcript.service';
import { TranscriptRepository } from './transcript.repository';
import { DatabaseModule } from '../database';
import { SharedModule } from '../shared/shared.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [DatabaseModule, SharedModule, AIModule],
  controllers: [TranscriptController],
  providers: [TranscriptService, TranscriptRepository],
  exports: [TranscriptService, TranscriptRepository],
})
export class TranscriptModule {}