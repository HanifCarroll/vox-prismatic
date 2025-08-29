import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { InsightCategory, PostType, InsightStatus } from '@content-creation/types';

export class InsightFilterDto {
  @ApiPropertyOptional({ 
    description: 'Filter by insight status',
    enum: InsightStatus,
    example: InsightStatus.APPROVED
  })
  @IsOptional()
  @IsEnum(InsightStatus)
  status?: InsightStatus;

  @ApiPropertyOptional({ 
    description: 'Filter by category',
    enum: InsightCategory,
    example: InsightCategory.MARKETING
  })
  @IsOptional()
  @IsEnum(InsightCategory)
  category?: InsightCategory;

  @ApiPropertyOptional({ 
    description: 'Filter by post type',
    enum: PostType,
    example: PostType.FRAMEWORK
  })
  @IsOptional()
  @IsEnum(PostType)
  postType?: PostType;

  @ApiPropertyOptional({ 
    description: 'Filter by transcript ID',
    example: 'transcript_abc123'
  })
  @IsOptional()
  @IsString()
  transcriptId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by minimum total score',
    example: 25,
    minimum: 4,
    maximum: 40
  })
  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(40)
  @Type(() => Number)
  minTotalScore?: number;

  @ApiPropertyOptional({ 
    description: 'Filter by maximum total score',
    example: 35,
    minimum: 4,
    maximum: 40
  })
  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(40)
  @Type(() => Number)
  maxTotalScore?: number;

  @ApiPropertyOptional({ 
    description: 'Search in title and summary',
    example: 'productivity tips'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Sort by field',
    enum: ['createdAt', 'updatedAt', 'totalScore', 'title'],
    example: 'totalScore'
  })
  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'totalScore', 'title'])
  sortBy?: 'createdAt' | 'updatedAt' | 'totalScore' | 'title';

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