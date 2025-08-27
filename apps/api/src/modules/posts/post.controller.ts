import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { PostService } from './post.service';
import { PostEntity } from './entities/post.entity';
import {
  CreatePostDto,
  UpdatePostDto,
  PostFilterDto,
  SchedulePostDto,
  UnschedulePostDto,
} from './dto';

@ApiTags('Posts')
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new post',
    description: 'Create a new social media post from an insight',
  })
  @ApiResponse({
    status: 201,
    description: 'Post created successfully',
    type: PostEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiBody({ type: CreatePostDto })
  async create(@Body() createPostDto: CreatePostDto): Promise<PostEntity> {
    return await this.postService.create(createPostDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all posts with filtering',
    description: 'Retrieve posts with optional filtering by status, platform, insight, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Posts retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/PostEntity' },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' },
            hasMore: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by post status' })
  @ApiQuery({ name: 'platform', required: false, description: 'Filter by platform' })
  @ApiQuery({ name: 'postType', required: false, description: 'Filter by post type' })
  @ApiQuery({ name: 'insightId', required: false, description: 'Filter by insight ID' })
  @ApiQuery({ name: 'hashtag', required: false, description: 'Filter by hashtag' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in title and content' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', description: 'Number of posts to return' })
  @ApiQuery({ name: 'offset', required: false, type: 'number', description: 'Number of posts to skip' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Field to sort by' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiQuery({ name: 'includeSchedule', required: false, type: 'boolean', description: 'Include scheduling information' })
  @ApiQuery({ name: 'createdAfter', required: false, description: 'Filter posts created after this date' })
  @ApiQuery({ name: 'createdBefore', required: false, description: 'Filter posts created before this date' })
  async findAll(@Query() filters: PostFilterDto) {
    const result = await this.postService.findAllWithMetadata(filters);

    return {
      success: true,
      data: result.data,
      meta: result.metadata.pagination
    };
  }

  @Get('status-counts')
  @ApiOperation({
    summary: 'Get post counts by status',
    description: 'Retrieve the count of posts grouped by their status',
  })
  @ApiResponse({
    status: 200,
    description: 'Status counts retrieved successfully',
    schema: {
      type: 'object',
      additionalProperties: { type: 'number' },
      example: {
        draft: 15,
        review: 3,
        approved: 8,
        scheduled: 2,
        published: 12,
      },
    },
  })
  async getStatusCounts(): Promise<Record<string, number>> {
    return await this.postService.getStatusCounts();
  }

  @Get('platform-counts')
  @ApiOperation({
    summary: 'Get post counts by platform',
    description: 'Retrieve the count of posts grouped by their target platform',
  })
  @ApiResponse({
    status: 200,
    description: 'Platform counts retrieved successfully',
    schema: {
      type: 'object',
      additionalProperties: { type: 'number' },
      example: {
        linkedin: 25,
        x: 18,
        facebook: 5,
      },
    },
  })
  async getPlatformCounts(): Promise<Record<string, number>> {
    return await this.postService.getPlatformCounts();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific post',
    description: 'Retrieve a single post by its ID with optional scheduling information',
  })
  @ApiResponse({
    status: 200,
    description: 'Post retrieved successfully',
    type: PostEntity,
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiQuery({ 
    name: 'includeSchedule', 
    required: false, 
    type: 'boolean', 
    description: 'Include scheduling information' 
  })
  async findOne(
    @Param('id') id: string,
    @Query('includeSchedule') includeSchedule?: boolean,
  ): Promise<PostEntity> {
    return await this.postService.findOne(id, includeSchedule);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a post',
    description: 'Update an existing post\'s content, metadata, or other properties',
  })
  @ApiResponse({
    status: 200,
    description: 'Post updated successfully',
    type: PostEntity,
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiBody({ type: UpdatePostDto })
  async update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
  ): Promise<PostEntity> {
    return await this.postService.update(id, updatePostDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a post',
    description: 'Delete a post (only allowed if not published)',
  })
  @ApiResponse({
    status: 204,
    description: 'Post deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete published posts',
  })
  @ApiParam({ name: 'id', description: 'Post ID' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.postService.remove(id);
  }

  @Post(':id/submit')
  @ApiOperation({
    summary: 'Submit post for review',
    description: 'Change post status from draft to review for approval workflow',
  })
  @ApiResponse({
    status: 200,
    description: 'Post submitted for review successfully',
    type: PostEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Post must be in draft status to submit for review',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiParam({ name: 'id', description: 'Post ID' })
  async submitForReview(@Param('id') id: string): Promise<PostEntity> {
    return await this.postService.submitForReview(id);
  }

  @Post(':id/approve')
  @ApiOperation({
    summary: 'Approve a post',
    description: 'Change post status from review to approved, making it ready for scheduling',
  })
  @ApiResponse({
    status: 200,
    description: 'Post approved successfully',
    type: PostEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Post must be in review status to approve',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiParam({ name: 'id', description: 'Post ID' })
  async approvePost(@Param('id') id: string): Promise<PostEntity> {
    return await this.postService.approvePost(id);
  }

  @Post(':id/reject')
  @ApiOperation({
    summary: 'Reject a post',
    description: 'Change post status from review back to draft with optional rejection reason',
  })
  @ApiResponse({
    status: 200,
    description: 'Post rejected successfully',
    type: PostEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Post must be in review status to reject',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Optional reason for rejection',
          example: 'Content needs more specific examples',
        },
      },
    },
    required: false,
  })
  async rejectPost(
    @Param('id') id: string,
    @Body() body: { reason?: string } = {},
  ): Promise<PostEntity> {
    return await this.postService.rejectPost(id, body.reason);
  }
}