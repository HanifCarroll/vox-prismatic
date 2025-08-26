import { Module } from '@nestjs/common';
import { TranscriptController } from './transcript.controller';
import { TranscriptService } from './transcript.service';
import { TranscriptRepository } from './transcript.repository';
import { DatabaseModule } from '../database';

@Module({
  imports: [DatabaseModule],
  controllers: [TranscriptController],
  providers: [TranscriptService, TranscriptRepository],
  exports: [TranscriptService, TranscriptRepository],
})
export class TranscriptModule {}