import { Module } from '@nestjs/common';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { DatabaseModule } from '../database';
import { SharedModule } from '../shared/shared.module';
import { PostModule } from '../posts/post.module';

@Module({
  imports: [DatabaseModule, SharedModule, PostModule],
  controllers: [SchedulerController],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}