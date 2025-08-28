import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsNumber, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { SourceType } from './create-transcript.dto';
import { TranscriptStatus } from './update-transcript.dto';

export class TranscriptFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: [...Object.values(TranscriptStatus), 'all'],
    example: 'cleaned'
  })
  @IsEnum([...Object.values(TranscriptStatus), 'all'])
  @IsOptional()
  status?: TranscriptStatus | 'all';

  @ApiPropertyOptional({
    description: 'Filter by source type',
    enum: SourceType
  })
  @IsEnum(SourceType)
  @IsOptional()
  sourceType?: SourceType;

  @ApiPropertyOptional({
    description: 'Number of items to return',
    minimum: 1,
    maximum: 100,
    default: 50
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Number of items to skip',
    minimum: 0,
    default: 0
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['createdAt', 'updatedAt', 'title', 'duration'],
    default: 'createdAt'
  })
  @IsEnum(['createdAt', 'updatedAt', 'title', 'duration'])
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc'
  })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Search in title and content',
    example: 'productivity meeting'
  })
  @IsString()
  @IsOptional()
  search?: string;
}