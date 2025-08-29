import { IsString, IsEnum, IsOptional, IsDateString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Platform } from '@content-creation/types';

export class SchedulePostDto {
  @ApiProperty({
    description: 'Platform to schedule the post on',
    enum: Platform,
    example: Platform.LINKEDIN
  })
  @IsEnum(Platform)
  platform: Platform;

  @ApiProperty({
    description: 'ISO date string when the post should be published',
    example: '2025-08-27T14:30:00.000Z'
  })
  @IsDateString()
  scheduledTime: string;

  @ApiPropertyOptional({
    description: 'Optional content override (if different from post content)',
    example: 'Building resilience requires developing systems... #productivity #leadership'
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for scheduling',
    example: { priority: 'high', campaign: 'productivity-series' }
  })
  @IsOptional()
  @IsObject()
  @Type(() => Object)
  metadata?: Record<string, any>;
}

export class UnschedulePostDto {
  @ApiPropertyOptional({
    description: 'Reason for unscheduling',
    example: 'Content needs revision'
  })
  @IsOptional()
  @IsString()
  reason?: string;
}