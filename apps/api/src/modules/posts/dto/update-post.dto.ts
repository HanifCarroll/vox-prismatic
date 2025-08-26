import { IsString, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Platform } from './create-post.dto';

export enum PostStatus {
  DRAFT = 'draft',
  NEEDS_REVIEW = 'needs_review',
  APPROVED = 'approved', 
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  FAILED = 'failed',
  ARCHIVED = 'archived'
}

export class UpdatePostDto {
  @ApiPropertyOptional({
    description: 'Updated title of the post',
    example: 'How to build resilience in uncertain times (Updated)',
    minLength: 1,
    maxLength: 200
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated content of the post',
    example: 'Building resilience requires developing systems...',
    minLength: 1,
    maxLength: 10000
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content?: string;

  @ApiPropertyOptional({
    description: 'Updated platform',
    enum: Platform,
    example: Platform.LINKEDIN
  })
  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  @ApiPropertyOptional({
    description: 'Updated post status',
    enum: PostStatus,
    example: PostStatus.APPROVED
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}