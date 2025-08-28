import { IsString, IsOptional, IsEnum, IsNumber, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { InsightCategory, PostType } from './create-insight.dto';

export enum InsightStatus {
  DRAFT = 'draft',
  NEEDS_REVIEW = 'needs_review', 
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
  FAILED = 'failed'
}

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
    example: InsightCategory.BUSINESS_TIP
  })
  @IsOptional()
  @IsEnum(InsightCategory)
  category?: InsightCategory;

  @ApiPropertyOptional({ 
    description: 'Updated post type',
    enum: PostType,
    example: PostType.TIP
  })
  @IsOptional()
  @IsEnum(PostType)
  postType?: PostType;

  @ApiPropertyOptional({ 
    description: 'Updated insight status',
    enum: InsightStatus,
    example: InsightStatus.APPROVED
  })
  @IsOptional()
  @IsEnum(InsightStatus)
  status?: InsightStatus;

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
}