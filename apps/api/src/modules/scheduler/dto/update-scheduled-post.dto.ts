import { IsString, IsOptional, IsInt, IsDateString, Min, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * DTO for updating scheduled post properties
 * Note: Status field is deliberately excluded - use ScheduledPostStateService for state transitions
 * Available transitions: queueForPublishing(), startPublishing(), markPublished(), 
 * markFailed(), retry(), cancel()
 */
export class UpdateScheduledPostDto {
  @ApiPropertyOptional({ 
    description: 'Updated platform for the scheduled post',
    example: 'linkedin',
    enum: ['linkedin', 'x']
  })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ 
    description: 'Updated content for the scheduled post',
    example: 'Updated post content for social media...',
    maxLength: 2000
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @ApiPropertyOptional({ 
    description: 'Updated scheduled publication time',
    example: '2024-01-15T10:30:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  @IsOptional()
  @IsDateString()
  scheduledTime?: Date;

  @ApiPropertyOptional({
    description: 'Retry count for failed publications',
    example: 2,
    minimum: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  retryCount?: number;

  @ApiPropertyOptional({
    description: 'Timestamp of last publication attempt'
  })
  @IsOptional()
  @IsDateString()
  lastAttempt?: Date | null;

  @ApiPropertyOptional({
    description: 'Error message from failed publication attempt'
  })
  @IsOptional()
  @IsString()
  errorMessage?: string | null;

  @ApiPropertyOptional({
    description: 'External post ID from successful publication'
  })
  @IsOptional()
  @IsString()
  externalPostId?: string | null;

  @ApiPropertyOptional({
    description: 'Queue job ID for tracking publication process'
  })
  @IsOptional()
  @IsString()
  queueJobId?: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when scheduled post was last updated'
  })
  @IsOptional()
  updatedAt?: Date;
}