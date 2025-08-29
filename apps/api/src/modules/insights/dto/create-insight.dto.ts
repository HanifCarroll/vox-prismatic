import { IsString, IsOptional, IsEnum, IsNumber, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { InsightCategory, PostType } from '@content-creation/types';

export class CreateInsightDto {
  @ApiProperty({ 
    description: 'ID of the transcript this insight is extracted from',
    example: 'transcript_abc123'
  })
  @IsString()
  @MinLength(1)
  cleanedTranscriptId: string;

  @ApiProperty({ 
    description: 'Title of the insight',
    example: 'How to build resilience in uncertain times',
    minLength: 1,
    maxLength: 200
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ 
    description: 'Summary of the insight',
    example: 'Key strategies for maintaining focus and motivation during challenging periods...',
    minLength: 1,
    maxLength: 1000
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  summary: string;

  @ApiProperty({ 
    description: 'Direct quote from the transcript',
    example: 'The most successful people I know have developed systems...',
    minLength: 1,
    maxLength: 2000
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  verbatimQuote: string;

  @ApiProperty({ 
    description: 'Category of the insight',
    enum: InsightCategory,
    example: InsightCategory.MARKETING
  })
  @IsEnum(InsightCategory)
  category: InsightCategory;

  @ApiProperty({ 
    description: 'Type of post this insight would work best as',
    enum: PostType,
    example: PostType.FRAMEWORK
  })
  @IsEnum(PostType)
  postType: PostType;

  @ApiProperty({ 
    description: 'Urgency score (1-10, higher = more time-sensitive)',
    example: 7,
    minimum: 1,
    maximum: 10
  })
  @IsInt()
  @Min(1)
  @Max(10)
  @Transform(({ value }) => parseInt(value))
  urgencyScore: number;

  @ApiProperty({ 
    description: 'Relatability score (1-10, higher = more relatable to audience)',
    example: 8,
    minimum: 1,
    maximum: 10
  })
  @IsInt()
  @Min(1)
  @Max(10)
  @Transform(({ value }) => parseInt(value))
  relatabilityScore: number;

  @ApiProperty({ 
    description: 'Specificity score (1-10, higher = more specific/actionable)',
    example: 6,
    minimum: 1,
    maximum: 10
  })
  @IsInt()
  @Min(1)
  @Max(10)
  @Transform(({ value }) => parseInt(value))
  specificityScore: number;

  @ApiProperty({ 
    description: 'Authority score (1-10, higher = demonstrates more expertise)',
    example: 9,
    minimum: 1,
    maximum: 10
  })
  @IsInt()
  @Min(1)
  @Max(10)
  @Transform(({ value }) => parseInt(value))
  authorityScore: number;

  @ApiPropertyOptional({ 
    description: 'Processing duration in milliseconds',
    example: 1250
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  processingDurationMs?: number;

  @ApiPropertyOptional({ 
    description: 'Estimated tokens used for processing',
    example: 850
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  estimatedTokens?: number;

  @ApiPropertyOptional({ 
    description: 'Estimated cost for processing',
    example: 0.0034
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  estimatedCost?: number;
}