import { IsString, IsOptional, IsEnum, IsNumber, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { InsightStatus, InsightCategory, PostType } from '@content-creation/types';

export class UpdateInsightDto {
  @ApiPropertyOptional({ 
    description: 'Updated title of the insight',
    example: 'How to build resilience in uncertain times',
    minLength: 1,
    maxLength: 200
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ 
    description: 'Updated summary of the insight',
    example: 'Key strategies for maintaining focus and motivation during challenging periods...',
    minLength: 1,
    maxLength: 1000
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  summary?: string;

  @ApiPropertyOptional({ 
    description: 'Updated direct quote from the transcript',
    example: 'The most successful people I know have developed systems...',
    minLength: 1,
    maxLength: 2000
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  verbatimQuote?: string;

  @ApiPropertyOptional({ 
    description: 'Updated category of the insight',
    enum: InsightCategory,
    example: InsightCategory.MARKETING
  })
  @IsOptional()
  @IsEnum(InsightCategory)
  category?: InsightCategory;

  @ApiPropertyOptional({ 
    description: 'Updated post type',
    enum: PostType,
    example: PostType.FRAMEWORK
  })
  @IsOptional()
  @IsEnum(PostType)
  postType?: PostType;

  // Status field removed - use InsightStateService for state transitions
  // Available transitions: submitForReview(), approveInsight(), rejectInsight(), 
  // archiveInsight(), editInsight(), restoreInsight(), markFailed()

  @ApiPropertyOptional({ 
    description: 'Updated urgency score (1-10)',
    example: 7,
    minimum: 1,
    maximum: 10
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  urgencyScore?: number;

  @ApiPropertyOptional({ 
    description: 'Updated relatability score (1-10)',
    example: 8,
    minimum: 1,
    maximum: 10
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  relatabilityScore?: number;

  @ApiPropertyOptional({ 
    description: 'Updated specificity score (1-10)',
    example: 6,
    minimum: 1,
    maximum: 10
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  specificityScore?: number;

  @ApiPropertyOptional({ 
    description: 'Updated authority score (1-10)',
    example: 9,
    minimum: 1,
    maximum: 10
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  authorityScore?: number;

  @ApiPropertyOptional({
    description: 'User who reviewed/rejected the insight'
  })
  @IsOptional()
  @IsString()
  reviewedBy?: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when insight was reviewed'
  })
  @IsOptional()
  reviewedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Reason for insight rejection'
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string | null;

  @ApiPropertyOptional({
    description: 'User who approved the insight'
  })
  @IsOptional()
  @IsString()
  approvedBy?: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when insight was approved'
  })
  @IsOptional()
  approvedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'User who archived the insight'
  })
  @IsOptional()
  @IsString()
  archivedBy?: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when insight was archived'
  })
  @IsOptional()
  archivedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Reason for archiving the insight'
  })
  @IsOptional()
  @IsString()
  archivedReason?: string | null;

  @ApiPropertyOptional({
    description: 'Reason why insight processing failed'
  })
  @IsOptional()
  @IsString()
  failureReason?: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when insight processing failed'
  })
  @IsOptional()
  failedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Number of retry attempts for failed insight'
  })
  @IsOptional()
  @IsNumber()
  retryCount?: number;

  @ApiPropertyOptional({
    description: 'Timestamp when insight was last updated'
  })
  @IsOptional()
  updatedAt?: Date;
}