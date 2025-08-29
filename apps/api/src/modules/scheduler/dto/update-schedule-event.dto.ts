import { IsString, IsIn, IsOptional, IsDateString, IsObject, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { Platform } from '@content-creation/types';

export class UpdateScheduleEventDto {
  @ApiPropertyOptional({
    description: 'New platform for the scheduled event',
    enum: Object.values(Platform),
    example: Platform.LINKEDIN
  })
  @IsOptional()
  @IsIn(Object.values(Platform))
  platform?: Platform;

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