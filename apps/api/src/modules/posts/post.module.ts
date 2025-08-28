import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { PostRepository } from './post.repository';
import { PostStateService } from './services/post-state.service';
import { DatabaseModule } from '../database';
import { JobStatusModule } from '../job-status/job-status.module';

@Module({
  imports: [DatabaseModule, JobStatusModule],
  controllers: [PostController],
  providers: [PostService, PostRepository, PostStateService],
  exports: [PostService, PostRepository, PostStateService],
})
export class PostModule {}