import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { PostRepository } from './post.repository';
import { DatabaseModule } from '../database';
import { ContentProcessingModule } from '../content-processing/content-processing.module';

@Module({
  imports: [DatabaseModule, ContentProcessingModule],
  controllers: [PostController],
  providers: [PostService, PostRepository],
  exports: [PostService, PostRepository],
})
export class PostModule {}