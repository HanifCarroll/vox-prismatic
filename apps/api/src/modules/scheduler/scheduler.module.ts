import { Module } from '@nestjs/common';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { ScheduledPostStateService } from './services/scheduled-post-state.service';
import { SchedulerQueueService } from './services/scheduler-queue.service';
import { SchedulerHealthService } from './services/scheduler-health.service';
import { ScheduledPostRepository } from './scheduled-post.repository';
import { DatabaseModule } from '../database';
import { SharedModule } from '../shared/shared.module';
import { PostModule } from '../posts/post.module';

@Module({
  imports: [DatabaseModule, SharedModule, PostModule],
  controllers: [SchedulerController],
  providers: [
    SchedulerService, 
    ScheduledPostStateService, 
    SchedulerQueueService,
    SchedulerHealthService,
    ScheduledPostRepository
  ],
  exports: [
    SchedulerService, 
    ScheduledPostStateService, 
    SchedulerQueueService,
    SchedulerHealthService,
    ScheduledPostRepository
  ],
})
export class SchedulerModule {}