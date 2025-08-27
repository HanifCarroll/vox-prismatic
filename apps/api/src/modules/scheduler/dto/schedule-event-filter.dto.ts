import { IsOptional, IsEnum, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { SchedulePlatform } from './create-schedule-event.dto';

export enum ScheduleEventStatus {
  PENDING = 'pending',
  PUBLISHED = 'published',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export class ScheduleEventFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by platforms (comma-separated)',
    example: 'linkedin,x'
  })
  @IsOptional()
  @IsString()
  platforms?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ScheduleEventStatus,
    example: ScheduleEventStatus.PENDING
  })
  @IsOptional()
  @IsEnum(ScheduleEventStatus)
  status?: ScheduleEventStatus;

  @ApiPropertyOptional({
    description: 'Start date for filtering (YYYY-MM-DD format)',
    example: '2025-08-27'
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Accept both date-only (YYYY-MM-DD) and ISO datetime formats
    if (typeof value === 'string' && value.length === 10 && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return value; // Already in YYYY-MM-DD format
    }
    if (typeof value === 'string' && value.includes('T')) {
      return value.split('T')[0]; // Extract date part from ISO datetime
    }
    return value;
  })
  @IsDateString({ strict: false })
  start?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering (YYYY-MM-DD format)',
    example: '2025-08-31'
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Accept both date-only (YYYY-MM-DD) and ISO datetime formats
    if (typeof value === 'string' && value.length === 10 && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return value; // Already in YYYY-MM-DD format
    }
    if (typeof value === 'string' && value.includes('T')) {
      return value.split('T')[0]; // Extract date part from ISO datetime
    }
    return value;
  })
  @IsDateString({ strict: false })
  end?: string;

  @ApiPropertyOptional({
    description: 'Post ID to filter by',
    example: 'post_abc123'
  })
  @IsOptional()
  @IsString()
  postId?: string;
}