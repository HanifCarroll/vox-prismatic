import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { Platform, PostStatus } from '@content-creation/types';

export class PostFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by post status',
    enum: PostStatus,
    example: PostStatus.APPROVED
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional({
    description: 'Filter by platform',
    enum: Platform,
    example: Platform.LINKEDIN
  })
  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  // Note: postType removed from simplified schema

  @ApiPropertyOptional({
    description: 'Filter by insight ID',
    example: 'insight_abc123'
  })
  @IsOptional()
  @IsString()
  insightId?: string;

  @ApiPropertyOptional({
    description: 'Search in title and content',
    example: 'productivity tips'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by hashtag',
    example: 'productivity'
  })
  @IsOptional()
  @IsString()
  hashtag?: string;

  @ApiPropertyOptional({
    description: 'Filter posts created after this date',
    example: '2025-08-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter posts created before this date',
    example: '2025-09-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @ApiPropertyOptional({
    description: 'Include scheduling information',
    example: true
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeSchedule?: boolean;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['createdAt', 'updatedAt', 'title', 'characterCount', 'platform', 'scheduledFor', 'status'],
    example: 'createdAt'
  })
  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'title', 'characterCount', 'platform', 'scheduledFor', 'status'])
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'characterCount' | 'platform' | 'scheduledFor' | 'status';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    example: 'desc'
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Number of results to return',
    example: 50,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of results to skip',
    example: 0,
    minimum: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}