import { IsString, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Platform } from './create-post.dto';

export enum PostStatus {
  DRAFT = 'draft',
  NEEDS_REVIEW = 'needs_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
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

  // Status field removed - use PostStateService for state transitions
  // Available transitions: submitForReview(), approve(), reject(), 
  // archive(), edit(), schedule(), unschedule()

  @ApiPropertyOptional({
    description: 'Error message if processing failed'
  })
  @IsOptional()
  @IsString()
  errorMessage?: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when post was rejected'
  })
  @IsOptional()
  rejectedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'User who rejected the post'
  })
  @IsOptional()
  @IsString()
  rejectedBy?: string | null;

  @ApiPropertyOptional({
    description: 'Reason for post rejection'
  })
  @IsOptional()
  @IsString()
  rejectedReason?: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when post was approved'
  })
  @IsOptional()
  approvedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'User who approved the post'
  })
  @IsOptional()
  @IsString()
  approvedBy?: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when post was archived'
  })
  @IsOptional()
  archivedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Reason for archiving the post'
  })
  @IsOptional()
  @IsString()
  archivedReason?: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when post processing failed'
  })
  @IsOptional()
  failedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Timestamp when post was last updated'
  })
  @IsOptional()
  updatedAt?: Date;
}