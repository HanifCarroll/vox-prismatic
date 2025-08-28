import { Module } from '@nestjs/common';
import { JobStatusHelper } from './job-status.helper';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule],
  providers: [JobStatusHelper],
  exports: [JobStatusHelper],
})
export class JobStatusModule {}