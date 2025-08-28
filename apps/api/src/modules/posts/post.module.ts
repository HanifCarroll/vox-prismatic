import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { PostRepository } from './post.repository';
import { DatabaseModule } from '../database';
import { JobStatusModule } from '../job-status/job-status.module';

@Module({
  imports: [DatabaseModule, JobStatusModule],
  controllers: [PostController],
  providers: [PostService, PostRepository],
  exports: [PostService, PostRepository],
})
export class PostModule {}