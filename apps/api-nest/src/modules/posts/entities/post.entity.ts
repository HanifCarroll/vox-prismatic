import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Platform } from '../dto/create-post.dto';
import { PostStatus } from '../dto/update-post.dto';

export class PostEntity {
  @ApiProperty({
    description: 'Unique identifier for the post',
    example: 'post_abc123'
  })
  id: string;

  @ApiProperty({
    description: 'ID of the insight this post is generated from',
    example: 'insight_abc123'
  })
  insightId: string;

  @ApiProperty({
    description: 'Title of the post',
    example: 'How to build resilience in uncertain times'
  })
  title: string;

  @ApiProperty({
    description: 'Platform this post is intended for',
    enum: Platform,
    example: Platform.LINKEDIN
  })
  platform: Platform;

  @ApiProperty({
    description: 'Content of the post',
    example: 'Building resilience requires developing systems that help you maintain focus during challenging periods...'
  })
  content: string;

  @ApiProperty({
    description: 'Current status of the post',
    enum: PostStatus,
    example: PostStatus.APPROVED
  })
  status: PostStatus;

  @ApiPropertyOptional({
    description: 'Character count of the content',
    example: 280
  })
  characterCount?: number;

  @ApiProperty({
    description: 'When the post was created',
    example: '2025-08-26T10:30:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the post was last updated',
    example: '2025-08-26T15:45:00.000Z'
  })
  updatedAt: Date;

  // Related data when populated
  @ApiPropertyOptional({
    description: 'Associated insight information'
  })
  insight?: {
    id: string;
    title: string;
    category: string;
    status: string;
    totalScore: number;
  };

  @ApiPropertyOptional({
    description: 'Scheduling information if post is scheduled'
  })
  scheduledPost?: {
    id: string;
    scheduledTime: Date;
    platform: Platform;
    status: 'pending' | 'published' | 'failed' | 'cancelled';
    retryCount: number;
    lastAttempt?: Date;
    errorMessage?: string;
    externalPostId?: string;
  };
}