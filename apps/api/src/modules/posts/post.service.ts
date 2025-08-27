import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PostRepository } from './post.repository';
import { PostEntity } from './entities/post.entity';
import { CreatePostDto, UpdatePostDto, PostFilterDto, SchedulePostDto, UnschedulePostDto, PostStatus } from './dto';

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);

  constructor(private readonly postRepository: PostRepository) {}

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

  async findAll(filters?: PostFilterDto): Promise<{
    data: PostEntity[];
    meta: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
      pages: number;
      currentPage: number;
    };
  }> {
    this.logger.log(`Finding posts with filters: ${JSON.stringify(filters)}`);
    
    // Fetch data and count in parallel for better performance
    const [posts, total] = await Promise.all([
      this.postRepository.findAll(filters),
      this.postRepository.count(filters)
    ]);
    
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const pages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    
    return {
      data: posts,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + posts.length < total,
        pages,
        currentPage,
      },
    };
  }

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
    
    await this.findOne(id);
    
    const updatedPost = await this.postRepository.update(id, updatePostDto);
    
    this.logger.log(`Updated post: ${id}`);
    return updatedPost;
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Removing post: ${id}`);
    
    const post = await this.findOne(id);
    
    if (post.status === PostStatus.PUBLISHED) {
      throw new ConflictException('Cannot delete published posts');
    }
    
    await this.postRepository.delete(id);
    
    this.logger.log(`Removed post: ${id}`);
  }

  async submitForReview(id: string): Promise<PostEntity> {
    this.logger.log(`Submitting post for review: ${id}`);
    
    const post = await this.findOne(id);
    
    if (post.status !== PostStatus.DRAFT) {
      throw new BadRequestException(`Post must be in draft status to submit for review. Current status: ${post.status}`);
    }
    
    return await this.postRepository.update(id, { status: PostStatus.NEEDS_REVIEW });
  }

  async approvePost(id: string): Promise<PostEntity> {
    this.logger.log(`Approving post: ${id}`);
    
    const post = await this.findOne(id);
    
    if (post.status !== PostStatus.NEEDS_REVIEW) {
      throw new BadRequestException(`Post must be in review status to approve. Current status: ${post.status}`);
    }
    
    return await this.postRepository.update(id, { status: PostStatus.APPROVED });
  }

  async rejectPost(id: string, reason?: string): Promise<PostEntity> {
    this.logger.log(`Rejecting post: ${id}`);
    
    const post = await this.findOne(id);
    
    if (post.status !== PostStatus.NEEDS_REVIEW) {
      throw new BadRequestException(`Post must be in review status to reject. Current status: ${post.status}`);
    }
    
    return await this.postRepository.update(id, { 
      status: PostStatus.DRAFT
    });
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