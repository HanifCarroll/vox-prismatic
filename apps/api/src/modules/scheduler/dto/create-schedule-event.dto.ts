import { IsString, IsEnum, IsOptional, IsDateString, IsObject, MinLength, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { Platform } from '@content-creation/types';

export class CreateScheduleEventDto {
  @ApiProperty({
    description: 'Platform to schedule the event on',
    enum: Object.values(Platform),
    example: Platform.LINKEDIN
  })
  @IsIn(Object.values(Platform))
  platform: Platform;

  @ApiProperty({
    description: 'ISO date string when the event should be published (must be in the future)',
    example: '2025-08-27T14:30:00.000Z'
  })
  @IsDateString()
  @Transform(({ value }) => {
    const date = new Date(value);
    if (date <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }
    return value;
  })
  scheduledTime: string;

  @ApiPropertyOptional({
    description: 'Content to be posted (required if postId is not provided)',
    example: 'Building resilience requires developing systems that help you maintain focus during challenging periods... #productivity #leadership'
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content?: string;

  @ApiPropertyOptional({
    description: 'Existing post ID to schedule (if scheduling an existing post)',
    example: 'post_abc123'
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  postId?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the scheduled event',
    example: { priority: 'high', campaign: 'productivity-series' }
  })
  @IsOptional()
  @IsObject()
  @Type(() => Object)
  metadata?: Record<string, any>;
}