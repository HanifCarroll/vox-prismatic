import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PostRepository } from './post.repository';
import { PostEntity } from './entities/post.entity';
import { CreatePostDto, UpdatePostDto, SchedulePostDto, UnschedulePostDto } from './dto';
import { PostStatus } from '@content-creation/types';
import { POST_EVENTS, type PostApprovedEvent, type PostRejectedEvent } from './events/post.events';
import { PostStateService } from './services/post-state.service';

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);

  constructor(
    private readonly postRepository: PostRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly postStateService: PostStateService,
  ) {}

  async create(createPostDto: CreatePostDto): Promise<PostEntity> {
    const id = this.generatePostId();
    
    this.logger.log(`Creating post: ${createPostDto.title}`);
    
    const post = await this.postRepository.create({
      id,
      ...createPostDto,
    });

    this.logger.log(`Created post: ${post.id}`);
    return post;
  }

  async findAll(): Promise<PostEntity[]> {
    this.logger.log('Finding all posts');
    return this.postRepository.findAll();
  }

  // Remove the complex findAll method with filters

  async findOne(id: string, includeSchedule = false): Promise<PostEntity> {
    this.logger.log(`Finding post: ${id}`);
    
    const post = await this.postRepository.findById(id, includeSchedule);
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    
    return post;
  }

  async update(id: string, updatePostDto: UpdatePostDto): Promise<PostEntity> {
    this.logger.log(`Updating post: ${id}`);
    
    try {
      const updatedPost = await this.postRepository.update(id, updatePostDto);
      this.logger.log(`Updated post: ${id}`);
      return updatedPost;
    } catch (error: any) {
      // Prisma P2025: Record not found
      if (error?.code === 'P2025') {
        throw new NotFoundException(`Post with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Removing post: ${id}`);
    
    // Check if post exists and can be deleted
    const post = await this.postRepository.findById(id);
    
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    
    if (post.status === PostStatus.PUBLISHED) {
      throw new ConflictException('Cannot delete published posts');
    }
    
    // Use a transaction to ensure atomic delete operation
    try {
      await this.postRepository.prisma.$transaction(async (tx) => {
        // Delete all related scheduled posts first
        await tx.scheduledPost.deleteMany({
          where: { postId: id }
        });
        
        // Then delete the post
        await tx.post.delete({
          where: { id }
        });
      });
      
      this.logger.log(`Removed post: ${id}`);
    } catch (error: any) {
      // Re-throw our custom errors
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      
      // Prisma P2025: Record not found
      if (error?.code === 'P2025') {
        throw new NotFoundException(`Post with ID ${id} not found`);
      }
      
      this.logger.error(`Failed to remove post ${id}:`, error);
      throw error;
    }
  }

  async submitForReview(id: string): Promise<PostEntity> {
    this.logger.log(`Submitting post for review: ${id}`);
    
    return await this.postStateService.submitForReview(id);
  }

  async approvePost(id: string, approvedBy?: string): Promise<PostEntity> {
    this.logger.log(`Approving post: ${id}`);
    
    const updatedPost = await this.postStateService.approvePost(id, approvedBy || 'system');
    
    // Emit post approval event
    try {
      const approvalEvent: PostApprovedEvent = {
        postId: updatedPost.id,
        post: updatedPost,
        timestamp: new Date(),
        approvedBy: approvedBy || 'system',
      };
      
      this.eventEmitter.emit(POST_EVENTS.APPROVED, approvalEvent);
      this.logger.log(`Post approval event emitted for post: ${id}`);
    } catch (eventError) {
      this.logger.error(`Failed to emit post approval event for post ${id}:`, eventError);
      // Don't fail the approval if event emission fails
    }
    
    return updatedPost;
  }

  async rejectPost(id: string, rejectedBy?: string, reason?: string): Promise<PostEntity> {
    this.logger.log(`Rejecting post: ${id}`);
    
    const updatedPost = await this.postStateService.rejectPost(id, rejectedBy || 'system', reason);
    
    // Emit post rejection event
    try {
      const rejectionEvent: PostRejectedEvent = {
        postId: updatedPost.id,
        post: updatedPost,
        rejectedBy: rejectedBy || 'system',
        reason,
        timestamp: new Date(),
      };
      
      this.eventEmitter.emit(POST_EVENTS.REJECTED, rejectionEvent);
      this.logger.log(`Post rejection event emitted for post: ${id}`);
    } catch (eventError) {
      this.logger.error(`Failed to emit post rejection event for post ${id}:`, eventError);
      // Don't fail the rejection if event emission fails
    }
    
    return updatedPost;
  }

  async getStatusCounts(): Promise<Record<string, number>> {
    return await this.postRepository.getStatusCounts();
  }

  async getPlatformCounts(): Promise<Record<string, number>> {
    return await this.postRepository.getPlatformCounts();
  }

  private generatePostId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `post_${timestamp}_${randomPart}`;
  }
}