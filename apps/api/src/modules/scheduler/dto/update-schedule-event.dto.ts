import { IsString, IsEnum, IsOptional, IsDateString, IsObject, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { SchedulePlatform } from './create-schedule-event.dto';

export class UpdateScheduleEventDto {
  @ApiPropertyOptional({
    description: 'New platform for the scheduled event',
    enum: SchedulePlatform,
    example: SchedulePlatform.LINKEDIN
  })
  @IsOptional()
  @IsEnum(SchedulePlatform)
  platform?: SchedulePlatform;

  @ApiPropertyOptional({
    description: 'New scheduled time (must be in the future)',
    example: '2025-08-27T16:30:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => {
    if (value) {
      const date = new Date(value);
      if (date <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }
    }
    return value;
  })
  scheduledTime?: string;

  @ApiPropertyOptional({
    description: 'Updated content for the event',
    example: 'Updated content for the scheduled post...'
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content?: string;

  @ApiPropertyOptional({
    description: 'Updated metadata for the scheduled event',
    example: { priority: 'medium', campaign: 'updated-campaign' }
  })
  @IsOptional()
  @IsObject()
  @Type(() => Object)
  metadata?: Record<string, any>;
}