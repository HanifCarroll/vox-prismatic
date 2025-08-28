/**
 * ProcessingJobModule
 * NestJS module configuration for ProcessingJob state management
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { ProcessingJobStateService } from './processing-job-state.service';
import { ProcessingJobRepository } from './processing-job.repository';
import { ProcessingJobController } from './processing-job.controller';
import { ProcessingJobSchedulerService } from './processing-job-scheduler.service';
import { DatabaseModule } from '../database/database.module';

/**
 * Module for managing ProcessingJob state machine and related services
 */
@Module({
  imports: [
    DatabaseModule,
    EventEmitterModule.forRoot({
      // Configuration for event emitter
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    ScheduleModule.forRoot(),
  ],
  providers: [
    ProcessingJobStateService,
    ProcessingJobRepository,
    ProcessingJobSchedulerService,
  ],
  controllers: [ProcessingJobController],
  exports: [
    ProcessingJobStateService,
    ProcessingJobRepository,
  ],
})
export class ProcessingJobModule {}