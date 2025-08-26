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
    description: 'Filter by platform',
    enum: SchedulePlatform,
    example: SchedulePlatform.LINKEDIN
  })
  @IsOptional()
  @IsEnum(SchedulePlatform)
  platform?: SchedulePlatform;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ScheduleEventStatus,
    example: ScheduleEventStatus.PENDING
  })
  @IsOptional()
  @IsEnum(ScheduleEventStatus)
  status?: ScheduleEventStatus;

  @ApiPropertyOptional({
    description: 'Start date for date range filter (ISO string)',
    example: '2025-08-26T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for date range filter (ISO string)',
    example: '2025-09-26T23:59:59.000Z'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Post ID to filter by',
    example: 'post_abc123'
  })
  @IsOptional()
  @IsString()
  postId?: string;
}