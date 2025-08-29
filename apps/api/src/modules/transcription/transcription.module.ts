import { Module } from '@nestjs/common';
import { TranscriptionController } from './transcription.controller';
import { TranscriptionService } from './transcription.service';
import { DeepgramService } from './deepgram.service';
import { DatabaseModule } from '../database/database.module';
import { SharedModule } from '../shared/shared.module';
import { AIModule } from '../ai/ai.module';
import { TranscriptModule } from '../transcripts/transcript.module';

@Module({
  imports: [DatabaseModule, SharedModule, AIModule, TranscriptModule],
  controllers: [TranscriptionController],
  providers: [TranscriptionService, DeepgramService],
  exports: [TranscriptionService],
})
export class TranscriptionModule {}